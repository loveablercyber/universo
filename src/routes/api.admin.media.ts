import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requireAdmin } from "@/lib/auth.server";
import { query, requireDatabase } from "@/lib/db.server";
import { storage } from "@/lib/storage.server";

const MAX_FILE_SIZE = (Number(process.env.UPLOAD_MAX_SIZE_MB) || 5) * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];

const deleteMediaSchema = z.object({
  action: z.literal("delete-media"),
  id: z.string().uuid(),
});

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  return Response.json({ ok: false, message: "Operação de mídia falhou." }, { status: 503 });
}

export const Route = createFileRoute("/api/admin/media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdmin(request);
          const { rows } = await query(
            `select id, file_name as "fileName", storage_key as "storageKey",
                    public_url as "publicUrl", mime_type as "mimeType",
                    size_bytes as "sizeBytes", title, alt_text as "altText",
                    created_at as "createdAt"
               from universe.media
              order by created_at desc limit 100`,
          );
          return Response.json({ ok: true, media: rows });
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const actor = await requireAdmin(request);
          const contentType = request.headers.get("content-type") || "";

          // 1. Processar Upload de Arquivo (multipart/form-data)
          if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file") as File | null;
            const title = (formData.get("title") as string) || "";
            const altText = (formData.get("altText") as string) || "";

            if (!file) {
              return Response.json(
                { ok: false, message: "Nenhum arquivo enviado." },
                { status: 400 },
              );
            }

            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
              return Response.json(
                {
                  ok: false,
                  message: "Formato de arquivo não suportado. Use JPG, PNG, WEBP, SVG ou GIF.",
                },
                { status: 400 },
              );
            }

            if (file.size > MAX_FILE_SIZE) {
              return Response.json(
                {
                  ok: false,
                  message: `Tamanho excede o limite máximo de ${process.env.UPLOAD_MAX_SIZE_MB || 5}MB.`,
                },
                { status: 400 },
              );
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { storageKey, publicUrl } = await storage.put(file.name, buffer, file.type);
            const driverName = process.env.STORAGE_DRIVER || "local";
            const client = await requireDatabase().connect();
            try {
              await client.query("BEGIN");
              const { rows } = await client.query<{ id: string }>(
                `insert into universe.media(file_name, storage_key, public_url, mime_type, size_bytes, title, alt_text, uploaded_by, storage_driver)
                 values($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
                [
                  file.name,
                  storageKey,
                  publicUrl,
                  file.type,
                  file.size,
                  title,
                  altText,
                  actor.id,
                  driverName,
                ],
              );
              await client.query(
                `insert into universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
                 values($1, 'media.uploaded', 'media', $2, $3::jsonb)`,
                [actor.id, rows[0].id, JSON.stringify({ fileName: file.name, size: file.size })],
              );
              await client.query("COMMIT");
              return Response.json({ ok: true, mediaId: rows[0].id, publicUrl });
            } catch (error) {
              await client.query("ROLLBACK");
              await storage.delete(storageKey);
              throw error;
            } finally {
              client.release();
            }
          }

          // 2. Ações JSON (exclusão, atualização de altText)
          const body = await request.json();
          const deleteInput = deleteMediaSchema.safeParse(body);

          if (deleteInput.success) {
            const { id } = deleteInput.data;
            const { rows } = await query<{ storage_key: string; public_url: string }>(
              `select storage_key, public_url from universe.media where id = $1`,
              [id],
            );

            if (rows.length > 0) {
              const usage = await query<{ count: number }>(
                `select (
                   (select count(*) from universe.store_products p where p.image_url=$1 or p.images @> to_jsonb(array[$1]::text[])) +
                   (select count(*) from universe.store_product_variants v where v.image_url=$1 or v.images @> to_jsonb(array[$1]::text[])) +
                   (select count(*) from universe.settings s where s.value::text like '%' || $1 || '%')
                 )::int as count`,
                [rows[0].public_url],
              );
              if ((usage.rows[0]?.count || 0) > 0)
                return Response.json(
                  {
                    ok: false,
                    message:
                      "Esta imagem está em uso por produto, variação ou configuração e não pode ser excluída.",
                  },
                  { status: 409 },
                );
              await storage.delete(rows[0].storage_key);
              await query(`delete from universe.media where id = $1`, [id]);
              await query(
                `insert into universe.audit_logs(actor_id, action, entity_type, entity_id)
                 values($1, 'media.deleted', 'media', $2)`,
                [actor.id, id],
              );
            }

            return Response.json({ ok: true });
          }

          return Response.json(
            { ok: false, message: "Requisição de mídia inválida." },
            { status: 400 },
          );
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
