import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query } from "@/lib/db.server";
import { storage } from "@/lib/storage.server";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ATTACHMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

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
  donationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  paymentMethod: z.string().min(2).max(50),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  notes: z.string().max(1000).optional(),
});

const updateDonationSchema = z.object({
  action: z.literal("update-donation"),
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
});

const requestSchema = z.object({
  action: z.literal("save-request"),
  participantId: z.string().uuid(),
  title: z.string().min(2).max(100),
  description: z.string().min(2).max(2000),
  status: z.enum(["open", "in_progress", "resolved", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

const updateRequestSchema = z.object({
  action: z.literal("update-request"),
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

const deleteAttachmentSchema = z.object({
  action: z.literal("delete-attachment"),
  id: z.string().uuid(),
  participantId: z.string().uuid(),
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

          if (action === "attachment") {
            const id = z.string().uuid().safeParse(url.searchParams.get("id"));
            if (!id.success) {
              return Response.json({ ok: false, message: "Anexo inválido." }, { status: 400 });
            }
            const result = await query<{
              storageKey: string;
              fileName: string;
              mimeType: string;
            }>(
              `select storage_key as "storageKey",file_name as "fileName",mime_type as "mimeType"
                 from universe.elo_attachments
                where id=$1`,
              [id.data],
            );
            const attachment = result.rows[0];
            if (!attachment) {
              return Response.json(
                { ok: false, message: "Anexo não encontrado." },
                { status: 404 },
              );
            }
            const file = await storage.get(attachment.storageKey);
            const encodedName = encodeURIComponent(attachment.fileName);
            return new Response(file, {
              headers: {
                "Content-Type": attachment.mimeType,
                "Content-Length": String(file.byteLength),
                "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
              },
            });
          }

          if (action === "list") {
            const kind = url.searchParams.get("kind");
            const status = url.searchParams.get("status");
            const search = url.searchParams.get("search");

            let sql = `select p.id, p.kind, p.full_name as "fullName", p.email, p.phone, p.status,
                              p.public_reference as "publicReference",p.created_at as "createdAt",
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
              sql += ` and (p.full_name ilike $${params.length} or p.email ilike $${params.length}
                            or p.phone ilike $${params.length} or p.public_reference ilike $${params.length})`;
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
                        p.assigned_to as "assignedTo", assignee.full_name as "assignedToName",
                        p.public_reference as "publicReference",p.source,p.metadata,
                        p.created_at as "createdAt", p.updated_at as "updatedAt"
                   from universe.elo_participants p
                   left join universe.users assignee on assignee.id=p.assigned_to
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
                `select request.id,request.title,request.description,request.status,request.priority,
                        request.assigned_to as "assignedTo",assignee.full_name as "assignedToName",
                        request.created_at as "createdAt",request.updated_at as "updatedAt"
                   from universe.elo_requests request
                   left join universe.users assignee on assignee.id=request.assigned_to
                  where request.participant_id = $1
                  order by request.created_at desc`,
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
            const [counts, donationTotal, operations] = await Promise.all([
              query(
                `select kind, count(*) from universe.elo_participants where is_deleted = false group by kind`,
              ),
              query(
                `select sum(amount) as total from universe.elo_donations where status = 'completed'`,
              ),
              query(
                `select
                   count(*) filter(where status in ('open','in_progress'))::int as "openRequests",
                   count(*) filter(where status in ('open','in_progress') and priority='urgent')::int as "urgentRequests",
                   (select count(*)::int from universe.elo_checkouts where status='pending') as "pendingCheckouts"
                 from universe.elo_requests`,
              ),
            ]);

            const stats = {
              donors: 0,
              beneficiaries: 0,
              volunteers: 0,
              partners: 0,
              totalDonations: Number(donationTotal.rows[0]?.total || 0),
              openRequests: Number(operations.rows[0]?.openRequests || 0),
              urgentRequests: Number(operations.rows[0]?.urgentRequests || 0),
              pendingCheckouts: Number(operations.rows[0]?.pendingCheckouts || 0),
            };

            for (const row of counts.rows) {
              if (row.kind === "donor") stats.donors = Number(row.count);
              else if (row.kind === "beneficiary") stats.beneficiaries = Number(row.count);
              else if (row.kind === "volunteer") stats.volunteers = Number(row.count);
              else if (row.kind === "partner") stats.partners = Number(row.count);
            }

            return Response.json({ ok: true, stats });
          }

          if (action === "assignees") {
            const { rows } = await query(
              `select id,full_name as "fullName",role
                 from universe.users
                where status='active' and role in ('admin','manager','operator')
                order by full_name asc`,
            );
            return Response.json({ ok: true, assignees: rows });
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
          const contentType = request.headers.get("content-type") || "";

          if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const participantId = z.string().uuid().safeParse(form.get("participantId"));
            const file = form.get("file");
            if (!participantId.success || !(file instanceof File)) {
              return Response.json(
                { ok: false, message: "Participante ou arquivo inválido." },
                { status: 400 },
              );
            }
            if (!ATTACHMENT_MIME_TYPES.includes(file.type)) {
              return Response.json(
                { ok: false, message: "Use PDF, JPG, PNG ou WEBP." },
                { status: 400 },
              );
            }
            if (file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE) {
              return Response.json(
                { ok: false, message: "O arquivo deve ter até 10 MB." },
                { status: 400 },
              );
            }

            const stored = await storage.put(
              file.name,
              Buffer.from(await file.arrayBuffer()),
              file.type,
            );
            try {
              const result = await query<{ id: string }>(
                `insert into universe.elo_attachments(
                   participant_id,file_name,storage_key,public_url,mime_type,size_bytes,uploaded_by
                 )
                 select id,$2,$3,$4,$5,$6,$7
                   from universe.elo_participants
                  where id=$1 and is_deleted=false
                 returning id`,
                [
                  participantId.data,
                  file.name,
                  stored.storageKey,
                  stored.publicUrl,
                  file.type,
                  file.size,
                  actor.id,
                ],
              );
              if (!result.rowCount) {
                await storage.delete(stored.storageKey);
                return Response.json(
                  { ok: false, message: "Participante não encontrado." },
                  { status: 404 },
                );
              }
              await query(
                `insert into universe.elo_history(participant_id,action,notes,created_by)
                 values($1,'Anexo adicionado',$2,$3)`,
                [participantId.data, file.name, actor.id],
              );
              await audit(actor.id, "elo.attachment.created", "elo_attachment", result.rows[0].id, {
                participantId: participantId.data,
                fileName: file.name,
              });
              return Response.json({
                ok: true,
                id: result.rows[0].id,
                publicUrl: stored.publicUrl,
              });
            } catch (error) {
              await storage.delete(stored.storageKey);
              throw error;
            }
          }

          const body = await request.json();

          const participant = participantSchema.safeParse(body);
          if (participant.success) {
            const values = participant.data;
            let id = values.id;

            if (id) {
              const updated = await query(
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
              if (!updated.rowCount) id = undefined;
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

          const donationUpdate = updateDonationSchema.safeParse(body);
          if (donationUpdate.success) {
            const result = await query(
              `update universe.elo_donations
                  set status=$3,updated_at=now()
                where id=$1 and participant_id=$2
                returning id`,
              [
                donationUpdate.data.id,
                donationUpdate.data.participantId,
                donationUpdate.data.status,
              ],
            );
            if (!result.rowCount) {
              return Response.json(
                { ok: false, message: "Doação não encontrada." },
                { status: 404 },
              );
            }
            await query(
              `insert into universe.elo_history(participant_id,action,notes,created_by)
               values($1,'Status da doação atualizado',$2,$3)`,
              [donationUpdate.data.participantId, donationUpdate.data.status, actor.id],
            );
            await audit(actor.id, "elo.donation.updated", "elo_donation", donationUpdate.data.id, {
              status: donationUpdate.data.status,
            });
            return Response.json({ ok: true });
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

          const requestUpdate = updateRequestSchema.safeParse(body);
          if (requestUpdate.success) {
            const result = await query(
              `update universe.elo_requests
                  set status=$3,priority=$4,updated_at=now()
                where id=$1 and participant_id=$2
                returning id`,
              [
                requestUpdate.data.id,
                requestUpdate.data.participantId,
                requestUpdate.data.status,
                requestUpdate.data.priority,
              ],
            );
            if (!result.rowCount) {
              return Response.json(
                { ok: false, message: "Solicitação não encontrada." },
                { status: 404 },
              );
            }
            await query(
              `insert into universe.elo_history(participant_id,action,notes,created_by)
               values($1,'Solicitação atualizada',$2,$3)`,
              [
                requestUpdate.data.participantId,
                `${requestUpdate.data.status} / ${requestUpdate.data.priority}`,
                actor.id,
              ],
            );
            await audit(actor.id, "elo.request.updated", "elo_request", requestUpdate.data.id, {
              status: requestUpdate.data.status,
              priority: requestUpdate.data.priority,
            });
            return Response.json({ ok: true });
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

          const attachmentDelete = deleteAttachmentSchema.safeParse(body);
          if (attachmentDelete.success) {
            const attachment = await query<{ storage_key: string }>(
              `delete from universe.elo_attachments
                where id=$1 and participant_id=$2
                returning storage_key`,
              [attachmentDelete.data.id, attachmentDelete.data.participantId],
            );
            if (!attachment.rowCount) {
              return Response.json(
                { ok: false, message: "Anexo não encontrado." },
                { status: 404 },
              );
            }
            await storage.delete(attachment.rows[0].storage_key);
            await query(
              `insert into universe.elo_history(participant_id,action,notes,created_by)
               values($1,'Anexo removido',null,$2)`,
              [attachmentDelete.data.participantId, actor.id],
            );
            await audit(
              actor.id,
              "elo.attachment.deleted",
              "elo_attachment",
              attachmentDelete.data.id,
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
