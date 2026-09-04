import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { query, withTransaction } from "@/lib/db.server";
import { createSumUpCheckout, getSumUpCheckoutStatus } from "@/lib/sumup.server";
import { sendEloDonationNotification } from "@/lib/notifications.server";
import { assertSameOrigin } from "@/lib/auth.server";
import { enforceEloPublicRateLimit } from "@/lib/elo.server";

const donationSchema = z.object({
  amount: z
    .number()
    .min(5, "O valor mínimo é R$ 5,00.")
    .max(10000, "O valor máximo é R$ 10.000,00."),
  donorName: z.string().max(160).optional(),
  donorEmail: z.string().email().max(254).or(z.literal("")).optional(),
  donorMessage: z.string().max(500).optional(),
  lgpdAccepted: z.literal(true),
});

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error("[Donation]", error);

  const databaseCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  const message = error instanceof Error ? error.message : "";

  if (databaseCode === "42P01" || databaseCode === "42703") {
    return Response.json(
      {
        ok: false,
        message:
          "O banco do Projeto Elo precisa da atualização mais recente. Execute npm run db:setup no Coolify e tente novamente.",
      },
      { status: 503 },
    );
  }

  if (
    message.includes("SUMUP_") &&
    (message.includes("não configurada") || message.includes("inválida"))
  ) {
    return Response.json(
      {
        ok: false,
        message:
          "O pagamento SumUp ainda não está configurado neste ambiente. Verifique as variáveis SUMUP_API_KEY, SUMUP_MERCHANT_CODE e SUMUP_RETURN_URL.",
      },
      { status: 503 },
    );
  }

  if (message.startsWith("Falha ao criar checkout SumUp")) {
    return Response.json(
      {
        ok: false,
        message: `${message} Verifique a chave, o código do merchant e as URLs configuradas na SumUp.`,
      },
      { status: 502 },
    );
  }

  if (message.startsWith("Falha ao conectar à SumUp")) {
    return Response.json({ ok: false, message }, { status: 502 });
  }

  return Response.json(
    { ok: false, message: "Não foi possível processar a doação agora. Tente novamente." },
    { status: 503 },
  );
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
            donor_email: string | null;
            participant_id: string | null;
            status: string;
          }>(
            `SELECT id, checkout_id, amount, donor_name, donor_email, participant_id, status
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

          const donationCreated = await withTransaction(async (client) => {
            await client.query(
              `UPDATE universe.elo_checkouts
                  SET status = $2,
                      sumup_status = $3,
                      transaction_id = $4,
                      paid_at = CASE WHEN $2 = 'paid' THEN coalesce(paid_at,now()) ELSE paid_at END,
                      updated_at = now()
                WHERE id = $1`,
              [checkout.id, newStatus, sumup.status, sumup.transaction_id ?? null],
            );
            if (!isPaid || !checkout.participant_id) return false;
            const donation = await client.query<{ id: string }>(
              `INSERT INTO universe.elo_donations
                 (participant_id, amount, donation_date, payment_method, status, notes, checkout_id)
               VALUES ($1, $2, now(), 'sumup_online', 'completed', $3, $4)
               ON CONFLICT (checkout_id) DO NOTHING
               RETURNING id`,
              [
                checkout.participant_id,
                checkout.amount,
                `Doação online via SumUp. Doador: ${checkout.donor_name || "Anônimo"}`,
                checkout.id,
              ],
            );
            await client.query(
              `update universe.elo_participants set status='active',updated_at=now() where id=$1`,
              [checkout.participant_id],
            );
            if (donation.rowCount) {
              await client.query(
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
            return Boolean(donation.rowCount);
          });

          if (donationCreated) {
            void sendEloDonationNotification(
              checkout.donor_name ?? undefined,
              checkout.donor_email ?? undefined,
              Number(checkout.amount),
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
          assertSameOrigin(request);
          const body = await request.json();
          const input = donationSchema.safeParse(body);
          if (!input.success) {
            const message = input.error.issues.map((i) => i.message).join("; ");
            return Response.json({ ok: false, message }, { status: 400 });
          }
          await enforceEloPublicRateLimit(request, "donation_checkout");

          const { amount, donorName, donorEmail, donorMessage } = input.data;
          const reference = `elo-${crypto.randomUUID()}`;

          const checkout = await withTransaction(async (client) => {
            const result = await client.query<{ id: string; participant_id: string }>(
              `WITH participant AS (
               INSERT INTO universe.elo_participants
                 (kind, full_name, email, status, notes, consent_at, consent_text, lgpd_accepted, public_reference, source)
               VALUES ('donor', coalesce(NULLIF($3, ''), 'Doador anônimo'), NULLIF($4, ''),
                       'new', NULLIF($5, ''), now(), 'Consentimento fornecido no formulário de doação online.', true,
                       $1, 'online_donation')
               RETURNING id
             )
             INSERT INTO universe.elo_checkouts
               (checkout_id, checkout_reference, amount, donor_name, donor_email,
                donor_message, hosted_checkout_url, participant_id)
             SELECT null, $1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), null, id
               FROM participant
             returning id,participant_id`,
              [reference, amount, donorName ?? "", donorEmail ?? "", donorMessage ?? ""],
            );
            return result.rows[0];
          });

          let sumup;
          try {
            sumup = await createSumUpCheckout(
              amount,
              reference,
              "Doação ao Projeto Elo – Universo Carol Sol",
            );
          } catch (error) {
            await query(
              `update universe.elo_checkouts set status='failed',sumup_status='CREATE_FAILED',updated_at=now() where id=$1`,
              [checkout.id],
            ).catch(() => undefined);
            throw error;
          }

          if (!sumup.hosted_checkout_url) {
            await query(
              `update universe.elo_checkouts set status='failed',sumup_status='MISSING_HOSTED_URL',checkout_id=$2,updated_at=now() where id=$1`,
              [checkout.id, sumup.id],
            );
            return Response.json(
              { ok: false, message: "SumUp não retornou URL de checkout." },
              { status: 502 },
            );
          }

          await query(
            `update universe.elo_checkouts
                set checkout_id=$2,hosted_checkout_url=$3,sumup_status=$4,updated_at=now()
              where id=$1`,
            [checkout.id, sumup.id, sumup.hosted_checkout_url, sumup.status || "PENDING"],
          );

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
