import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requireAdmin } from "@/lib/auth.server";
import { query } from "@/lib/db.server";
import { defaultCmsPages } from "@/data/cms-defaults";

const pageSaveSchema = z.object({
  action: z.literal("save-page"),
  id: z.string().uuid(),
  title: z.string().min(2).max(160),
  status: z.enum(["draft", "published", "archived"]),
  content: z.object({
    sections: z.array(z.record(z.string(), z.unknown())),
  }),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.string().optional(),
      ogImage: z.string().optional(),
    })
    .default({}),
});

const pageRestoreSchema = z.object({
  action: z.literal("restore-version"),
  pageId: z.string().uuid(),
  versionId: z.coerce.number(),
});

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  return Response.json(
    { ok: false, message: "Não foi possível concluir a operação no CMS." },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/admin/cms")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdmin(request);
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "pages";
          const pageId = url.searchParams.get("pageId");

          if (action === "versions" && pageId) {
            const { rows } = await query(
              `select v.id, v.version, v.title, v.status, v.created_at as "createdAt",
                      u.full_name as "authorName"
                 from universe.cms_page_versions v
                 left join universe.users u on u.id = v.created_by
                where v.page_id = $1
                order by v.version desc limit 50`,
              [pageId],
            );
            return Response.json({ ok: true, versions: rows });
          }

          const { rows } = await query(
            `select id, slug, title, status, content, seo, updated_at as "updatedAt"
               from universe.cms_pages order by title`,
          );
          const pages = rows.map((page) => {
            const fallback = defaultCmsPages[String(page.slug)];
            const content = page.content as { sections?: unknown[] } | null;
            return {
              ...page,
              content: content?.sections?.length || !fallback ? page.content : fallback.content,
              seo: {
                ...(fallback?.seo ?? {}),
                ...((page.seo as Record<string, unknown>) ?? {}),
              },
            };
          });
          return Response.json({ ok: true, pages });
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const actor = await requireAdmin(request);
          const body = await request.json();

          const saveInput = pageSaveSchema.safeParse(body);
          if (saveInput.success) {
            const { id, title, status, content, seo } = saveInput.data;

            // 1. Atualizar página atual
            await query(
              `update universe.cms_pages
                  set title = $2, status = $3, content = $4::jsonb, seo = $5::jsonb,
                      published_at = case when $3 = 'published' then coalesce(published_at, now()) else published_at end,
                      updated_by = $6, updated_at = now()
                where id = $1`,
              [id, title, status, JSON.stringify(content), JSON.stringify(seo), actor.id],
            );

            // 2. Calcular número da nova versão
            const { rows: versionRows } = await query<{ next_ver: number }>(
              `select coalesce(max(version), 0) + 1 as next_ver from universe.cms_page_versions where page_id = $1`,
              [id],
            );
            const nextVersion = versionRows[0]?.next_ver || 1;

            // 3. Criar registro de histórico (Snapshot)
            await query(
              `insert into universe.cms_page_versions(page_id, version, title, content, seo, status, created_by)
               values($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`,
              [
                id,
                nextVersion,
                title,
                JSON.stringify(content),
                JSON.stringify(seo),
                status,
                actor.id,
              ],
            );

            // 4. Audit Log
            await query(
              `insert into universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
               values($1, 'cms.version_saved', 'cms_page', $2, $3::jsonb)`,
              [actor.id, id, JSON.stringify({ version: nextVersion, status })],
            );

            return Response.json({ ok: true, version: nextVersion });
          }

          const restoreInput = pageRestoreSchema.safeParse(body);
          if (restoreInput.success) {
            const { pageId, versionId } = restoreInput.data;

            const { rows: ver } = await query<{
              title: string;
              content: unknown;
              seo: unknown;
              status: string;
            }>(
              `select title, content, seo, status from universe.cms_page_versions where page_id = $1 and version = $2`,
              [pageId, versionId],
            );

            if (!ver.length) {
              return Response.json(
                { ok: false, message: "Versão não encontrada." },
                { status: 404 },
              );
            }

            const target = ver[0];
            await query(
              `update universe.cms_pages
                  set title = $2, content = $3::jsonb, seo = $4::jsonb, status = $5,
                      updated_by = $6, updated_at = now()
                where id = $1`,
              [
                pageId,
                target.title,
                JSON.stringify(target.content),
                JSON.stringify(target.seo),
                target.status,
                actor.id,
              ],
            );

            await query(
              `insert into universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
               values($1, 'cms.version_restored', 'cms_page', $2, $3::jsonb)`,
              [actor.id, pageId, JSON.stringify({ restoredVersion: versionId })],
            );

            return Response.json({ ok: true });
          }

          return Response.json({ ok: false, message: "Ação CMS inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
