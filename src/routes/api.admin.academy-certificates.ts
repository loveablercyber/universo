import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query, withTransaction } from "@/lib/db.server";
import { syncEnrollmentCompletion } from "@/lib/academy-certificates.server";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("issue"), enrollmentId: z.string().uuid() }),
  z.object({ action: z.literal("restore"), enrollmentId: z.string().uuid() }),
  z.object({
    action: z.literal("revoke"),
    certificateId: z.string().uuid(),
    reason: z.string().min(3).max(500),
  }),
]);

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error("[Admin Academy Certificates]", error);
  return Response.json(
    { ok: false, message: "Não foi possível concluir a operação do certificado." },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/admin/academy-certificates")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "academy.read");
          const { rows } = await query(
            `SELECT e.id as "enrollmentId",e.student_name as "studentName",e.student_email as "studentEmail",
                  e.status as "enrollmentStatus",c.title as "courseTitle",c.subtitle as "courseSubtitle",
                  c.certificate_enabled as "certificateEnabled",c.completion_percentage as "requiredPercentage",
                  coalesce(stats.total_lessons,0)::int as "totalLessons",coalesce(stats.completed_lessons,0)::int as "completedLessons",
                  CASE WHEN coalesce(stats.total_lessons,0)>0 THEN floor(stats.completed_lessons*100.0/stats.total_lessons)::int ELSE 0 END as "progressPercentage",
                  cert.id as "certificateId",cert.verification_code as "verificationCode",cert.certificate_number as "certificateNumber",
                  cert.issued_at as "issuedAt",cert.revoked_at as "revokedAt",cert.revocation_reason as "revocationReason"
             FROM universe.academy_enrollments e JOIN universe.academy_courses c ON c.id=e.course_id
             LEFT JOIN LATERAL (
               SELECT count(distinct l.id) filter (where m.status='published' and l.status='published') as total_lessons,
                      count(distinct p.lesson_id) filter (where p.completed and m.status='published' and l.status='published') as completed_lessons
                 FROM universe.academy_modules m JOIN universe.academy_lessons l ON l.module_id=m.id
                 LEFT JOIN universe.academy_student_progress p ON p.lesson_id=l.id AND p.enrollment_id=e.id
                WHERE m.course_id=e.course_id
             ) stats ON true
             LEFT JOIN universe.academy_certificates cert ON cert.enrollment_id=e.id
            WHERE e.status<>'cancelled' OR cert.id IS NOT NULL
            ORDER BY cert.issued_at DESC NULLS LAST,e.enrolled_at DESC LIMIT 500`,
          );
          return Response.json({ ok: true, certificates: rows });
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const actor = await requirePermission(request, "academy.write");
          const input = actionSchema.safeParse(await request.json());
          if (!input.success)
            return Response.json({ ok: false, message: "Dados inválidos." }, { status: 400 });
          if (input.data.action === "revoke") {
            await withTransaction(async (client) => {
              const updated = await client.query<{ id: string }>(
                `UPDATE universe.academy_certificates SET revoked_at=now(),revoked_by=$2,revocation_reason=$3,revocation_kind='manual',updated_at=now()
                WHERE id=$1 AND revoked_at IS NULL RETURNING id`,
                [input.data.certificateId, actor.id, input.data.reason],
              );
              if (!updated.rowCount)
                throw new Response("Certificado não encontrado ou já revogado.", { status: 404 });
              await client.query(
                `INSERT INTO universe.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'academy.certificate.revoked','academy_certificate',$2,$3::jsonb)`,
                [actor.id, input.data.certificateId, JSON.stringify({ reason: input.data.reason })],
              );
            });
            return Response.json({ ok: true });
          }
          const result = await withTransaction(async (client) => {
            const eligibility = await syncEnrollmentCompletion(
              client,
              input.data.enrollmentId,
              actor.id,
              input.data.action === "restore",
            );
            if (!eligibility.eligible)
              throw new Response("A aluna ainda não atingiu o critério de conclusão.", {
                status: 409,
              });
            const certificate = await client.query<{ id: string }>(
              `SELECT id FROM universe.academy_certificates WHERE enrollment_id=$1`,
              [input.data.enrollmentId],
            );
            if (!certificate.rowCount)
              throw new Response("A emissão de certificado está desativada para este curso.", {
                status: 409,
              });
            await client.query(
              `INSERT INTO universe.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'academy_certificate',$3,$4::jsonb)`,
              [
                actor.id,
                input.data.action === "restore"
                  ? "academy.certificate.restored"
                  : "academy.certificate.issued",
                certificate.rows[0].id,
                JSON.stringify(eligibility),
              ],
            );
            return certificate.rows[0].id;
          });
          return Response.json({ ok: true, id: result });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
