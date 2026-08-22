import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { query, db, hashToken } from "@/lib/db.server";
import { readSession, checkRateLimit, recordFailedLogin, clearFailedLogins } from "@/lib/auth.server";
import { createSumUpCheckout, getSumUpCheckoutStatus } from "@/lib/sumup.server";
import { dispatchNotification, sendStoreOrderNotification } from "@/lib/notifications.server";
import {
  generateOrderAccessToken,
  generateUniqueOrderNumber,
  verifyOrderAccess,
  createOrderHistoryAccessToken,
  verifyOrderHistoryAccessToken,
  releaseExpiredReservations,
} from "@/lib/store.server";

// Validações Zod estritas
const cartItemSchema = z.object({
  productId: z.string().uuid("ID do produto inválido."),
  variantId: z.string().uuid().optional().nullable(),
  productName: z.string().min(1),
  variantName: z.string().optional().nullable(),
  price: z.number().min(0),
  qty: z.number().int().min(1, "Quantidade mínima é 1."),
});

const checkoutSchema = z.object({
  customerName: z.string().trim().min(3, "Informe seu nome completo."),
  customerEmail: z.string().trim().email("Informe um e-mail válido.").toLowerCase(),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Telefone com DDD inválido."),
  customerDocument: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11, "CPF deve conter exatamente 11 dígitos."),
  paymentMethod: z.enum(["pix", "card", "sumup_online"]).default("sumup_online"),
  idempotencyKey: z.string().optional(),
  shippingAddress: z.object({
    zipCode: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v.length === 8, "CEP deve conter 8 dígitos."),
    street: z.string().trim().min(3, "Rua/Logradouro obrigatório."),
    number: z.string().trim().min(1, "Número obrigatório."),
    complement: z.string().trim().optional().default(""),
    neighborhood: z.string().trim().min(2, "Bairro obrigatório."),
    city: z.string().trim().min(2, "Cidade obrigatória."),
    state: z.string().trim().length(2, "UF inválida.").toUpperCase(),
  }),
  items: z.array(cartItemSchema).min(1, "O carrinho está vazio."),
});

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  const message = error instanceof Error ? error.message : "Erro ao processar requisição.";
  console.error("[Store API]", error);
  return Response.json({ ok: false, message }, { status: 500 });
}

export const Route = createFileRoute("/api/store")({
  server: {
    handlers: {
      /* ───── GET Handlers ───── */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "products";
          const sessionUser = await readSession(request);

          /* 1. Categorias */
          if (action === "categories") {
            const { rows } = await query(
              `SELECT c.id, coalesce(c.slug, c.id) as slug, c.name, c.description,
                      c.image_url as "image", c.sort_order as "sortOrder",
                      count(p.id)::int as "productCount"
                 FROM universe.store_categories c
                 LEFT JOIN universe.store_products p ON p.category_id = c.id AND p.status = 'active'
                GROUP BY c.id, c.slug, c.name, c.description, c.image_url, c.sort_order
                ORDER BY c.sort_order ASC, c.name ASC`,
            );
            return Response.json({ ok: true, categories: rows });
          }

          /* 2. Catálogo de Produtos */
          if (action === "products") {
            const categorySlug = url.searchParams.get("category");
            const search = url.searchParams.get("search");
            const sort = url.searchParams.get("sort") || "best_selling";
            const limit = Math.min(Number(url.searchParams.get("limit") || 40), 100);
            const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

            let whereClause = "WHERE p.status = 'active'";
            const params: unknown[] = [];

            if (categorySlug) {
              params.push(categorySlug);
              whereClause += ` AND (p.category_id = $${params.length} OR c.slug = $${params.length})`;
            }

            if (search && search.trim()) {
              params.push(`%${search.trim()}%`);
              whereClause += ` AND (p.name ILIKE $${params.length} OR p.info ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
            }

            let orderBy = "p.sold_count DESC, p.created_at DESC";
            if (sort === "price_asc") orderBy = "coalesce(p.promotional_price, p.price) ASC";
            else if (sort === "price_desc") orderBy = "coalesce(p.promotional_price, p.price) DESC";
            else if (sort === "newest") orderBy = "p.created_at DESC";
            else if (sort === "rating") orderBy = "p.rating DESC, p.reviews_count DESC";

            const countSql = `
              SELECT count(distinct p.id)::int as total
                FROM universe.store_products p
                LEFT JOIN universe.store_categories c ON c.id = p.category_id
               ${whereClause}
            `;
            const countRes = await query<{ total: number }>(countSql, params);
            const total = countRes.rows[0]?.total || 0;

            const productsSql = `
              SELECT p.id, p.slug, p.name, p.info, p.description,
                     p.price::float as price, p.promotional_price::float as "promotionalPrice",
                     p.stock_quantity as "stockQuantity", p.category_id as "categoryId",
                     p.image_url as image, p.images,
                     json_build_object('label', p.badge_label, 'tone', p.badge_tone) as badge,
                     p.rating::float as rating, p.reviews_count as reviews, p.sold_count as sold,
                     coalesce(
                       json_agg(
                         json_build_object(
                           'id', v.id,
                           'title', v.title,
                           'color', v.color,
                           'colorHex', v.color_hex,
                           'lengthCm', v.length_cm,
                           'weightG', v.weight_g,
                           'texture', v.texture,
                           'priceOverride', v.price_override::float,
                           'promotionalPriceOverride', v.promotional_price_override::float,
                           'stockQuantity', v.stock_quantity,
                           'imageUrl', v.image_url,
                           'status', v.status
                         )
                       ) FILTER (WHERE v.id IS NOT NULL AND v.status = 'active'),
                       '[]'::json
                     ) as variants
                FROM universe.store_products p
                LEFT JOIN universe.store_categories c ON c.id = p.category_id
                LEFT JOIN universe.store_product_variants v ON v.product_id = p.id
               ${whereClause}
               GROUP BY p.id, p.slug, p.name, p.info, p.description, p.price,
                        p.promotional_price, p.stock_quantity, p.category_id,
                        p.image_url, p.images, p.badge_label, p.badge_tone,
                        p.rating, p.reviews_count, p.sold_count, p.created_at
               ORDER BY ${orderBy}
               LIMIT ${limit} OFFSET ${offset}
            `;

            const { rows: products } = await query(productsSql, params);

            return Response.json({
              ok: true,
              products,
              pagination: { total, limit, offset, hasMore: offset + products.length < total },
            });
          }

          /* 3. Detalhes de um Produto Individual */
          if (action === "product") {
            const slug = url.searchParams.get("slug");
            const id = url.searchParams.get("id");

            if (!slug && !id) {
              return Response.json(
                { ok: false, message: "Parâmetro slug ou id é obrigatório." },
                { status: 400 },
              );
            }

            const param = slug || id;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              param ?? "",
            );

            const productSql = `
              SELECT p.id, p.slug, p.name, p.info, p.description,
                     p.price::float as price, p.promotional_price::float as "promotionalPrice",
                     p.stock_quantity as "stockQuantity", p.category_id as "categoryId",
                     p.image_url as image, p.images,
                     json_build_object('label', p.badge_label, 'tone', p.badge_tone) as badge,
                     p.rating::float as rating, p.reviews_count as reviews, p.sold_count as sold,
                     c.name as "categoryName", coalesce(c.slug, c.id) as "categorySlug"
                FROM universe.store_products p
                LEFT JOIN universe.store_categories c ON c.id = p.category_id
               WHERE ${isUuid ? "p.id = $1" : "p.slug = $1"} AND p.status != 'archived'
               LIMIT 1
            `;

            const { rows } = await query(productSql, [param]);
            const product = rows[0];

            if (!product) {
              return Response.json({ ok: false, message: "Produto não encontrado." }, { status: 404 });
            }

            // Buscar variações
            const variantsRes = await query(
              `SELECT id, product_id as "productId", sku, title, color, color_hex as "colorHex",
                      length_cm as "lengthCm", weight_g as "weightG", texture,
                      price_override::float as "priceOverride",
                      promotional_price_override::float as "promotionalPriceOverride",
                      stock_quantity as "stockQuantity", image_url as "imageUrl",
                      status, sort_order as "sortOrder"
                 FROM universe.store_product_variants
                WHERE product_id = $1 AND status != 'inactive'
                ORDER BY sort_order ASC, created_at ASC`,
              [product.id],
            );
            product.variants = variantsRes.rows;

            // Buscar produtos relacionados
            const relatedRes = await query(
              `SELECT id, slug, name, info, price::float as price,
                      promotional_price::float as "promotionalPrice",
                      stock_quantity as "stockQuantity", image_url as image,
                      json_build_object('label', badge_label, 'tone', badge_tone) as badge,
                      rating::float as rating, reviews_count as reviews
                 FROM universe.store_products
                WHERE category_id = $1 AND id != $2 AND status = 'active'
                ORDER BY rating DESC LIMIT 4`,
              [product.categoryId, product.id],
            );
            product.relatedProducts = relatedRes.rows;

            return Response.json({ ok: true, product });
          }

          /* 4. Sugestões de Busca Rápida */
          if (action === "search_suggestions") {
            const q = url.searchParams.get("q") || "";
            if (!q.trim()) return Response.json({ ok: true, suggestions: [] });

            const { rows } = await query(
              `SELECT id, slug, name, info, price::float as price,
                      promotional_price::float as "promotionalPrice", image_url as image
                 FROM universe.store_products
                WHERE status = 'active'
                  AND (name ILIKE $1 OR info ILIKE $1 OR description ILIKE $1)
                ORDER BY rating DESC LIMIT 6`,
              [`%${q.trim()}%`],
            );
            return Response.json({ ok: true, suggestions: rows });
          }

          /* 5. Status do Pedido (PROTEGIDO POR TOKEN OU AUTENTICAÇÃO) */
          if (action === "order_status") {
            const orderNumber = url.searchParams.get("order_number");
            const token = url.searchParams.get("token");

            if (!orderNumber) {
              return Response.json(
                { ok: false, message: "Número do pedido ausente." },
                { status: 400 },
              );
            }

            // Validação estrita de acesso
            const access = await verifyOrderAccess(orderNumber, token, sessionUser);
            if (!access.authorized || !access.order) {
              return Response.json(
                { ok: false, message: "Acesso não autorizado a este pedido. Informe o token de acesso ou faça login." },
                { status: 403 },
              );
            }

            const order = access.order;

            /* Se pendente e tem checkout da SumUp, consultar status oficial */
            if (order.status === "pending" && order.sumup_checkout_id) {
              try {
                const sumup = await getSumUpCheckoutStatus(order.sumup_checkout_id);
                if (sumup.status === "PAID") {
                  await query(
                    `UPDATE universe.store_orders
                        SET status = 'paid', paid_at = now(), updated_at = now()
                      WHERE id = $1`,
                    [order.id],
                  );
                  order.status = "paid";
                  order.paid_at = new Date().toISOString();
                } else if (["FAILED", "EXPIRED"].includes(sumup.status)) {
                  // Se expirou na SumUp, liberar o estoque se estava reservado
                  if (order.stock_reserved) {
                    await releaseExpiredReservations();
                  }
                  order.status = "cancelled";
                }
              } catch (e) {
                console.error("[Store API] Erro ao consultar SumUp status:", e);
                // Não altera para cancelado nem pago se a API estiver fora
              }
            }

            const itemsResult = await query(
              `SELECT product_id as "productId", variant_id as "variantId",
                      product_name as "productName", variant_name as "variantName",
                      unit_price::float as price, quantity, total_price::float as total
                 FROM universe.store_order_items
                WHERE order_id = $1`,
              [order.id],
            );

            return Response.json({
              ok: true,
              order: {
                orderNumber: order.order_number,
                customerName: order.customer_name,
                customerEmail: order.customer_email,
                subtotal: Number(order.subtotal),
                shippingCost: Number(order.shipping_cost),
                discountAmount: Number(order.discount_amount || 0),
                totalAmount: Number(order.total_amount),
                status: order.status,
                trackingCode: order.tracking_code,
                shippingAddress: order.shipping_address,
                paidAt: order.paid_at,
                createdAt: order.created_at,
                items: itemsResult.rows,
              },
            });
          }

          /* 6. Pedidos do Cliente (PROTEGIDO POR SESSÃO OU TOKEN TEMPORÁRIO) */
          if (action === "customer_orders") {
            let targetEmail: string | null = null;

            // Opção A: Usuário autenticado
            if (sessionUser) {
              targetEmail = sessionUser.email.toLowerCase();
            } else {
              // Opção B: Cliente sem conta usando token temporário validado
              const emailParam = url.searchParams.get("email");
              const tokenParam = url.searchParams.get("token");

              if (emailParam && tokenParam) {
                const isValid = await verifyOrderHistoryAccessToken(emailParam, tokenParam);
                if (isValid) {
                  targetEmail = emailParam.toLowerCase().trim();
                }
              }
            }

            if (!targetEmail) {
              return Response.json(
                {
                  ok: false,
                  message:
                    "Acesso não autorizado. Faça login na sua conta ou solicite um link de acesso por e-mail.",
                },
                { status: 401 },
              );
            }

            const { rows: orders } = await query(
              `SELECT o.id, o.order_number as "orderNumber", o.customer_name as "customerName",
                      o.total_amount::float as "totalAmount", o.status, o.tracking_code as "trackingCode",
                      o.created_at as "createdAt", o.paid_at as "paidAt",
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
                 LEFT JOIN universe.store_order_items i ON i.order_id = o.id
                WHERE lower(o.customer_email) = lower($1)
                GROUP BY o.id, o.order_number, o.customer_name, o.total_amount, o.status,
                         o.tracking_code, o.created_at, o.paid_at
                ORDER BY o.created_at DESC`,
              [targetEmail],
            );

            return Response.json({ ok: true, orders });
          }

          /* 7. Solicitação de Link de Acesso ao Histórico por E-mail */
          if (action === "request_history_access") {
            const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
            await checkRateLimit(clientIp);

            const email = url.searchParams.get("email");
            if (!email || !email.includes("@")) {
              return Response.json({ ok: false, message: "E-mail inválido." }, { status: 400 });
            }

            const token = await createOrderHistoryAccessToken(email, clientIp);

            const storeBaseUrl =
              process.env.STORE_PUBLIC_URL || "https://loja.carolsol.com.br";
            const historyUrl = `${storeBaseUrl}/sol-hair-closet/pedidos?email=${encodeURIComponent(email.trim().toLowerCase())}&token=${encodeURIComponent(token)}`;
            await dispatchNotification({
              channel: "email",
              recipient: email.trim().toLowerCase(),
              subject: "Acesso aos seus pedidos – Sol Hair Closet",
              templateName: "store_history_access",
              payload: { historyUrl },
            });

            return Response.json({
              ok: true,
              message: "Link de acesso gerado com sucesso. Verifique seu e-mail.",
              // Em dev/preview retornamos o token para facilidade de teste
              devToken: process.env.NODE_ENV !== "production" ? token : undefined,
            });
          }

          /* 8. Reconciliação Periódica de Reservas Expiradas (Admin ou Cron) */
          if (action === "reconcile_reservations") {
            const cronSecret = request.headers.get("x-cron-secret");
            const isAuthorizedCron = cronSecret && cronSecret === process.env.CRON_SECRET;
            const isAdmin =
              sessionUser &&
              (sessionUser.role === "admin" ||
                sessionUser.role === "manager" ||
                sessionUser.permissions?.includes("store.write"));

            if (!isAuthorizedCron && !isAdmin) {
              return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
            }

            const released = await releaseExpiredReservations();
            return Response.json({ ok: true, releasedReservations: released });
          }

          return Response.json({ ok: false, message: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },

      /* ───── POST: Checkout Seguro, Idempotente e sem Lock Externo ───── */
      POST: async ({ request }) => {
        const pool = db;
        if (!pool) {
          return Response.json({ ok: false, message: "Banco de dados indisponível." }, { status: 503 });
        }
        const client = await pool.connect();

        let orderId: string | null = null;
        let orderNumber = "";
        let accessToken = "";
        let totalAmount = 0;
        let discountAmount = 0;
        let discountType: string | null = null;
        let shippingCost = 0;
        let subtotal = 0;
        let notificationCustomerName = "";
        let notificationCustomerEmail = "";
        let notificationCustomerPhone = "";
        let authoritativeItems: {
          productId: string;
          variantId?: string | null;
          productName: string;
          variantName?: string | null;
          price: number;
          qty: number;
        }[] = [];

        try {
          const body = await request.json();
          const input = checkoutSchema.safeParse(body);

          if (!input.success) {
            const message = input.error.issues.map((i) => i.message).join("; ");
            return Response.json({ ok: false, message }, { status: 400 });
          }

          const {
            customerName,
            customerEmail,
            customerPhone,
            customerDocument,
            paymentMethod,
            idempotencyKey,
            shippingAddress,
            items,
          } = input.data;
          notificationCustomerName = customerName;
          notificationCustomerEmail = customerEmail;
          notificationCustomerPhone = customerPhone;

          // Se fornecida chave de idempotência, verificar se já existe pedido recente
          if (idempotencyKey) {
            const existingOrder = await query<{
              id: string;
              order_number: string;
              sumup_checkout_id: string | null;
              status: string;
            }>(
              `SELECT id, order_number, sumup_checkout_id, status
                 FROM universe.store_orders
                WHERE idempotency_key = $1 AND status != 'cancelled'
                LIMIT 1`,
              [idempotencyKey],
            );
            if (existingOrder.rowCount && existingOrder.rows[0]?.sumup_checkout_id) {
              const existingCheckout = await getSumUpCheckoutStatus(
                existingOrder.rows[0].sumup_checkout_id,
              );
              return Response.json({
                ok: true,
                orderNumber: existingOrder.rows[0].order_number,
                checkoutUrl: existingCheckout.hosted_checkout_url,
                message: "Pedido existente recuperado com sucesso.",
              });
            }
          }

          // ─── PASSO 1: TRANSAÇÃO DE BANCO RÁPIDA (RESERVA DE ESTOQUE E CRIAÇÃO DO PEDIDO) ───
          await client.query("BEGIN");

          // Validação estrita de estoque e preços com FOR UPDATE
          for (const item of items) {
            const prodRes = await client.query<{
              id: string;
              name: string;
              price: string;
              promotional_price: string | null;
              stock_quantity: number;
              status: string;
            }>(
              `SELECT id, name, price, promotional_price, stock_quantity, status
                 FROM universe.store_products
                WHERE id = $1
                FOR UPDATE`,
              [item.productId],
            );

            const product = prodRes.rows[0];
            if (!product || product.status !== "active") {
              throw new Error(`O produto "${item.productName}" não está mais disponível.`);
            }

            let unitPrice = Number(product.promotional_price ?? product.price);
            let variantName: string | null = null;

            if (item.variantId) {
              const varRes = await client.query<{
                id: string;
                title: string;
                price_override: string | null;
                promotional_price_override: string | null;
                stock_quantity: number;
                status: string;
              }>(
                `SELECT id, title, price_override, promotional_price_override, stock_quantity, status
                   FROM universe.store_product_variants
                  WHERE id = $1 AND product_id = $2
                  FOR UPDATE`,
                [item.variantId, item.productId],
              );

              const variant = varRes.rows[0];
              if (!variant || variant.status !== "active") {
                throw new Error(`A variação selecionada de "${product.name}" não está disponível.`);
              }

              if (variant.stock_quantity < item.qty) {
                throw new Error(
                  `Estoque insuficiente para "${product.name} - ${variant.title}". Apenas ${variant.stock_quantity} unidades disponíveis.`,
                );
              }

              if (variant.promotional_price_override) {
                unitPrice = Number(variant.promotional_price_override);
              } else if (variant.price_override) {
                unitPrice = Number(variant.price_override);
              }

              variantName = variant.title;

              // Decrementar estoque da variação
              await client.query(
                `UPDATE universe.store_product_variants
                    SET stock_quantity = stock_quantity - $1,
                        status = CASE WHEN stock_quantity - $1 <= 0 THEN 'out_of_stock' ELSE status END,
                        updated_at = now()
                  WHERE id = $2`,
                [item.qty, item.variantId],
              );
            } else {
              if (product.stock_quantity < item.qty) {
                throw new Error(
                  `Estoque insuficiente para "${product.name}". Apenas ${product.stock_quantity} unidades disponíveis.`,
                );
              }
            }

            // Produtos com variação são sincronizados pelo trigger da migration 013.
            if (!item.variantId) {
              await client.query(
                `UPDATE universe.store_products
                    SET stock_quantity = stock_quantity - $1,
                        sold_count = sold_count + $1,
                        status = CASE WHEN stock_quantity - $1 <= 0 THEN 'out_of_stock' ELSE status END,
                        updated_at = now()
                  WHERE id = $2`,
                [item.qty, item.productId],
              );
            } else {
              await client.query(
                `UPDATE universe.store_products
                    SET sold_count = sold_count + $1, updated_at = now()
                  WHERE id = $2`,
                [item.qty, item.productId],
              );
            }

            subtotal += unitPrice * item.qty;
            authoritativeItems.push({
              productId: product.id,
              variantId: item.variantId,
              productName: product.name,
              variantName,
              price: unitPrice,
              qty: item.qty,
            });
          }

          // Frete Fixo: Grátis >= R$ 299,90 ou R$ 20,00
          shippingCost = subtotal >= 299.9 ? 0 : 20.0;

          // Desconto Pix (5% OFF) se selecionado
          if (paymentMethod === "pix") {
            const settRes = await client.query<{ value: { value?: number } }>(
              `SELECT value FROM universe.settings WHERE key = 'pix_discount_percent'`,
            );
            const discountPct = Number(settRes.rows[0]?.value?.value ?? 5);
            discountAmount = Number(((subtotal * discountPct) / 100).toFixed(2));
            discountType = `pix_${discountPct}%`;
          }

          totalAmount = Number(
            Math.max(0.01, subtotal + shippingCost - discountAmount).toFixed(2),
          );

          // Gerar número de pedido único de alta entropia
          orderNumber = await generateUniqueOrderNumber();

          // Gerar token de acesso seguro ao pedido
          const tokenData = generateOrderAccessToken();
          accessToken = tokenData.token;

          // Cadastro / Atualização do cliente
          const custRes = await client.query<{ id: string }>(
            `INSERT INTO universe.store_customers
               (full_name, email, phone, document, default_address)
             VALUES ($1, lower($2), $3, $4, $5::jsonb)
             ON CONFLICT (lower(email)) DO UPDATE
               SET full_name = excluded.full_name,
                   phone = coalesce(nullif(excluded.phone, ''), universe.store_customers.phone),
                   document = coalesce(nullif(excluded.document, ''), universe.store_customers.document),
                   default_address = excluded.default_address,
                   updated_at = now()
             RETURNING id`,
            [
              customerName,
              customerEmail,
              customerPhone,
              customerDocument,
              JSON.stringify(shippingAddress),
            ],
          );
          const customerId = custRes.rows[0]?.id;

          // Salvar Pedido com reserva e expiração em 30 min
          const orderRes = await client.query<{ id: string }>(
            `INSERT INTO universe.store_orders
               (order_number, customer_id, customer_name, customer_email, customer_phone, customer_document,
                shipping_address, shipping_cost, subtotal, discount_amount, discount_type,
                total_amount, payment_method, payment_method_selected, stock_reserved,
                reservation_expires_at, access_token_hash, idempotency_key)
             VALUES ($1, $2, $3, lower($4), $5, $6, $7::jsonb, $8, $9, $10, $11, $12,
                     'sumup_online', $13, true, now() + interval '30 minutes', $14, $15)
             RETURNING id`,
            [
              orderNumber,
              customerId,
              customerName,
              customerEmail,
              customerPhone,
              customerDocument,
              JSON.stringify(shippingAddress),
              shippingCost,
              subtotal,
              discountAmount,
              discountType,
              totalAmount,
              paymentMethod,
              tokenData.hash,
              idempotencyKey || null,
            ],
          );
          orderId = orderRes.rows[0].id;

          // Salvar Itens e Histórico de Estoque
          for (const item of authoritativeItems) {
            await client.query(
              `INSERT INTO universe.store_order_items
                 (order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, total_price)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                orderId,
                item.productId,
                item.variantId || null,
                item.productName,
                item.variantName || null,
                item.price,
                item.qty,
                item.price * item.qty,
              ],
            );

            await client.query(
              `INSERT INTO universe.store_stock_logs
                 (product_id, variant_id, order_id, change_qty, reason, notes)
               VALUES ($1, $2, $3, $4, 'sale', $5)`,
              [
                item.productId,
                item.variantId || null,
                orderId,
                -item.qty,
                `Reserva para pedido ${orderNumber}`,
              ],
            );
          }

          // COMMIT da transação de banco imediatamente! Locks liberados!
          await client.query("COMMIT");
        } catch (dbError) {
          await client.query("ROLLBACK").catch(() => {});
          return errorResponse(dbError);
        } finally {
          client.release();
        }

        // ─── PASSO 2: CHAMADA EXTERNA SUMUP (TOTALMENTE FORA DE TRANSAÇÃO DO BANCO) ───
        try {
          const storeReturnUrl =
            process.env.SUMUP_STORE_RETURN_URL || "https://loja.carolsol.com.br/pedido";
          const reference = `store-${orderNumber}`;
          const redirectUrlWithToken = `${storeReturnUrl}?order_number=${orderNumber}&token=${accessToken}`;

          const sumup = await createSumUpCheckout(
            totalAmount,
            reference,
            `Pedido ${orderNumber} – Sol Hair Closet`,
            redirectUrlWithToken,
          );

          // Atualizar o checkout ID da SumUp no pedido
          await query(
            `UPDATE universe.store_orders
                SET sumup_checkout_id = $1, updated_at = now()
              WHERE id = $2`,
            [sumup.id, orderId],
          );

          // Notificação e auditoria
          void sendStoreOrderNotification(
            orderNumber,
            notificationCustomerName,
            notificationCustomerEmail,
            notificationCustomerPhone,
            totalAmount,
          );

          await query(
            `INSERT INTO universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
             VALUES(NULL, 'store.order.created', 'store_order', $1, $2::jsonb)`,
            [
              orderId,
              JSON.stringify({
                orderNumber,
                totalAmount,
                discountAmount,
                sumupCheckoutId: sumup.id,
              }),
            ],
          );

          return Response.json({
            ok: true,
            orderNumber,
            accessToken,
            totalAmount,
            discountAmount,
            checkoutUrl: sumup.hosted_checkout_url,
          });
        } catch (sumupError) {
          console.error("[SumUp Checkout Creation Failed]", sumupError);

          // ─── PASSO 3: COMPENSAÇÃO SEGURA (ROLLBACK DE NEGÓCIO) ───
          if (orderId) {
            const compClient = await pool.connect();
            try {
              await compClient.query("BEGIN");

              // Estornar estoque
              for (const item of authoritativeItems) {
                if (item.variantId) {
                  await compClient.query(
                    `UPDATE universe.store_product_variants
                        SET stock_quantity = stock_quantity + $1,
                            status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END,
                            updated_at = now()
                      WHERE id = $2`,
                    [item.qty, item.variantId],
                  );
                } else {
                  await compClient.query(
                    `UPDATE universe.store_products
                        SET stock_quantity = stock_quantity + $1,
                            status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END,
                            updated_at = now()
                      WHERE id = $2`,
                    [item.qty, item.productId],
                  );
                }

                await compClient.query(
                  `INSERT INTO universe.store_stock_logs
                     (product_id, variant_id, order_id, change_qty, reason, notes)
                   VALUES ($1, $2, $3, $4, 'cancellation', 'Estorno por falha no gateway SumUp')`,
                  [item.productId, item.variantId || null, orderId, item.qty],
                );
              }

              await compClient.query(
                `UPDATE universe.store_orders
                    SET status = 'cancelled', stock_reserved = false, updated_at = now()
                  WHERE id = $1`,
                [orderId],
              );

              await compClient.query("COMMIT");
            } catch (compErr) {
              await compClient.query("ROLLBACK").catch(() => {});
              console.error("[Store Compensation Error]", compErr);
            } finally {
              compClient.release();
            }
          }

          return Response.json(
            {
              ok: false,
              message:
                "O gateway de pagamento está temporariamente indisponível. Seu estoque foi liberado. Tente novamente em instantes.",
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
