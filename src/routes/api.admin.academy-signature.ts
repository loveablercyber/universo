import { createFileRoute } from "@tanstack/react-router";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query, withTransaction } from "@/lib/db.server";

const MAX_SIGNATURE_SIZE = 1024 * 1024;
const courseIdSchema = z.string().uuid();
const removeSchema = z.object({
  action: z.literal("remove"),
  courseId: z.string().uuid(),
});

function detectedMime(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png" as const;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg" as const;
  return null;
}

function readImageDimensions(bytes: Uint8Array, mime: "image/png" | "image/jpeg") {
  if (mime === "image/png") {
    if (bytes.length < 24) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 1 >= bytes.length) break;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += segmentLength;
  }
  return null;
}

async function validateImage(bytes: Uint8Array, mime: "image/png" | "image/jpeg") {
  const dimensions = readImageDimensions(bytes, mime);
  if (
    !dimensions ||
    dimensions.width < 80 ||
    dimensions.height < 20 ||
    dimensions.width > 10000 ||
    dimensions.height > 10000 ||
    dimensions.width * dimensions.height > 20_000_000
  )
    throw Response.json(
      {
        ok: false,
        message: "A assinatura deve ter entre 80×20 px e 20 megapixels.",
      },
      { status: 400 },
    );
  try {
    const document = await PDFDocument.create();
    if (mime === "image/png") await document.embedPng(bytes);
    else await document.embedJpg(bytes);
  } catch {
    throw Response.json(
      { ok: false, message: "A imagem da assinatura está corrompida ou é inválida." },
      { status: 400 },
    );
  }
}

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error("[Admin Academy Signature]", error);
  return Response.json(
    { ok: false, message: "Não foi possível atualizar a assinatura do certificado." },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/admin/academy-signature")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "academy.read");
          const parsedCourseId = courseIdSchema.safeParse(
            new URL(request.url).searchParams.get("courseId"),
          );
          if (!parsedCourseId.success) return new Response("Curso inválido.", { status: 400 });
          const result = await query<{ image: Buffer; mime: string }>(
            `SELECT certificate_signature_image as image,certificate_signature_mime as mime
               FROM universe.academy_courses
              WHERE id=$1 AND certificate_signature_image IS NOT NULL`,
            [parsedCourseId.data],
          );
          const signature = result.rows[0];
          if (!signature) return new Response("Assinatura não configurada.", { status: 404 });
          return new Response(signature.image, {
            headers: {
              "Content-Type": signature.mime,
              "Cache-Control": "private, no-store",
              "Content-Disposition": 'inline; filename="assinatura-certificado"',
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const actor = await requirePermission(request, "academy.write");
          const contentType = request.headers.get("content-type") ?? "";
          if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const parsedCourseId = courseIdSchema.safeParse(form.get("courseId"));
            const file = form.get("file");
            if (!parsedCourseId.success || !(file instanceof File))
              return Response.json(
                { ok: false, message: "Curso ou arquivo inválido." },
                { status: 400 },
              );
            if (file.size === 0 || file.size > MAX_SIGNATURE_SIZE)
              return Response.json(
                { ok: false, message: "A assinatura deve ter no máximo 1 MB." },
                { status: 400 },
              );
            const bytes = new Uint8Array(await file.arrayBuffer());
            const mime = detectedMime(bytes);
            if (!mime || (file.type && file.type !== mime))
              return Response.json(
                { ok: false, message: "Envie uma assinatura válida em PNG ou JPEG." },
                { status: 400 },
              );
            await validateImage(bytes, mime);
            await withTransaction(async (client) => {
              const updated = await client.query<{ id: string }>(
                `UPDATE universe.academy_courses
                    SET certificate_signature_image=$2,certificate_signature_mime=$3,
                        certificate_signature_file_name=$4,updated_at=now()
                  WHERE id=$1 RETURNING id`,
                [parsedCourseId.data, Buffer.from(bytes), mime, file.name.slice(0, 255)],
              );
              if (!updated.rowCount) throw new Response("Curso não encontrado.", { status: 404 });
              await client.query(
                `UPDATE universe.academy_certificates cert
                    SET signature_image=$2,signature_image_mime=$3,updated_at=now()
                   FROM universe.academy_enrollments enrollment
                  WHERE cert.enrollment_id=enrollment.id AND enrollment.course_id=$1
                    AND cert.signature_image IS NULL AND cert.revoked_at IS NULL`,
                [parsedCourseId.data, Buffer.from(bytes), mime],
              );
              await client.query(
                `INSERT INTO universe.audit_logs(actor_id,action,entity_type,entity_id,metadata)
                 VALUES($1,'academy.course.signature_uploaded','academy_course',$2,$3::jsonb)`,
                [
                  actor.id,
                  parsedCourseId.data,
                  JSON.stringify({ fileName: file.name.slice(0, 255), mime, size: file.size }),
                ],
              );
            });
            return Response.json({ ok: true });
          }

          const remove = removeSchema.safeParse(await request.json());
          if (!remove.success)
            return Response.json({ ok: false, message: "Dados inválidos." }, { status: 400 });
          await withTransaction(async (client) => {
            const updated = await client.query(
              `UPDATE universe.academy_courses
                  SET certificate_signature_image=NULL,certificate_signature_mime=NULL,
                      certificate_signature_file_name=NULL,updated_at=now()
                WHERE id=$1`,
              [remove.data.courseId],
            );
            if (!updated.rowCount) throw new Response("Curso não encontrado.", { status: 404 });
            await client.query(
              `INSERT INTO universe.audit_logs(actor_id,action,entity_type,entity_id)
               VALUES($1,'academy.course.signature_removed','academy_course',$2)`,
              [actor.id, remove.data.courseId],
            );
          });
          return Response.json({ ok: true });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
