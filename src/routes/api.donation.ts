import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { query } from "@/lib/db.server";
import { createSumUpCheckout, getSumUpCheckoutStatus } from "@/lib/sumup.server";

const donationSchema = z.object({
  amount: z
    .number()
    .min(5, "O valor mínimo é R$ 5,00.")
    .max(10000, "O valor máximo é R$ 10.000,00."),
  donorName: z.string().max(160).optional(),
  donorEmail: z.string().email().max(254).or(z.literal("")).optional(),
  donorMessage: z.string().max(500).optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  const message = error instanceof Error ? error.message : "Erro ao processar doação.";
  console.error("[Donation]", error);
  return Response.json({ ok: false, message }, { status: 503 });
}

export const Route = createFileRoute("/api/donation")({
  server: {
    handlers: {
      /* ───── GET: verify checkout status ───── */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const ref = url.searchParams.get("checkout_ref");
          if (!ref) {
            return Response.json(
              { ok: false, message: "Referência de checkout ausente." },
              { status: 400 },
            );
          }

          const { rows } = await query<{
            id: string;
            checkout_id: string;
            amount: string;
            donor_name: string | null;
            status: string;
          }>(
            `SELECT id, checkout_id, amount, donor_name, status
               FROM universe.elo_checkouts
              WHERE checkout_reference = $1`,
            [ref],
          );

          const checkout = rows[0];
          if (!checkout) {
            return Response.json(
              { ok: false, message: "Checkout não encontrado." },
              { status: 404 },
            );
          }

          /* If already resolved, return cached status */
          if (checkout.status === "paid" || checkout.status === "failed") {
            return Response.json({
              ok: true,
              status: checkout.status,
              amount: Number(checkout.amount),
              donorName: checkout.donor_name,
            });
          }

          /* Otherwise, ask SumUp for fresh status */
          const sumup = await getSumUpCheckoutStatus(checkout.checkout_id);
          const isPaid = sumup.status === "PAID";
          const isFailed = ["FAILED", "EXPIRED"].includes(sumup.status);
          const newStatus = isPaid ? "paid" : isFailed ? "failed" : "pending";

          await query(
            `UPDATE universe.elo_checkouts
                SET status = $2,
                    sumup_status = $3,
                    transaction_id = $4,
                    paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE paid_at END,
                    updated_at = now()
              WHERE id = $1`,
            [checkout.id, newStatus, sumup.status, sumup.transaction_id ?? null],
          );

          /* On successful payment, create an elo_donation record automatically */
          if (isPaid) {
            await query(
              `INSERT INTO universe.elo_donations
                 (participant_id, amount, donation_date, payment_method, status, notes, checkout_id)
               SELECT
                 NULL,
                 $1,
                 CURRENT_DATE,
                 'SumUp Online',
                 'completed',
                 $2,
                 $3
               WHERE NOT EXISTS (
                 SELECT 1 FROM universe.elo_donations WHERE checkout_id = $3
               )`,
              [
                Number(checkout.amount),
                checkout.donor_name
                  ? `Doação online de ${checkout.donor_name}`
                  : "Doação online anônima",
                checkout.id,
              ],
            );

            await query(
              `INSERT INTO universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
               VALUES(NULL, 'elo.donation.online', 'elo_checkout', $1, $2::jsonb)`,
              [
                checkout.id,
                JSON.stringify({
                  amount: Number(checkout.amount),
                  donor: checkout.donor_name,
                  sumupStatus: sumup.status,
                }),
              ],
            );
          }

          return Response.json({
            ok: true,
            status: newStatus,
            amount: Number(checkout.amount),
            donorName: checkout.donor_name,
          });
        } catch (error) {
          return errorResponse(error);
        }
      },

      /* ───── POST: create checkout ───── */
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const input = donationSchema.safeParse(body);
          if (!input.success) {
            const message = input.error.issues.map((i) => i.message).join("; ");
            return Response.json({ ok: false, message }, { status: 400 });
          }

          const { amount, donorName, donorEmail, donorMessage } = input.data;
          const reference = `elo-${crypto.randomUUID()}`;

          const sumup = await createSumUpCheckout(
            amount,
            reference,
            "Doação ao Projeto Elo – Universo Carol Sol",
          );

          await query(
            `INSERT INTO universe.elo_checkouts
               (checkout_id, checkout_reference, amount, donor_name, donor_email,
                donor_message, hosted_checkout_url)
             VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), $7)`,
            [
              sumup.id,
              reference,
              amount,
              donorName ?? "",
              donorEmail ?? "",
              donorMessage ?? "",
              sumup.hosted_checkout_url ?? "",
            ],
          );

          if (!sumup.hosted_checkout_url) {
            return Response.json(
              { ok: false, message: "SumUp não retornou URL de checkout." },
              { status: 502 },
            );
          }

          return Response.json({
            ok: true,
            checkoutUrl: sumup.hosted_checkout_url,
            reference,
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
