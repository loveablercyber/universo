import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query, db } from "@/lib/db.server";
import { sendStoreShippingNotification } from "@/lib/notifications.server";

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().optional(),
  title: z.string().min(1, "Título da variação é obrigatório"),
  color: z.string().optional(),
  colorHex: z.string().optional(),
  lengthCm: z.number().int().optional(),
  weightG: z.number().int().optional(),
  texture: z.string().optional(),
  priceOverride: z.number().min(0).nullable().optional(),
  promotionalPriceOverride: z.number().min(0).nullable().optional(),
  stockQuantity: z.number().int().min(0),
  imageUrl: z.string().optional(),
  status: z.enum(["active", "out_of_stock", "inactive"]).default("active"),
});

const productSchema = z.object({
  action: z.literal("save-product"),
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(100),
  name: z.string().min(2).max(160),
  info: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  price: z.number().min(0),
  promotionalPrice: z.number().min(0).nullable().optional(),
  stockQuantity: z.number().int().min(0),
  categoryId: z.string().nullable().optional(),
  image: z.string().min(1),
  images: z.array(z.string()).optional(),
  badgeLabel: z.string().max(50).nullable().optional(),
  badgeTone: z.string().max(30).nullable().optional(),
  status: z.enum(["active", "draft", "out_of_stock", "archived"]),
  variants: z.array(variantSchema).optional(),
});

const deleteProductSchema = z.object({
  action: z.literal("delete-product"),
  id: z.string().uuid(),
});

const categorySchema = z.object({
  action: z.literal("save-category"),
  id: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

const updateOrderStatusSchema = z.object({
  action: z.literal("update-order-status"),
  orderId: z.string().uuid(),
  status: z.enum([
    "pending",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]),
  trackingCode: z.string().max(100).nullable().optional(),
});

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  await query(
    `INSERT INTO universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
     VALUES($1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, entityType, entityId, JSON.stringify(metadata)],
  );
}

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error("[Admin Store API]", error);
  const message = error instanceof Error ? error.message : "Não foi possível concluir a operação.";
  return Response.json({ ok: false, message }, { status: 500 });
}

export const Route = createFileRoute("/api/admin/store")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "store.read");
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "products";

          if (action === "categories") {
            const { rows } = await query(
              `SELECT id, coalesce(slug, id) as slug, name, description,
                      image_url as image, sort_order as "sortOrder",
                      (SELECT count(*)::int FROM universe.store_products WHERE category_id = c.id) as "productCount"
                 FROM universe.store_categories c
                ORDER BY sort_order ASC, name ASC`,
            );
            return Response.json({ ok: true, categories: rows });
          }

          if (action === "products") {
            const { rows } = await query(
              `SELECT p.id, p.slug, p.name, p.info, p.description,
                      p.price::float as price, p.promotional_price::float as "promotionalPrice",
                      p.stock_quantity as "stockQuantity", p.category_id as "categoryId",
                      p.image_url as image, p.images, p.badge_label as "badgeLabel", p.badge_tone as "badgeTone",
                      p.rating::float as rating, p.reviews_count as reviews, p.sold_count as sold,
                      p.status, p.created_at as "createdAt", c.name as "categoryName",
                      coalesce(
                        json_agg(
                          json_build_object(
                            'id', v.id, 'sku', v.sku, 'title', v.title,
                            'color', v.color, 'colorHex', v.color_hex,
                            'lengthCm', v.length_cm, 'weightG', v.weight_g,
                            'texture', v.texture,
                            'priceOverride', v.price_override::float,
                            'promotionalPriceOverride', v.promotional_price_override::float,
                            'stockQuantity', v.stock_quantity,
                            'imageUrl', v.image_url, 'status', v.status
                          )
                        ) FILTER (WHERE v.id IS NOT NULL),
                        '[]'::json
                      ) as variants
                 FROM universe.store_products p
                 LEFT JOIN universe.store_categories c ON c.id = p.category_id
                 LEFT JOIN universe.store_product_variants v ON v.product_id = p.id
                GROUP BY p.id, p.slug, p.name, p.info, p.description, p.price,
                         p.promotional_price, p.stock_quantity, p.category_id,
                         p.image_url, p.images, p.badge_label, p.badge_tone,
                         p.rating, p.reviews_count, p.sold_count, p.status, p.created_at, c.name
                ORDER BY p.created_at DESC`,
            );
            return Response.json({ ok: true, products: rows });
          }

          if (action === "orders") {
            const statusFilter = url.searchParams.get("status");
            let sql = `SELECT o.id, o.order_number as "orderNumber", o.customer_name as "customerName",
                              o.customer_email as "customerEmail", o.customer_phone as "customerPhone",
                              o.customer_document as "customerDocument", o.shipping_address as "shippingAddress",
                              o.shipping_cost::float as "shippingCost", o.subtotal::float as subtotal,
                              o.discount_amount::float as "discountAmount",
                              o.total_amount::float as "totalAmount", o.status, o.tracking_code as "trackingCode",
                              o.paid_at as "paidAt", o.created_at as "createdAt",
                              coalesce(
                                json_agg(
                                  json_build_object(
                                    'productName', i.product_name,
                                    'variantName', i.variant_name,
                                    'unitPrice', i.unit_price::float,
                                    'quantity', i.quantity,
                                    'totalPrice', i.total_price::float
                                  )
                                ) FILTER (WHERE i.id IS NOT NULL),
                                '[]'::json
                              ) as items
                         FROM universe.store_orders o
                         LEFT JOIN universe.store_order_items i ON i.order_id = o.id`;
            const params: unknown[] = [];

            if (statusFilter) {
              params.push(statusFilter);
              sql += ` WHERE o.status = $1`;
            }

            sql += ` GROUP BY o.id, o.order_number, o.customer_name, o.customer_email,
                              o.customer_phone, o.customer_document, o.shipping_address,
                              o.shipping_cost, o.subtotal, o.discount_amount, o.total_amount,
                              o.status, o.tracking_code, o.paid_at, o.created_at
                     ORDER BY o.created_at DESC LIMIT 200`;

            const { rows } = await query(sql, params);
            return Response.json({ ok: true, orders: rows });
          }

          if (action === "customers") {
            const { rows } = await query(
              `SELECT c.id, c.full_name as "fullName", c.email, c.phone, c.document,
                      c.default_address as "defaultAddress", c.notes, c.status,
                      c.created_at as "createdAt", c.updated_at as "updatedAt",
                      count(o.id)::int as "ordersCount",
                      coalesce(sum(o.total_amount) filter (where o.status in ('paid','processing','shipped','delivered')), 0)::float as "totalSpent",
                      max(o.created_at) as "lastOrderAt",
                      coalesce(json_agg(json_build_object(
                        'id', o.id, 'orderNumber', o.order_number, 'totalAmount', o.total_amount::float,
                        'status', o.status, 'trackingCode', o.tracking_code, 'createdAt', o.created_at
                      ) order by o.created_at desc) filter (where o.id is not null), '[]'::json) as orders
                 FROM universe.store_customers c
                 LEFT JOIN universe.store_orders o on lower(o.customer_email)=lower(c.email)
                GROUP BY c.id
                ORDER BY c.created_at DESC
                LIMIT 200`,
            );
            return Response.json({ ok: true, customers: rows });
          }

          if (action === "stats") {
            const revenue = await query<{ sum: string | null }>(
              `SELECT sum(total_amount) FROM universe.store_orders WHERE status in ('paid', 'processing', 'shipped', 'delivered')`,
            );
            const count = await query<{ count: string }>(
              `SELECT count(*) FROM universe.store_orders WHERE status != 'cancelled'`,
            );
            const productsCount = await query<{ count: string }>(
              `SELECT count(*) FROM universe.store_products WHERE status = 'active'`,
            );
            const lowStock = await query<{ count: string }>(
              `SELECT count(*) FROM universe.store_products WHERE stock_quantity <= 5 AND status = 'active'`,
            );

            return Response.json({
              ok: true,
              stats: {
                totalRevenue: Number(revenue.rows[0].sum || 0),
                totalOrders: Number(count.rows[0].count),
                activeProducts: Number(productsCount.rows[0].count),
                lowStockCount: Number(lowStock.rows[0].count),
              },
            });
          }

          return Response.json({ ok: false, message: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },

      POST: async ({ request }) => {
        const pool = db;
        const client = await pool.connect();

        try {
          assertSameOrigin(request);
          const user = await requirePermission(request, "store.write");
          const body = await request.json();

          // 1. Salvar Categoria
          if (body.action === "save-category") {
            const parsed = categorySchema.safeParse(body);
            if (!parsed.success) {
              return Response.json(
                { ok: false, message: parsed.error.issues.map((i) => i.message).join("; ") },
                { status: 400 },
              );
            }
            const { id, name, description, image, sortOrder } = parsed.data;

            await client.query(
              `INSERT INTO universe.store_categories(id, slug, name, description, image_url, sort_order)
               VALUES ($1, $1, $2, $3, $4, $5)
               ON CONFLICT (id) DO UPDATE
                 SET name = excluded.name,
                     description = excluded.description,
                     image_url = coalesce(excluded.image_url, universe.store_categories.image_url),
                     sort_order = excluded.sort_order,
                     updated_at = now()`,
              [id, name, description || null, image || null, sortOrder],
            );

            await audit(user.id, "store.category.saved", "store_category", id, { name });
            return Response.json({ ok: true, message: "Categoria salva com sucesso!" });
          }

          // 2. Salvar Produto (com galeria de imagens e variações)
          if (body.action === "save-product") {
            const parsed = productSchema.safeParse(body);
            if (!parsed.success) {
              return Response.json(
                { ok: false, message: parsed.error.issues.map((i) => i.message).join("; ") },
                { status: 400 },
              );
            }

            const {
              id,
              slug,
              name,
              info,
              description,
              price,
              promotionalPrice,
              stockQuantity,
              categoryId,
              image,
              images,
              badgeLabel,
              badgeTone,
              status,
              variants,
            } = parsed.data;

            await client.query("BEGIN");

            let productId = id;

            if (productId) {
              // Update produto existente
              await client.query(
                `UPDATE universe.store_products
                    SET slug = $1, name = $2, info = $3, description = $4, price = $5,
                        promotional_price = $6, stock_quantity = $7, category_id = $8,
                        image_url = $9, images = $10::jsonb, badge_label = $11, badge_tone = $12,
                        status = $13, updated_at = now()
                  WHERE id = $14`,
                [
                  slug,
                  name,
                  info ?? null,
                  description ?? null,
                  price,
                  promotionalPrice ?? null,
                  stockQuantity,
                  categoryId ?? null,
                  image,
                  JSON.stringify(images || []),
                  badgeLabel ?? null,
                  badgeTone ?? "gold",
                  status,
                  productId,
                ],
              );
            } else {
              // Insert novo produto
              const insertRes = await client.query<{ id: string }>(
                `INSERT INTO universe.store_products
                   (slug, name, info, description, price, promotional_price, stock_quantity,
                    category_id, image_url, images, badge_label, badge_tone, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)
                 RETURNING id`,
                [
                  slug,
                  name,
                  info ?? null,
                  description ?? null,
                  price,
                  promotionalPrice ?? null,
                  stockQuantity,
                  categoryId ?? null,
                  image,
                  JSON.stringify(images || []),
                  badgeLabel ?? null,
                  badgeTone ?? "gold",
                  status,
                ],
              );
              productId = insertRes.rows[0].id;
            }

            // Atualizar variações do produto se enviadas
            if (variants && Array.isArray(variants)) {
              for (const v of variants) {
                if (v.id) {
                  await client.query(
                    `UPDATE universe.store_product_variants
                        SET title = $1, color = $2, color_hex = $3, length_cm = $4, weight_g = $5,
                            texture = $6, price_override = $7, promotional_price_override = $8,
                            stock_quantity = $9, image_url = $10, status = $11, updated_at = now()
                      WHERE id = $12 AND product_id = $13`,
                    [
                      v.title,
                      v.color || null,
                      v.colorHex || null,
                      v.lengthCm || null,
                      v.weightG || null,
                      v.texture || null,
                      v.priceOverride || null,
                      v.promotionalPriceOverride || null,
                      v.stockQuantity,
                      v.imageUrl || null,
                      v.status,
                      v.id,
                      productId,
                    ],
                  );
                } else {
                  await client.query(
                    `INSERT INTO universe.store_product_variants
                       (product_id, sku, title, color, color_hex, length_cm, weight_g, texture,
                        price_override, promotional_price_override, stock_quantity, image_url, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [
                      productId,
                      v.sku || `${slug}-${Date.now()}`,
                      v.title,
                      v.color || null,
                      v.colorHex || null,
                      v.lengthCm || null,
                      v.weightG || null,
                      v.texture || null,
                      v.priceOverride || null,
                      v.promotionalPriceOverride || null,
                      v.stockQuantity,
                      v.imageUrl || null,
                      v.status,
                    ],
                  );
                }
              }
            }

            await audit(user.id, "store.product.saved", "store_product", productId!, {
              name,
              slug,
              price,
            });

            await client.query("COMMIT");
            return Response.json({ ok: true, message: "Produto salvo com sucesso!", productId });
          }

          // 3. Remover Produto. Itens de pedidos anteriores mantêm o nome e o
          // valor registrados; a FK apenas desvincula o produto excluído.
          if (body.action === "delete-product") {
            const parsed = deleteProductSchema.safeParse(body);
            if (!parsed.success) {
              return Response.json({ ok: false, message: "Produto inválido." }, { status: 400 });
            }

            await client.query("BEGIN");
            const deleted = await client.query<{ id: string; name: string; slug: string }>(
              `DELETE FROM universe.store_products
                WHERE id = $1
                RETURNING id, name, slug`,
              [parsed.data.id],
            );

            if (!deleted.rows[0]) {
              await client.query("ROLLBACK");
              return Response.json(
                { ok: false, message: "Produto não encontrado." },
                { status: 404 },
              );
            }

            await audit(user.id, "store.product.deleted", "store_product", parsed.data.id, {
              name: deleted.rows[0].name,
              slug: deleted.rows[0].slug,
            });
            await client.query("COMMIT");

            return Response.json({ ok: true, message: "Produto removido com sucesso!" });
          }

          // 4. Atualizar Status de Pedido e Rastreio
          if (body.action === "update-order-status") {
            const parsed = updateOrderStatusSchema.safeParse(body);
            if (!parsed.success) {
              return Response.json(
                { ok: false, message: parsed.error.issues.map((i) => i.message).join("; ") },
                { status: 400 },
              );
            }

            const { orderId, status, trackingCode } = parsed.data;

            const orderRes = await client.query<{
              id: string;
              order_number: string;
              customer_name: string;
              customer_email: string;
              tracking_code: string | null;
            }>(
              `UPDATE universe.store_orders
                  SET status = $1,
                      tracking_code = coalesce($2, tracking_code),
                      paid_at = CASE WHEN $1 = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END,
                      updated_at = now()
                WHERE id = $3
                RETURNING id, order_number, customer_name, customer_email, tracking_code`,
              [status, trackingCode ?? null, orderId],
            );

            const order = orderRes.rows[0];

            if (status === "shipped" && trackingCode) {
              void sendStoreShippingNotification(
                order.order_number,
                order.customer_name,
                order.customer_email,
                trackingCode,
              );
            }

            await audit(user.id, "store.order.status_updated", "store_order", orderId, {
              status,
              trackingCode,
              orderNumber: order.order_number,
            });

            return Response.json({ ok: true, message: "Status do pedido atualizado com sucesso!" });
          }

          return Response.json({ ok: false, message: "Ação desconhecida." }, { status: 400 });
        } catch (error) {
          await client.query("ROLLBACK");
          return errorResponse(error);
        } finally {
          client.release();
        }
      },
    },
  },
});
