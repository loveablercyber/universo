import { randomBytes, createHash } from "node:crypto";
import { query, db, hashToken } from "./db.server";
import { getSumUpCheckoutStatus } from "./sumup.server";
import type { SessionUser } from "./auth.server";

export function generateOrderAccessToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  const hash = hashToken(token);
  return { token, hash };
}

export function generateIdempotencyKey(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function generateUniqueOrderNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  for (let attempt = 0; attempt < 5; attempt++) {
    const randomHex = randomBytes(3).toString("hex").toUpperCase(); // 16.7M combinações por dia
    const orderNumber = `SOL-${dateStr}-${randomHex}`;
    const existing = await query(`SELECT 1 FROM universe.store_orders WHERE order_number = $1`, [
      orderNumber,
    ]);
    if (existing.rowCount === 0) return orderNumber;
  }
  throw new Error("Não foi possível gerar um número de pedido único. Tente novamente.");
}

/**
 * Validação rigorosa de acesso a um pedido individual.
 * Permite acesso apenas se:
 * 1. O token público fornecido corresponder ao hash do pedido (access_token_hash).
 * 2. O usuário autenticado for o dono do pedido (mesmo e-mail).
 * 3. O usuário autenticado for admin/manager com permissão store.read.
 */
export async function verifyOrderAccess(
  orderNumber: string,
  token: string | null,
  sessionUser: SessionUser | null,
): Promise<{
  authorized: boolean;
  order?: {
    id: string;
    order_number: string;
    customer_id: string | null;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_document: string;
    shipping_address: any;
    shipping_cost: string;
    subtotal: string;
    discount_amount: string;
    total_amount: string;
    status: string;
    sumup_checkout_id: string | null;
    tracking_code: string | null;
    paid_at: string | null;
    created_at: string;
    stock_reserved: boolean;
  };
}> {
  const { rows } = await query<{
    id: string;
    order_number: string;
    customer_id: string | null;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_document: string;
    shipping_address: any;
    shipping_cost: string;
    subtotal: string;
    discount_amount: string;
    total_amount: string;
    status: string;
    sumup_checkout_id: string | null;
    tracking_code: string | null;
    paid_at: string | null;
    created_at: string;
    access_token_hash: string | null;
    stock_reserved: boolean;
  }>(
    `SELECT id, order_number, customer_id, customer_name, customer_email, customer_phone, customer_document,
            shipping_address, shipping_cost, subtotal, discount_amount, total_amount, status,
            sumup_checkout_id, tracking_code, paid_at, created_at, access_token_hash, stock_reserved
       FROM universe.store_orders
      WHERE order_number = $1`,
    [orderNumber],
  );

  const order = rows[0];
  if (!order) return { authorized: false };

  // 1. Checar se tem token válido
  if (token && order.access_token_hash && hashToken(token) === order.access_token_hash) {
    return { authorized: true, order };
  }

  // 2. Checar se usuário logado é o mesmo do pedido
  if (sessionUser && sessionUser.email.toLowerCase() === order.customer_email.toLowerCase()) {
    return { authorized: true, order };
  }

  // 3. Checar se usuário é admin com permissão store.read
  if (
    sessionUser &&
    (sessionUser.role === "admin" ||
      sessionUser.role === "manager" ||
      sessionUser.permissions?.includes("store.read"))
  ) {
    return { authorized: true, order };
  }

  return { authorized: false };
}

/**
 * Criação de token temporário para consulta de pedidos via link mágico no e-mail (para clientes sem conta).
 */
export async function createOrderHistoryAccessToken(
  email: string,
  ip: string | null,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);

  await query(
    `INSERT INTO universe.store_access_tokens(email, token_hash, expires_at, requested_ip)
     VALUES(lower($1), $2, now() + interval '15 minutes', $3::inet)`,
    [email.trim().toLowerCase(), tokenHash, ip],
  );

  return token;
}

/**
 * Validação do token temporário de consulta de histórico.
 */
export async function verifyOrderHistoryAccessToken(
  email: string,
  token: string,
): Promise<boolean> {
  const tokenHash = hashToken(token);
  const { rowCount } = await query(
    `UPDATE universe.store_access_tokens
        SET used_at = now()
      WHERE token_hash = $1
        AND lower(email) = lower($2)
        AND expires_at > now()
        AND used_at IS NULL`,
    [tokenHash, email.trim().toLowerCase()],
  );

  return Boolean(rowCount && rowCount > 0);
}

/**
 * Rotina idempotente de liberação de reservas de estoque expiradas.
 * Pode ser executada periodicamente ou sob demanda sem gerar bloqueios de rede prolongados.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const pool = db;
  const client = await pool.connect();
  let releasedCount = 0;

  try {
    // Buscar pedidos pendentes com reserva expirada
    const { rows: expiredOrders } = await client.query<{
      id: string;
      order_number: string;
      sumup_checkout_id: string | null;
    }>(
      `SELECT id, order_number, sumup_checkout_id
         FROM universe.store_orders
        WHERE status = 'pending'
          AND stock_reserved = true
          AND reservation_expires_at < now()
        LIMIT 20`,
    );

    for (const ord of expiredOrders) {
      let isActuallyPaid = false;

      // Se possui checkout na SumUp, consultar antes de cancelar
      if (ord.sumup_checkout_id) {
        try {
          const sumup = await getSumUpCheckoutStatus(ord.sumup_checkout_id);
          if (sumup.status === "PAID") {
            isActuallyPaid = true;
          }
        } catch {
          // Se SumUp estiver inacessível, não cancelamos agora para evitar cancelar pedido pago
          continue;
        }
      }

      await client.query("BEGIN");

      if (isActuallyPaid) {
        await client.query(
          `UPDATE universe.store_orders
              SET status = 'paid', paid_at = now(), updated_at = now()
            WHERE id = $1`,
          [ord.id],
        );
      } else {
        // Estornar estoque dos itens
        const itemsRes = await client.query<{
          product_id: string;
          variant_id: string | null;
          quantity: number;
        }>(
          `SELECT product_id, variant_id, quantity
             FROM universe.store_order_items
            WHERE order_id = $1`,
          [ord.id],
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
             VALUES ($1, $2, $3, $4, 'cancellation', 'Estorno por expiração de reserva abandonada')`,
            [it.product_id, it.variant_id, ord.id, it.quantity],
          );
        }

        await client.query(
          `UPDATE universe.store_orders
              SET status = 'cancelled', stock_reserved = false, updated_at = now()
            WHERE id = $1`,
          [ord.id],
        );

        releasedCount++;
      }

      await client.query("COMMIT");
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[Store Service] Erro ao liberar reservas expiradas:", err);
  } finally {
    client.release();
  }

  return releasedCount;
}
