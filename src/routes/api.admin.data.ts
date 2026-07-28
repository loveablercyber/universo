import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requireAdmin } from "@/lib/auth.server";
import { query } from "@/lib/db.server";

const settingSchema = z.object({
  action: z.literal("save-setting"),
  key: z.string().min(2).max(80),
  value: z.unknown(),
});

const pageSchema = z.object({
  action: z.literal("save-page"),
  id: z.string().uuid(),
  title: z.string().min(2).max(160),
  status: z.enum(["draft", "published", "archived"]),
  content: z.record(z.string(), z.unknown()),
  seo: z.record(z.string(), z.unknown()).default({}),
});

const participantSchema = z.object({
  action: z.literal("save-participant"),
  id: z.string().uuid().optional(),
  kind: z.enum(["donor", "beneficiary", "volunteer", "partner"]),
  fullName: z.string().min(2).max(160),
  email: z.string().email().max(254).or(z.literal("")).optional(),
  phone: z.string().max(40).optional(),
  status: z.enum(["new", "reviewing", "approved", "active", "completed", "rejected"]),
  notes: z.string().max(5000).optional(),
});

const moduleSchema = z.object({
  action: z.literal("save-module"),
  key: z.enum(["site", "elo", "store", "academy"]),
  status: z.enum(["planned", "development", "active", "paused"]),
  baseUrl: z.string().url().or(z.literal("")).optional(),
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

export const Route = createFileRoute("/api/admin/data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdmin(request);
          const section = new URL(request.url).searchParams.get("section") ?? "overview";

          if (section === "settings") {
            const { rows } = await query(
              `select key, value, description, is_public as "isPublic", updated_at as "updatedAt"
                 from universe.settings order by key`,
            );
            return Response.json({ ok: true, settings: rows });
          }
          if (section === "pages") {
            const { rows } = await query(
              `select id, slug, title, status, content, seo, updated_at as "updatedAt"
                 from universe.cms_pages order by title`,
            );
            return Response.json({ ok: true, pages: rows });
          }
          if (section === "elo") {
            const { rows } = await query(
              `select id, kind, full_name as "fullName", email, phone, status, notes,
                      created_at as "createdAt", updated_at as "updatedAt"
                 from universe.elo_participants order by created_at desc limit 250`,
            );
            return Response.json({ ok: true, participants: rows });
          }
          if (section === "modules") {
            const { rows } = await query(
              `select key, name, description, status, base_url as "baseUrl",
                      updated_at as "updatedAt"
                 from universe.modules order by name`,
            );
            return Response.json({ ok: true, modules: rows });
          }
          if (section === "audit") {
            const { rows } = await query(
              `select a.id, a.action, a.entity_type as "entityType",
                      a.entity_id as "entityId", a.metadata,
                      a.created_at as "createdAt", u.full_name as "actorName"
                 from universe.audit_logs a
                 left join universe.users u on u.id=a.actor_id
                order by a.created_at desc limit 200`,
            );
            return Response.json({ ok: true, audit: rows });
          }
          return Response.json({ ok: false, message: "Seção inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const actor = await requireAdmin(request);
          const body = await request.json();

          const setting = settingSchema.safeParse(body);
          if (setting.success) {
            await query(
              `update universe.settings
                  set value=$2::jsonb, updated_by=$3, updated_at=now()
                where key=$1`,
              [setting.data.key, JSON.stringify(setting.data.value), actor.id],
            );
            await audit(actor.id, "setting.updated", "setting", setting.data.key);
            return Response.json({ ok: true });
          }

          const page = pageSchema.safeParse(body);
          if (page.success) {
            await query(
              `update universe.cms_pages
                  set title=$2, status=$3, content=$4::jsonb, seo=$5::jsonb,
                      published_at=case when $3='published' then coalesce(published_at, now()) else published_at end,
                      updated_by=$6, updated_at=now()
                where id=$1`,
              [
                page.data.id,
                page.data.title,
                page.data.status,
                JSON.stringify(page.data.content),
                JSON.stringify(page.data.seo),
                actor.id,
              ],
            );
            await audit(actor.id, "page.updated", "cms_page", page.data.id, {
              status: page.data.status,
            });
            return Response.json({ ok: true });
          }

          const participant = participantSchema.safeParse(body);
          if (participant.success) {
            const values = participant.data;
            const { rows } = await query<{ id: string }>(
              values.id
                ? `update universe.elo_participants
                      set kind=$2, full_name=$3, email=nullif($4, ''), phone=nullif($5, ''),
                          status=$6, notes=nullif($7, ''), assigned_to=$8, updated_at=now()
                    where id=$1 returning id`
                : `insert into universe.elo_participants
                     (kind, full_name, email, phone, status, notes, assigned_to)
                   values($2, $3, nullif($4, ''), nullif($5, ''), $6, nullif($7, ''), $8)
                   returning id`,
              [
                values.id ?? null,
                values.kind,
                values.fullName,
                values.email ?? "",
                values.phone ?? "",
                values.status,
                values.notes ?? "",
                actor.id,
              ],
            );
            const id = rows[0]?.id;
            if (!id)
              return Response.json(
                { ok: false, message: "Registro não encontrado." },
                { status: 404 },
              );
            await audit(
              actor.id,
              values.id ? "elo.updated" : "elo.created",
              "elo_participant",
              id,
              {
                kind: values.kind,
                status: values.status,
              },
            );
            return Response.json({ ok: true, id });
          }

          const moduleInput = moduleSchema.safeParse(body);
          if (moduleInput.success) {
            await query(
              `update universe.modules
                  set status=$2, base_url=nullif($3, ''), updated_by=$4, updated_at=now()
                where key=$1`,
              [
                moduleInput.data.key,
                moduleInput.data.status,
                moduleInput.data.baseUrl ?? "",
                actor.id,
              ],
            );
            await audit(actor.id, "module.updated", "module", moduleInput.data.key, {
              status: moduleInput.data.status,
            });
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
