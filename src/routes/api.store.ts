import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { query } from "@/lib/db.server";
import { createSumUpCheckout, getSumUpCheckoutStatus } from "@/lib/sumup.server";

const cartItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  price: z.number().min(0),
  qty: z.number().int().min(1),
});

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Informe seu nome completo."),
  customerEmail: z.string().email("Informe um e-mail válido."),
  customerPhone: z.string().min(8, "Informe um telefone para contato."),
  customerDocument: z.string().min(11, "CPF inválido."),
  shippingAddress: z.object({
    zipCode: z.string().min(8, "CEP inválido."),
    street: z.string().min(2, "Endereço obrigatório."),
    number: z.string().min(1, "Número obrigatório."),
    complement: z.string().optional(),
    neighborhood: z.string().min(2, "Bairro obrigatório."),
    city: z.string().min(2, "Cidade obrigatória."),
    state: z.string().min(2, "UF obrigatória."),
  }),
  items: z.array(cartItemSchema).min(1, "O carrinho está vazio."),
});

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  const message = error instanceof Error ? error.message : "Erro ao processar pedido.";
  console.error("[Store API]", error);
  return Response.json({ ok: false, message }, { status: 503 });
}

export const Route = createFileRoute("/api/store")({
  server: {
    handlers: {
      /* ───── GET: Products, Categories, Order Status ───── */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "products";

          if (action === "categories") {
            const { rows } = await query(
              `SELECT id, name, description, image_url as "image", sort_order
                 FROM universe.store_categories
                ORDER BY sort_order ASC, name ASC`,
            );
            return Response.json({ ok: true, categories: rows });
          }

          if (action === "products") {
            const categoryId = url.searchParams.get("category");
            const search = url.searchParams.get("search");

            let sql = `SELECT id, slug, name, info, description,
                              price::float as price, promotional_price::float as "promotionalPrice",
                              stock_quantity as "stockQuantity", category_id as "categoryId",
                              image_url as image, images,
                              json_build_object('label', badge_label, 'tone', badge_tone) as badge,
                              rating::float as rating, reviews_count as reviews, sold_count as sold
                         FROM universe.store_products
                        WHERE status = 'active'`;
            const params: unknown[] = [];

            if (categoryId) {
              params.push(categoryId);
              sql += ` AND category_id = $${params.length}`;
            }
            if (search) {
              params.push(`%${search}%`);
              sql += ` AND (name ILIKE $${params.length} OR info ILIKE $${params.length} OR description ILIKE $${params.length})`;
            }

            sql += ` ORDER BY created_at DESC LIMIT 100`;

            const { rows } = await query(sql, params);
            return Response.json({ ok: true, products: rows });
          }

          if (action === "order_status") {
            const orderNumber = url.searchParams.get("order_number");
            if (!orderNumber) {
              return Response.json(
                { ok: false, message: "Número do pedido ausente." },
                { status: 400 },
              );
            }

            const { rows } = await query<{
              id: string;
              order_number: string;
              customer_name: string;
              total_amount: string;
              status: string;
              sumup_checkout_id: string | null;
              tracking_code: string | null;
              shipping_address: unknown;
              created_at: string;
            }>(
              `SELECT id, order_number, customer_name, total_amount, status, sumup_checkout_id, tracking_code, shipping_address, created_at
                 FROM universe.store_orders
                WHERE order_number = $1`,
              [orderNumber],
            );

            const order = rows[0];
            if (!order) {
              return Response.json(
                { ok: false, message: "Pedido não encontrado." },
                { status: 404 },
              );
            }

            /* If pending and has a SumUp checkout ID, check status with SumUp */
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
                } else if (["FAILED", "EXPIRED"].includes(sumup.status)) {
                  await query(
                    `UPDATE universe.store_orders
                        SET status = 'cancelled', updated_at = now()
                      WHERE id = $1`,
                    [order.id],
                  );
                  order.status = "cancelled";
                }
              } catch (e) {
                console.error("[Store API] Error checking SumUp status:", e);
              }
            }

            /* Get order items */
            const itemsResult = await query(
              `SELECT product_name as "productName", unit_price::float as price, quantity, total_price::float as total
                 FROM universe.store_order_items
                WHERE order_id = $1`,
              [order.id],
            );

            return Response.json({
              ok: true,
              order: {
                orderNumber: order.order_number,
                customerName: order.customer_name,
                totalAmount: Number(order.total_amount),
                status: order.status,
                trackingCode: order.tracking_code,
                shippingAddress: order.shipping_address,
                createdAt: order.created_at,
                items: itemsResult.rows,
              },
            });
          }

          return Response.json({ ok: false, message: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },

      /* ───── POST: Create Order & SumUp Checkout Session ───── */
      POST: async ({ request }) => {
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
            shippingAddress,
            items,
          } = input.data;

          /* Calculate Subtotal */
          let subtotal = 0;
          for (const item of items) {
            subtotal += item.price * item.qty;
          }

          /* Calculate Shipping Cost (Free shipping if subtotal >= 299.90) */
          const shippingCost = subtotal >= 299.9 ? 0 : 20.0;
          const totalAmount = Number((subtotal + shippingCost).toFixed(2));

          /* Generate Order Number (SOL-YYYYMMDD-XXXX) */
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const orderNumber = `SOL-${dateStr}-${randomSuffix}`;
          const reference = `store-${orderNumber}`;

          /* Create SumUp Checkout */
          const returnUrl =
            process.env.SUMUP_RETURN_URL || "https://carolsol.com.br/doacao/retorno";
          const storeReturnUrl = returnUrl.replace("/doacao/retorno", "/sol-hair-closet/pedido");

          const sumup = await createSumUpCheckout(
            totalAmount,
            reference,
            `Pedido ${orderNumber} – Sol Hair Closet`,
            storeReturnUrl,
          );

          /* Save Order to DB */
          const orderResult = await query<{ id: string }>(
            `INSERT INTO universe.store_orders
               (order_number, customer_name, customer_email, customer_phone, customer_document,
                shipping_address, shipping_cost, subtotal, total_amount, sumup_checkout_id)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
             RETURNING id`,
            [
              orderNumber,
              customerName,
              customerEmail,
              customerPhone,
              customerDocument,
              JSON.stringify(shippingAddress),
              shippingCost,
              subtotal,
              totalAmount,
              sumup.id,
            ],
          );

          const orderId = orderResult.rows[0].id;

          /* Save Order Items */
          for (const item of items) {
            await query(
              `INSERT INTO universe.store_order_items
                 (order_id, product_name, unit_price, quantity, total_price)
               VALUES ($1, $2, $3, $4, $5)`,
              [orderId, item.productName, item.price, item.qty, item.price * item.qty],
            );
          }

          /* Audit log */
          await query(
            `INSERT INTO universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
             VALUES(NULL, 'store.order.created', 'store_order', $1, $2::jsonb)`,
            [orderId, JSON.stringify({ orderNumber, totalAmount, customerName })],
          );

          if (!sumup.hosted_checkout_url) {
            return Response.json(
              { ok: false, message: "SumUp não retornou URL de checkout." },
              { status: 502 },
            );
          }

          return Response.json({
            ok: true,
            orderNumber,
            checkoutUrl: sumup.hosted_checkout_url,
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
