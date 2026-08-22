import { createFileRoute } from "@tanstack/react-router";
import { query, db } from "@/lib/db.server";
import { getSumUpCheckoutStatus } from "@/lib/sumup.server";

export const Route = createFileRoute("/api/webhook/sumup")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ ok: true, message: "SumUp Webhook Endpoint is active." });
      },

      POST: async ({ request }) => {
        const pool = db;
        const client = await pool.connect();

        try {
          const body = await request.json().catch(() => ({}));
          const eventId = (body.id || body.event_id || body.checkout_id) as string | undefined;
          const eventType = (body.event_type || body.type || "CHECKOUT_STATUS_CHANGED") as string;
          const checkoutId = (body.checkout_id || body.resource_id || body.id) as string | undefined;

          // Se não houver checkoutId no payload, ignorar de forma segura
          if (!checkoutId) {
            return Response.json({ ok: true, ignored: true, reason: "No checkoutId provided" });
          }

          // 1. Idempotência estrita: verificar se este evento específico já foi processado
          if (eventId) {
            const existingEvent = await query<{ id: string; status: string }>(
              `SELECT id, status FROM universe.store_webhook_events WHERE gateway = 'sumup' AND event_id = $1`,
              [eventId],
            );
            if (existingEvent.rowCount && existingEvent.rows[0]?.status === "processed") {
              return Response.json({ ok: true, duplicate: true, message: "Event already processed" });
            }
          }

          // 2. Gravar evento recebido
          let webhookLogId: string | null = null;
          try {
            const eventRes = await client.query<{ id: string }>(
              `INSERT INTO universe.store_webhook_events
                 (gateway, event_id, event_type, payload, status)
               VALUES ('sumup', $1, $2, $3::jsonb, 'received')
               ON CONFLICT (gateway, event_id) WHERE event_id IS NOT NULL DO UPDATE
                 SET payload = excluded.payload, updated_at = now()
               RETURNING id`,
              [eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, eventType, JSON.stringify(body)],
            );
            webhookLogId = eventRes.rows[0]?.id;
          } catch {
            // Ignorar erro de log
          }

          // 3. Localizar pedido relacionado no PostgreSQL
          const orderRes = await client.query<{
            id: string;
            order_number: string;
            status: string;
            stock_reserved: boolean;
          }>(
            `SELECT id, order_number, status, stock_reserved
               FROM universe.store_orders
              WHERE sumup_checkout_id = $1`,
            [checkoutId],
          );

          const order = orderRes.rows[0];

          if (!order) {
            if (webhookLogId) {
              await client.query(
                `UPDATE universe.store_webhook_events SET status = 'processed', error_message = 'No matching store order' WHERE id = $1`,
                [webhookLogId],
              );
            }
            return Response.json({ ok: true, matchedStoreOrder: false });
          }

          // 4. CONFIRMAÇÃO OFICIAL OBRIGATÓRIA NA SUMUP API (ZERO TRUST NO PAYLOAD PÚBLICO)
          let officialStatus: string;
          try {
            const sumupData = await getSumUpCheckoutStatus(checkoutId);
            officialStatus = sumupData.status;
          } catch (err) {
            console.error("[SumUp Webhook] Erro ao consultar status oficial na SumUp API:", err);
            // FALHA SEGURA: Se a consulta oficial falhar, NÃO alterar pedido nem estoque.
            // Retornar 503 para a SumUp realizar nova tentativa de webhook (retry).
            if (webhookLogId) {
              await client.query(
                `UPDATE universe.store_webhook_events SET status = 'failed', error_message = 'Failed to verify status with official SumUp API' WHERE id = $1`,
                [webhookLogId],
              );
            }
            return Response.json(
              { ok: false, message: "Could not verify official status with SumUp API. Retry requested." },
              { status: 503 },
            );
          }

          // 5. Atualização de Status & Gestão de Estoque
          await client.query("BEGIN");

          if (officialStatus === "PAID" && order.status !== "paid") {
            await client.query(
              `UPDATE universe.store_orders
                  SET status = 'paid', paid_at = now(), updated_at = now()
                WHERE id = $1`,
              [order.id],
            );

            await client.query(
              `INSERT INTO universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
               VALUES(NULL, 'store.order.paid_via_webhook', 'store_order', $1, $2::jsonb)`,
              [order.id, JSON.stringify({ orderNumber: order.order_number, checkoutId })],
            );
          } else if (["FAILED", "EXPIRED", "CANCELLED"].includes(officialStatus) && order.status === "pending") {
            // Estornar estoque APENAS se estava reservado e pedido pendente (evitar estorno duplo)
            if (order.stock_reserved) {
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

              for (const it of itemsRes.rows) {
                if (it.variant_id) {
                  await client.query(
                    `UPDATE universe.store_product_variants
                        SET stock_quantity = stock_quantity + $1,
                            status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END,
                            updated_at = now()
                      WHERE id = $2`,
                    [it.quantity, it.variant_id],
                  );
                } else {
                  await client.query(
                    `UPDATE universe.store_products
                        SET stock_quantity = stock_quantity + $1,
                            status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END,
                            updated_at = now()
                      WHERE id = $2`,
                    [it.quantity, it.product_id],
                  );
                }

                await client.query(
                  `INSERT INTO universe.store_stock_logs
                     (product_id, variant_id, order_id, change_qty, reason, notes)
                   VALUES ($1, $2, $3, $4, 'cancellation', 'Estorno por status final SumUp no Webhook')`,
                  [it.product_id, it.variant_id, order.id, it.quantity],
                );
              }
            }

            await client.query(
              `UPDATE universe.store_orders
                  SET status = 'cancelled', stock_reserved = false, updated_at = now()
                WHERE id = $1`,
              [order.id],
            );
          }

          if (webhookLogId) {
            await client.query(
              `UPDATE universe.store_webhook_events
                  SET status = 'processed', processed_at = now()
                WHERE id = $1`,
              [webhookLogId],
            );
          }

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
