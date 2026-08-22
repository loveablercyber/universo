import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";
import { getSumUpCheckoutStatus } from "@/lib/sumup.server";

export const Route = createFileRoute("/api/webhook/sumup")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({ ok: true, message: "SumUp Webhook Endpoint is active." }),

      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const checkoutId = (body.checkout_id || body.resource_id || body.id) as
          | string
          | undefined;
        const eventType = (body.event_type || body.type || "CHECKOUT_STATUS_CHANGED") as string;

        if (!checkoutId) {
          return Response.json({ ok: true, ignored: true, reason: "No checkoutId provided" });
        }

        // O payload público nunca é fonte de verdade.
        let officialStatus: string;
        try {
          officialStatus = (await getSumUpCheckoutStatus(checkoutId)).status;
        } catch (error) {
          console.error("[SumUp Webhook] Falha na confirmação oficial:", error);
          return Response.json({ ok: false, message: "Official verification failed" }, { status: 503 });
        }

        if (!db) {
          return Response.json({ ok: false, error: "Database unavailable" }, { status: 503 });
        }
        const client = await db.connect();
        try {
          // A SumUp usa o ID do checkout no evento. Acrescentar o estado permite processar
          // transições legítimas (PENDING -> PAID) e rejeitar repetição do mesmo estado.
          const eventKey = `${checkoutId}:${officialStatus}`;
          const eventRes = await client.query<{ id: string }>(
            `INSERT INTO universe.store_webhook_events
               (gateway, event_id, event_type, payload, status)
             VALUES ('sumup', $1, $2, $3::jsonb, 'received')
             ON CONFLICT (gateway, event_id) WHERE event_id IS NOT NULL DO NOTHING
             RETURNING id`,
            [eventKey, eventType, JSON.stringify(body)],
          );
          const webhookLogId = eventRes.rows[0]?.id;
          if (!webhookLogId) {
            return Response.json({ ok: true, duplicate: true });
          }

          await client.query("BEGIN");
          const orderRes = await client.query<{
            id: string;
            order_number: string;
            status: string;
            stock_reserved: boolean;
          }>(
            `SELECT id, order_number, status, stock_reserved
               FROM universe.store_orders
              WHERE sumup_checkout_id = $1
              FOR UPDATE`,
            [checkoutId],
          );
          const order = orderRes.rows[0];

          if (!order) {
            await client.query(
              `UPDATE universe.store_webhook_events
                  SET status = 'processed', processed_at = now(),
                      error_message = 'No matching store order'
                WHERE id = $1`,
              [webhookLogId],
            );
            await client.query("COMMIT");
            return Response.json({ ok: true, matchedStoreOrder: false });
          }

          if (officialStatus === "PAID" && order.status !== "paid") {
            await client.query(
              `UPDATE universe.store_orders
                  SET status = 'paid', paid_at = coalesce(paid_at, now()), updated_at = now()
                WHERE id = $1`,
              [order.id],
            );
            await client.query(
              `INSERT INTO universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
               VALUES(NULL, 'store.order.paid_via_webhook', 'store_order', $1, $2::jsonb)`,
              [order.id, JSON.stringify({ orderNumber: order.order_number, checkoutId })],
            );
          } else if (
            ["FAILED", "EXPIRED", "CANCELLED"].includes(officialStatus) &&
            order.status === "pending" &&
            order.stock_reserved
          ) {
            const itemsRes = await client.query<{
              product_id: string;
              variant_id: string | null;
              quantity: number;
            }>(
              `SELECT product_id, variant_id, quantity
                 FROM universe.store_order_items
                WHERE order_id = $1`,
              [order.id],
            );

            for (const item of itemsRes.rows) {
              if (item.variant_id) {
                await client.query(
                  `UPDATE universe.store_product_variants
                      SET stock_quantity = stock_quantity + $1,
                          status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END,
                          updated_at = now()
                    WHERE id = $2`,
                  [item.quantity, item.variant_id],
                );
              } else {
                await client.query(
                  `UPDATE universe.store_products
                      SET stock_quantity = stock_quantity + $1,
                          status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END,
                          updated_at = now()
                    WHERE id = $2`,
                  [item.quantity, item.product_id],
                );
              }
              await client.query(
                `INSERT INTO universe.store_stock_logs
                   (product_id, variant_id, order_id, change_qty, reason, notes)
                 VALUES ($1, $2, $3, $4, 'cancellation', 'Estorno por status final SumUp no webhook')`,
                [item.product_id, item.variant_id, order.id, item.quantity],
              );
            }
            await client.query(
              `UPDATE universe.store_orders
                  SET status = 'cancelled', stock_reserved = false, updated_at = now()
                WHERE id = $1`,
              [order.id],
            );
          }

          await client.query(
            `UPDATE universe.store_webhook_events
                SET status = 'processed', processed_at = now()
              WHERE id = $1`,
            [webhookLogId],
          );
          await client.query("COMMIT");
          return Response.json({ ok: true, processed: true, status: officialStatus });
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          console.error("[SumUp Webhook Error]", error);
          return Response.json({ ok: false, error: "Internal processing error" }, { status: 500 });
        } finally {
          client.release();
        }
      },
    },
  },
});
