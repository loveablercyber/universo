import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query } from "@/lib/db.server";

const participantSchema = z.object({
  action: z.literal("save-participant"),
  id: z.string().uuid().optional(),
  kind: z.enum(["donor", "beneficiary", "volunteer", "partner"]),
  fullName: z.string().min(2).max(160),
  email: z.string().email().max(254).or(z.literal("")).optional(),
  phone: z.string().max(40).optional(),
  document: z.string().max(40).optional(),
  address: z.string().max(200).optional(),
  status: z.enum(["new", "reviewing", "approved", "active", "completed", "rejected"]),
  notes: z.string().max(5000).optional(),
});

const deleteParticipantSchema = z.object({
  action: z.literal("delete-participant"),
  id: z.string().uuid(),
});

const donationSchema = z.object({
  action: z.literal("save-donation"),
  participantId: z.string().uuid(),
  amount: z.number().min(0),
  donationDate: z.string(),
  paymentMethod: z.string().min(2).max(50),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  notes: z.string().max(1000).optional(),
});

const requestSchema = z.object({
  action: z.literal("save-request"),
  participantId: z.string().uuid(),
  title: z.string().min(2).max(100),
  description: z.string().min(2).max(2000),
  status: z.enum(["open", "in_progress", "resolved", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

const noteSchema = z.object({
  action: z.literal("add-note"),
  participantId: z.string().uuid(),
  note: z.string().min(2).max(5000),
});

const consentSchema = z.object({
  action: z.literal("update-consent"),
  participantId: z.string().uuid(),
  consentText: z.string().min(2),
  lgpdAccepted: z.boolean(),
});

const assignSchema = z.object({
  action: z.literal("assign"),
  participantId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
});

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  await query(
    `insert into universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
     values($1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, entityType, entityId, JSON.stringify(metadata)],
  );
}

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  return Response.json(
    { ok: false, message: "Não foi possível concluir a operação." },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/admin/elo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "elo.read");
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "list";

          if (action === "list") {
            const kind = url.searchParams.get("kind");
            const status = url.searchParams.get("status");
            const search = url.searchParams.get("search");

            let sql = `select p.id, p.kind, p.full_name as "fullName", p.email, p.phone, p.status, p.created_at as "createdAt",
                              u.full_name as "assignedToName"
                         from universe.elo_participants p
                         left join universe.users u on u.id = p.assigned_to
                        where p.is_deleted = false`;
            const params: unknown[] = [];
            if (kind) {
              params.push(kind);
              sql += ` and p.kind = $${params.length}`;
            }
            if (status) {
              params.push(status);
              sql += ` and p.status = $${params.length}`;
            }
            if (search) {
              params.push(`%${search}%`);
              sql += ` and (p.full_name ilike $${params.length} or p.email ilike $${params.length})`;
            }
            sql += ` order by p.created_at desc limit 500`;

            const { rows } = await query(sql, params);
            return Response.json({ ok: true, participants: rows });
          }

          if (action === "detail") {
            const id = url.searchParams.get("id");
            if (!id)
              return Response.json({ ok: false, message: "ID obrigatório" }, { status: 400 });

            const [
              participantResult,
              historyResult,
              donationsResult,
              requestsResult,
              attachmentsResult,
            ] = await Promise.all([
              query(
                `select p.id, p.kind, p.full_name as "fullName", p.email, p.phone, p.document, p.address,
                        p.status, p.notes, p.consent_text as "consentText", p.lgpd_accepted as "lgpdAccepted",
                        p.assigned_to as "assignedTo", p.created_at as "createdAt", p.updated_at as "updatedAt"
                   from universe.elo_participants p
                  where p.id = $1 and p.is_deleted = false`,
                [id],
              ),
              query(
                `select h.id, h.action, h.notes, h.created_at as "createdAt", u.full_name as "createdBy"
                   from universe.elo_history h
                   left join universe.users u on u.id = h.created_by
                  where h.participant_id = $1
                  order by h.created_at desc`,
                [id],
              ),
              query(
                `select id, amount, donation_date as "donationDate", payment_method as "paymentMethod", status, receipt_url as "receiptUrl", notes, created_at as "createdAt"
                   from universe.elo_donations
                  where participant_id = $1
                  order by donation_date desc`,
                [id],
              ),
              query(
                `select id, title, description, status, priority, created_at as "createdAt"
                   from universe.elo_requests
                  where participant_id = $1
                  order by created_at desc`,
                [id],
              ),
              query(
                `select id, file_name as "fileName", public_url as "publicUrl", mime_type as "mimeType", size_bytes as "sizeBytes", created_at as "createdAt"
                   from universe.elo_attachments
                  where participant_id = $1
                  order by created_at desc`,
                [id],
              ),
            ]);

            const participant = participantResult.rows[0];
            if (!participant)
              return Response.json(
                { ok: false, message: "Participante não encontrado" },
                { status: 404 },
              );

            return Response.json({
              ok: true,
              participant,
              history: historyResult.rows,
              donations: donationsResult.rows,
              requests: requestsResult.rows,
              attachments: attachmentsResult.rows,
            });
          }

          if (action === "stats") {
            const [counts, donationTotal] = await Promise.all([
              query(
                `select kind, count(*) from universe.elo_participants where is_deleted = false group by kind`,
              ),
              query(
                `select sum(amount) as total from universe.elo_donations where status = 'completed'`,
              ),
            ]);

            const stats = {
              donors: 0,
              beneficiaries: 0,
              volunteers: 0,
              partners: 0,
              totalDonations: Number(donationTotal.rows[0]?.total || 0),
            };

            for (const row of counts.rows) {
              if (row.kind === "donor") stats.donors = Number(row.count);
              else if (row.kind === "beneficiary") stats.beneficiaries = Number(row.count);
              else if (row.kind === "volunteer") stats.volunteers = Number(row.count);
              else if (row.kind === "partner") stats.partners = Number(row.count);
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
          const actor = await requirePermission(request, "elo.write");
          const body = await request.json();

          const participant = participantSchema.safeParse(body);
          if (participant.success) {
            const values = participant.data;
            let id = values.id;

            if (id) {
              await query(
                `update universe.elo_participants
                    set kind=$2, full_name=$3, email=nullif($4, ''), phone=nullif($5, ''),
                        document=nullif($6, ''), address=nullif($7, ''), status=$8, notes=nullif($9, ''), updated_at=now()
                  where id=$1`,
                [
                  id,
                  values.kind,
                  values.fullName,
                  values.email ?? "",
                  values.phone ?? "",
                  values.document ?? "",
                  values.address ?? "",
                  values.status,
                  values.notes ?? "",
                ],
              );
            } else {
              const { rows } = await query<{ id: string }>(
                `insert into universe.elo_participants
                   (kind, full_name, email, phone, document, address, status, notes)
                 values($1, $2, nullif($3, ''), nullif($4, ''), nullif($5, ''), nullif($6, ''), $7, nullif($8, ''))
                 returning id`,
                [
                  values.kind,
                  values.fullName,
                  values.email ?? "",
                  values.phone ?? "",
                  values.document ?? "",
                  values.address ?? "",
                  values.status,
                  values.notes ?? "",
                ],
              );
              id = rows[0]?.id;
            }

            if (!id)
              return Response.json(
                { ok: false, message: "Registro não encontrado." },
                { status: 404 },
              );

            await audit(
              actor.id,
              values.id ? "elo.participant.updated" : "elo.participant.created",
              "elo_participant",
              id,
            );
            return Response.json({ ok: true, id });
          }

          const del = deleteParticipantSchema.safeParse(body);
          if (del.success) {
            await query(
              `update universe.elo_participants set is_deleted = true, updated_at = now() where id = $1`,
              [del.data.id],
            );
            await audit(actor.id, "elo.participant.deleted", "elo_participant", del.data.id);
            return Response.json({ ok: true });
          }

          const donation = donationSchema.safeParse(body);
          if (donation.success) {
            const { rows } = await query<{ id: string }>(
              `insert into universe.elo_donations(participant_id, amount, donation_date, payment_method, status, notes, created_by)
               values($1, $2, $3, $4, $5, nullif($6, ''), $7) returning id`,
              [
                donation.data.participantId,
                donation.data.amount,
                donation.data.donationDate,
                donation.data.paymentMethod,
                donation.data.status,
                donation.data.notes ?? "",
                actor.id,
              ],
            );
            await query(
              `insert into universe.elo_history(participant_id, action, notes, created_by) values($1, 'Nova doação registrada', $2, $3)`,
              [
                donation.data.participantId,
                `Valor: ${donation.data.amount} - ${donation.data.paymentMethod}`,
                actor.id,
              ],
            );
            await audit(actor.id, "elo.donation.created", "elo_donation", rows[0].id);
            return Response.json({ ok: true, id: rows[0].id });
          }

          const req = requestSchema.safeParse(body);
          if (req.success) {
            const { rows } = await query<{ id: string }>(
              `insert into universe.elo_requests(participant_id, title, description, status, priority, created_by)
               values($1, $2, $3, $4, $5, $6) returning id`,
              [
                req.data.participantId,
                req.data.title,
                req.data.description,
                req.data.status,
                req.data.priority,
                actor.id,
              ],
            );
            await query(
              `insert into universe.elo_history(participant_id, action, notes, created_by) values($1, 'Nova solicitação', $2, $3)`,
              [req.data.participantId, `Título: ${req.data.title}`, actor.id],
            );
            await audit(actor.id, "elo.request.created", "elo_request", rows[0].id);
            return Response.json({ ok: true, id: rows[0].id });
          }

          const note = noteSchema.safeParse(body);
          if (note.success) {
            const { rows } = await query<{ id: string }>(
              `insert into universe.elo_history(participant_id, action, notes, created_by)
               values($1, 'Observação adicionada', $2, $3) returning id`,
              [note.data.participantId, note.data.note, actor.id],
            );
            await audit(actor.id, "elo.history.created", "elo_history", rows[0].id);
            return Response.json({ ok: true });
          }

          const consent = consentSchema.safeParse(body);
          if (consent.success) {
            await query(
              `update universe.elo_participants set consent_text=$2, lgpd_accepted=$3, consent_at=now(), updated_at=now() where id=$1`,
              [consent.data.participantId, consent.data.consentText, consent.data.lgpdAccepted],
            );
            await query(
              `insert into universe.elo_history(participant_id, action, notes, created_by) values($1, 'Consentimento LGPD atualizado', null, $2)`,
              [consent.data.participantId, actor.id],
            );
            await audit(
              actor.id,
              "elo.participant.consent_updated",
              "elo_participant",
              consent.data.participantId,
            );
            return Response.json({ ok: true });
          }

          const assign = assignSchema.safeParse(body);
          if (assign.success) {
            await query(
              `update universe.elo_participants set assigned_to=$2, updated_at=now() where id=$1`,
              [assign.data.participantId, assign.data.userId],
            );
            await query(
              `insert into universe.elo_history(participant_id, action, notes, created_by) values($1, 'Responsável alterado', null, $2)`,
              [assign.data.participantId, actor.id],
            );
            await audit(
              actor.id,
              "elo.participant.assigned",
              "elo_participant",
              assign.data.participantId,
            );
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
