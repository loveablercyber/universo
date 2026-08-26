import { createFileRoute } from "@tanstack/react-router";
import { assertSameOrigin } from "@/lib/auth.server";
import { query, withTransaction } from "@/lib/db.server";
import { enforceEloPublicRateLimit } from "@/lib/elo.server";
import { eloPublicSubmissionSchema, participantKindFor, requestTitleFor } from "@/lib/elo";

function publicError(error: unknown) {
  if (error instanceof Response) return error;
  console.error("[Projeto Elo]", error);
  return Response.json(
    { ok: false, message: "Não foi possível registrar agora. Tente novamente em instantes." },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/elo")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { rows } = await query<{
            completedDonations: number;
            totalRaised: string;
            beneficiariesSupported: number;
            activeVolunteers: number;
            activePartners: number;
          }>(
            `select
               (select count(*)::int from universe.elo_donations where status='completed') as "completedDonations",
               (select coalesce(sum(amount),0)::text from universe.elo_donations where status='completed') as "totalRaised",
               (select count(*)::int from universe.elo_participants where kind='beneficiary' and status='completed' and is_deleted=false) as "beneficiariesSupported",
               (select count(*)::int from universe.elo_participants where kind='volunteer' and status='active' and is_deleted=false) as "activeVolunteers",
               (select count(*)::int from universe.elo_participants where kind='partner' and status='active' and is_deleted=false) as "activePartners"`,
          );
          const stats = rows[0];
          return Response.json({
            ok: true,
            stats: {
              completedDonations: Number(stats?.completedDonations || 0),
              totalRaised: Number(stats?.totalRaised || 0),
              beneficiariesSupported: Number(stats?.beneficiariesSupported || 0),
              activeVolunteers: Number(stats?.activeVolunteers || 0),
              activePartners: Number(stats?.activePartners || 0),
            },
          });
        } catch (error) {
          return publicError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const input = eloPublicSubmissionSchema.safeParse(await request.json());
          if (!input.success) {
            return Response.json(
              { ok: false, message: input.error.issues.map((issue) => issue.message).join("; ") },
              { status: 400 },
            );
          }
          await enforceEloPublicRateLimit(request, "participation");
          const values = input.data;
          const kind = participantKindFor(values.participationType);
          const publicReference = `ELO-${crypto.randomUUID().replace(/-/g, "").toUpperCase()}`;
          const metadata = {
            participationType: values.participationType,
            city: values.city || null,
            state: values.state?.toUpperCase() || null,
            availability: values.availability || null,
          };

          await withTransaction(async (client) => {
            const participant = await client.query<{ id: string }>(
              `insert into universe.elo_participants(
                 kind,full_name,email,phone,status,notes,consent_at,consent_text,
                 lgpd_accepted,metadata,public_reference,source
               ) values($1,$2,nullif($3,''),nullif($4,''),'new',$5,now(),$6,true,$7::jsonb,$8,'public_form')
               returning id`,
              [
                kind,
                values.fullName,
                values.email,
                values.phone,
                values.message,
                "Consentimento fornecido no formulário público do Projeto Elo.",
                JSON.stringify(metadata),
                publicReference,
              ],
            );
            const id = participant.rows[0].id;
            await client.query(
              `insert into universe.elo_requests(participant_id,title,description,status,priority)
               values($1,$2,$3,'open',$4)`,
              [
                id,
                requestTitleFor(values.participationType),
                values.message,
                values.participationType === "beneficiary_request" ? "high" : "medium",
              ],
            );
            await client.query(
              `insert into universe.elo_history(participant_id,action,notes)
               values($1,'Cadastro público recebido',$2)`,
              [id, requestTitleFor(values.participationType)],
            );
            await client.query(
              `insert into universe.audit_logs(actor_id,action,entity_type,entity_id,metadata)
               values(null,'elo.public_submission.created','elo_participant',$1,$2::jsonb)`,
              [
                id,
                JSON.stringify({ publicReference, participationType: values.participationType }),
              ],
            );
            return id;
          });

          return Response.json(
            { ok: true, reference: publicReference.slice(0, 16) },
            { status: 201 },
          );
        } catch (error) {
          return publicError(error);
        }
      },
    },
  },
});
