import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query } from "@/lib/db.server";

const productSchema = z.object({
  action: z.literal("save-product"),
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(100),
  name: z.string().min(2).max(160),
  info: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().min(0),
  promotionalPrice: z.number().min(0).nullable().optional(),
  stockQuantity: z.number().int().min(0),
  categoryId: z.string().nullable().optional(),
  image: z.string().min(1),
  badgeLabel: z.string().max(50).nullable().optional(),
  badgeTone: z.string().max(30).nullable().optional(),
  status: z.enum(["active", "draft", "out_of_stock", "archived"]),
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
  return Response.json(
    { ok: false, message: "Não foi possível concluir a operação." },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/admin/store")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "store.read");
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "products";

          if (action === "products") {
            const { rows } = await query(
              `SELECT p.id, p.slug, p.name, p.info, p.description,
                      p.price::float as price, p.promotional_price::float as "promotionalPrice",
                      p.stock_quantity as "stockQuantity", p.category_id as "categoryId",
                      p.image_url as image, p.badge_label as "badgeLabel", p.badge_tone as "badgeTone",
                      p.rating::float as rating, p.reviews_count as reviews, p.sold_count as sold,
                      p.status, p.created_at as "createdAt", c.name as "categoryName"
                 FROM universe.store_products p
                 LEFT JOIN universe.store_categories c ON c.id = p.category_id
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
                              o.total_amount::float as "totalAmount", o.status, o.tracking_code as "trackingCode",
                              o.paid_at as "paidAt", o.created_at as "createdAt"
                         FROM universe.store_orders o`;
            const params: unknown[] = [];

            if (statusFilter) {
              params.push(statusFilter);
              sql += ` WHERE o.status = $1`;
            }

            sql += ` ORDER BY o.created_at DESC LIMIT 200`;

            const { rows } = await query(sql, params);
            return Response.json({ ok: true, orders: rows });
          }

          if (action === "stats") {
            const [salesResult, countResult] = await Promise.all([
              query(
                `SELECT sum(total_amount)::float as total FROM universe.store_orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered')`,
              ),
              query(`SELECT status, count(*) FROM universe.store_orders GROUP BY status`),
            ]);

            const stats = {
              totalRevenue: Number(salesResult.rows[0]?.total || 0),
              pendingOrders: 0,
              paidOrders: 0,
              shippedOrders: 0,
            };

            for (const row of countResult.rows) {
              if (row.status === "pending") stats.pendingOrders = Number(row.count);
              else if (row.status === "paid" || row.status === "processing")
                stats.paidOrders += Number(row.count);
              else if (row.status === "shipped" || row.status === "delivered")
                stats.shippedOrders += Number(row.count);
            }

            return Response.json({ ok: true, stats });
          }

          return Response.json({ ok: false, message: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },

      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const actor = await requirePermission(request, "store.write");
          const body = await request.json();

          const prod = productSchema.safeParse(body);
          if (prod.success) {
            const v = prod.data;
            let id = v.id;

            if (id) {
              await query(
                `UPDATE universe.store_products
                    SET slug=$2, name=$3, info=NULLIF($4, ''), description=NULLIF($5, ''),
                        price=$6, promotional_price=$7, stock_quantity=$8, category_id=NULLIF($9, ''),
                        image_url=$10, badge_label=NULLIF($11, ''), badge_tone=NULLIF($12, ''),
                        status=$13, updated_at=now()
                  WHERE id=$1`,
                [
                  id,
                  v.slug,
                  v.name,
                  v.info ?? "",
                  v.description ?? "",
                  v.price,
                  v.promotionalPrice ?? null,
                  v.stockQuantity,
                  v.categoryId ?? "",
                  v.image,
                  v.badgeLabel ?? "",
                  v.badgeTone ?? "gold",
                  v.status,
                ],
              );
            } else {
              const { rows } = await query<{ id: string }>(
                `INSERT INTO universe.store_products
                   (slug, name, info, description, price, promotional_price, stock_quantity, category_id, image_url, badge_label, badge_tone, status)
                 VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6, $7, NULLIF($8, ''), $9, NULLIF($10, ''), NULLIF($11, ''), $12)
                 RETURNING id`,
                [
                  v.slug,
                  v.name,
                  v.info ?? "",
                  v.description ?? "",
                  v.price,
                  v.promotionalPrice ?? null,
                  v.stockQuantity,
                  v.categoryId ?? "",
                  v.image,
                  v.badgeLabel ?? "",
                  v.badgeTone ?? "gold",
                  v.status,
                ],
              );
              id = rows[0]?.id;
            }

            await audit(
              actor.id,
              v.id ? "store.product.updated" : "store.product.created",
              "store_product",
              id,
            );
            return Response.json({ ok: true, id });
          }

          const orderUpdate = updateOrderStatusSchema.safeParse(body);
          if (orderUpdate.success) {
            const { orderId, status, trackingCode } = orderUpdate.data;
            await query(
              `UPDATE universe.store_orders
                  SET status = $2,
                      tracking_code = COALESCE(NULLIF($3, ''), tracking_code),
                      paid_at = CASE WHEN $2 = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END,
                      updated_at = now()
                WHERE id = $1`,
              [orderId, status, trackingCode ?? ""],
            );

            await audit(actor.id, "store.order.status_updated", "store_order", orderId, {
              status,
              trackingCode,
            });
            return Response.json({ ok: true });
          }

          return Response.json({ ok: false, message: "Dados inválidos." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
