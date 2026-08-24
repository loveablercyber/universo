import { createFileRoute } from "@tanstack/react-router";
import { requirePermission } from "@/lib/auth.server";
import { query } from "@/lib/db.server";

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error("[Admin Academy Operations]", error);
  return Response.json(
    { ok: false, message: "Não foi possível carregar a operação da Academy." },
    { status: 503 },
  );
}

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvResponse(fileName: string, headers: string[], rows: unknown[][]) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  return new Response(`\uFEFF${content}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function dateFileName(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}

async function exportCsv(type: string) {
  if (type === "enrollments") {
    const { rows } = await query<{
      studentName: string;
      studentEmail: string;
      studentPhone: string | null;
      courseTitle: string;
      status: string;
      source: string;
      amountPaid: number;
      enrolledAt: string;
      completedAt: string | null;
      progressPercentage: number;
    }>(
      `WITH lesson_counts AS (
         SELECT m.course_id,count(*)::int total
           FROM universe.academy_lessons l JOIN universe.academy_modules m ON m.id=l.module_id
          WHERE m.status='published' AND l.status='published' GROUP BY m.course_id
       ), completed_counts AS (
         SELECT p.enrollment_id,count(*)::int completed
           FROM universe.academy_student_progress p
           JOIN universe.academy_lessons l ON l.id=p.lesson_id
           JOIN universe.academy_modules m ON m.id=l.module_id
          WHERE p.completed AND m.status='published' AND l.status='published' GROUP BY p.enrollment_id
       )
       SELECT e.student_name as "studentName",e.student_email as "studentEmail",e.student_phone as "studentPhone",
              concat_ws(' - ',c.title,c.subtitle) as "courseTitle",e.status,e.source,e.amount_paid::float as "amountPaid",
              e.enrolled_at as "enrolledAt",e.completed_at as "completedAt",
              CASE WHEN coalesce(lc.total,0)>0 THEN floor(coalesce(cc.completed,0)*100.0/lc.total)::int ELSE 0 END as "progressPercentage"
         FROM universe.academy_enrollments e JOIN universe.academy_courses c ON c.id=e.course_id
         LEFT JOIN lesson_counts lc ON lc.course_id=e.course_id
         LEFT JOIN completed_counts cc ON cc.enrollment_id=e.id
        ORDER BY e.enrolled_at DESC`,
    );
    return csvResponse(
      dateFileName("academy-matriculas"),
      [
        "Aluna",
        "E-mail",
        "Telefone",
        "Curso",
        "Situação",
        "Origem",
        "Valor pago",
        "Matrícula",
        "Conclusão",
        "Progresso (%)",
      ],
      rows.map((row) => [
        row.studentName,
        row.studentEmail,
        row.studentPhone,
        row.courseTitle,
        row.status,
        row.source,
        row.amountPaid.toFixed(2),
        row.enrolledAt,
        row.completedAt,
        row.progressPercentage,
      ]),
    );
  }
  if (type === "progress") {
    const { rows } = await query<{
      studentName: string;
      studentEmail: string;
      courseTitle: string;
      moduleTitle: string;
      lessonTitle: string;
      completedAt: string;
    }>(
      `SELECT e.student_name as "studentName",e.student_email as "studentEmail",
              concat_ws(' - ',c.title,c.subtitle) as "courseTitle",m.title as "moduleTitle",
              l.title as "lessonTitle",p.completed_at as "completedAt"
         FROM universe.academy_student_progress p
         JOIN universe.academy_enrollments e ON e.id=p.enrollment_id
         JOIN universe.academy_courses c ON c.id=e.course_id
         JOIN universe.academy_lessons l ON l.id=p.lesson_id
         JOIN universe.academy_modules m ON m.id=l.module_id
        WHERE p.completed ORDER BY p.completed_at DESC`,
    );
    return csvResponse(
      dateFileName("academy-progresso"),
      ["Aluna", "E-mail", "Curso", "Módulo", "Aula", "Concluída em"],
      rows.map((row) => [
        row.studentName,
        row.studentEmail,
        row.courseTitle,
        row.moduleTitle,
        row.lessonTitle,
        row.completedAt,
      ]),
    );
  }
  if (type === "certificates") {
    const { rows } = await query<{
      studentName: string;
      studentEmail: string;
      courseTitle: string;
      certificateNumber: string;
      verificationCode: string;
      issuedAt: string;
      status: string;
      revokedAt: string | null;
      revocationReason: string | null;
    }>(
      `SELECT cert.student_name as "studentName",e.student_email as "studentEmail",cert.course_title as "courseTitle",
              cert.certificate_number as "certificateNumber",cert.verification_code as "verificationCode",
              cert.issued_at as "issuedAt",CASE WHEN cert.revoked_at IS NULL THEN 'válido' ELSE 'revogado' END as status,
              cert.revoked_at as "revokedAt",cert.revocation_reason as "revocationReason"
         FROM universe.academy_certificates cert
         JOIN universe.academy_enrollments e ON e.id=cert.enrollment_id
        ORDER BY cert.issued_at DESC`,
    );
    return csvResponse(
      dateFileName("academy-certificados"),
      [
        "Aluna",
        "E-mail",
        "Curso",
        "Número",
        "Código de verificação",
        "Emissão",
        "Situação",
        "Revogação",
        "Motivo",
      ],
      rows.map((row) => [
        row.studentName,
        row.studentEmail,
        row.courseTitle,
        row.certificateNumber,
        row.verificationCode,
        row.issuedAt,
        row.status,
        row.revokedAt,
        row.revocationReason,
      ]),
    );
  }
  return Response.json({ ok: false, message: "Exportação inválida." }, { status: 400 });
}

export const Route = createFileRoute("/api/admin/academy-operations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "academy.read");
          const url = new URL(request.url);
          if (url.searchParams.get("action") === "export")
            return exportCsv(url.searchParams.get("type") ?? "");

          const [
            summary,
            coursePerformance,
            contentAlerts,
            pendingAlert,
            inactiveStudents,
            certificateAlerts,
            recentActivity,
          ] = await Promise.all([
            query<{
              activeCourses: number;
              draftCourses: number;
              publishedLessons: number;
              enrollments: number;
              activeEnrollments: number;
              pendingEnrollments: number;
              completedEnrollments: number;
              cancelledEnrollments: number;
              revenue: number;
              validCertificates: number;
              revokedCertificates: number;
            }>(
              `SELECT
                   (SELECT count(*)::int FROM universe.academy_courses WHERE status='active') as "activeCourses",
                   (SELECT count(*)::int FROM universe.academy_courses WHERE status='draft') as "draftCourses",
                   (SELECT count(*)::int FROM universe.academy_lessons l JOIN universe.academy_modules m ON m.id=l.module_id WHERE l.status='published' AND m.status='published') as "publishedLessons",
                   (SELECT count(*)::int FROM universe.academy_enrollments) as enrollments,
                   (SELECT count(*)::int FROM universe.academy_enrollments WHERE status='active') as "activeEnrollments",
                   (SELECT count(*)::int FROM universe.academy_enrollments WHERE status='pending') as "pendingEnrollments",
                   (SELECT count(*)::int FROM universe.academy_enrollments WHERE status='completed') as "completedEnrollments",
                   (SELECT count(*)::int FROM universe.academy_enrollments WHERE status='cancelled') as "cancelledEnrollments",
                   (SELECT coalesce(sum(amount_paid),0)::float FROM universe.academy_enrollments WHERE status IN ('active','completed')) as revenue,
                   (SELECT count(*)::int FROM universe.academy_certificates WHERE revoked_at IS NULL) as "validCertificates",
                   (SELECT count(*)::int FROM universe.academy_certificates WHERE revoked_at IS NOT NULL) as "revokedCertificates"`,
            ),
            query(
              `WITH lesson_counts AS (
                   SELECT m.course_id,count(*)::int total
                     FROM universe.academy_lessons l JOIN universe.academy_modules m ON m.id=l.module_id
                    WHERE m.status='published' AND l.status='published' GROUP BY m.course_id
                 ), completed_counts AS (
                   SELECT p.enrollment_id,count(*)::int completed
                     FROM universe.academy_student_progress p
                     JOIN universe.academy_lessons l ON l.id=p.lesson_id
                     JOIN universe.academy_modules m ON m.id=l.module_id
                    WHERE p.completed AND m.status='published' AND l.status='published' GROUP BY p.enrollment_id
                 )
                 SELECT c.id,concat_ws(' - ',c.title,c.subtitle) as title,c.status,
                        count(e.id)::int as enrollments,
                        count(e.id) filter (where e.status='completed')::int as completed,
                        coalesce(sum(e.amount_paid) filter (where e.status in ('active','completed')),0)::float as revenue,
                        coalesce(round(avg(CASE WHEN coalesce(lc.total,0)>0 THEN coalesce(cc.completed,0)*100.0/lc.total ELSE 0 END)),0)::int as "averageProgress"
                   FROM universe.academy_courses c
                   LEFT JOIN universe.academy_enrollments e ON e.course_id=c.id
                   LEFT JOIN lesson_counts lc ON lc.course_id=c.id
                   LEFT JOIN completed_counts cc ON cc.enrollment_id=e.id
                  GROUP BY c.id,lc.total ORDER BY enrollments DESC,c.created_at DESC`,
            ),
            query<{
              id: string;
              title: string;
              publishedLessons: number;
              certificateEnabled: boolean;
              signatureConfigured: boolean;
            }>(
              `SELECT c.id,concat_ws(' - ',c.title,c.subtitle) as title,
                        count(l.id) filter (where m.status='published' and l.status='published')::int as "publishedLessons",
                        c.certificate_enabled as "certificateEnabled",
                        (c.certificate_signature_image IS NOT NULL) as "signatureConfigured"
                   FROM universe.academy_courses c
                   LEFT JOIN universe.academy_modules m ON m.course_id=c.id
                   LEFT JOIN universe.academy_lessons l ON l.module_id=m.id
                  WHERE c.status='active' GROUP BY c.id
                 HAVING count(l.id) filter (where m.status='published' and l.status='published')=0
                     OR (c.certificate_enabled AND c.certificate_signature_image IS NULL)
                  ORDER BY c.title`,
            ),
            query<{ count: number; oldestAt: string | null }>(
              `SELECT count(*)::int as count,min(enrolled_at) as "oldestAt"
                   FROM universe.academy_enrollments WHERE status='pending' AND enrolled_at<now()-interval '24 hours'`,
            ),
            query(
              `SELECT e.id,e.student_name as "studentName",e.student_email as "studentEmail",
                        concat_ws(' - ',c.title,c.subtitle) as "courseTitle",
                        greatest(e.enrolled_at,coalesce(max(p.completed_at),e.enrolled_at)) as "lastActivityAt",
                        count(*) over()::int as "totalInactive"
                   FROM universe.academy_enrollments e JOIN universe.academy_courses c ON c.id=e.course_id
                   LEFT JOIN universe.academy_student_progress p ON p.enrollment_id=e.id AND p.completed
                  WHERE e.status='active' GROUP BY e.id,c.id
                 HAVING greatest(e.enrolled_at,coalesce(max(p.completed_at),e.enrolled_at))<now()-interval '14 days'
                  ORDER BY "lastActivityAt" LIMIT 20`,
            ),
            query(
              `SELECT e.id,e.student_name as "studentName",concat_ws(' - ',c.title,c.subtitle) as "courseTitle",
                      count(*) over()::int as "totalIssues"
                   FROM universe.academy_enrollments e JOIN universe.academy_courses c ON c.id=e.course_id
                   LEFT JOIN universe.academy_certificates cert ON cert.enrollment_id=e.id
                  WHERE e.status='completed' AND c.certificate_enabled AND cert.id IS NULL
                  ORDER BY e.completed_at LIMIT 20`,
            ),
            query(
              `SELECT a.id,a.action,a.entity_type as "entityType",a.entity_id as "entityId",
                        a.created_at as "createdAt",coalesce(u.full_name,'Sistema') as actor
                   FROM universe.audit_logs a LEFT JOIN universe.users u ON u.id=a.actor_id
                  WHERE a.action LIKE 'academy.%' ORDER BY a.created_at DESC LIMIT 20`,
            ),
          ]);

          const contentIssues = contentAlerts.rows.flatMap((course) => {
            const alerts: Array<{
              severity: "critical" | "warning";
              code: string;
              title: string;
              detail: string;
              entityId: string;
            }> = [];
            if (course.publishedLessons === 0)
              alerts.push({
                severity: "critical",
                code: "course_without_lessons",
                title: "Curso ativo sem aulas publicadas",
                detail: course.title,
                entityId: course.id,
              });
            if (course.certificateEnabled && !course.signatureConfigured)
              alerts.push({
                severity: "warning",
                code: "signature_missing",
                title: "Assinatura do certificado não configurada",
                detail: course.title,
                entityId: course.id,
              });
            return alerts;
          });
          const pending = pendingAlert.rows[0] ?? { count: 0, oldestAt: null };
          const inactiveCount = Number(inactiveStudents.rows[0]?.totalInactive ?? 0);
          const certificateIssueCount = Number(certificateAlerts.rows[0]?.totalIssues ?? 0);
          const alerts = [
            ...contentIssues,
            ...(pending.count
              ? [
                  {
                    severity: "warning" as const,
                    code: "pending_payments",
                    title: `${pending.count} matrícula(s) pendente(s) há mais de 24h`,
                    detail: pending.oldestAt
                      ? `Mais antiga: ${new Date(pending.oldestAt).toLocaleDateString("pt-BR")}`
                      : "Revisar pagamentos pendentes",
                  },
                ]
              : []),
            ...(inactiveCount
              ? [
                  {
                    severity: "warning" as const,
                    code: "inactive_students",
                    title: `${inactiveCount} aluna(s) sem atividade há 14 dias`,
                    detail: "Realizar contato de acompanhamento",
                  },
                ]
              : []),
            ...(certificateIssueCount
              ? [
                  {
                    severity: "critical" as const,
                    code: "certificate_missing",
                    title: `${certificateIssueCount} conclusão(ões) sem certificado`,
                    detail: "Revisar emissão automática",
                  },
                ]
              : []),
          ];
          const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
          return Response.json({
            ok: true,
            generatedAt: new Date().toISOString(),
            qualityStatus: criticalAlerts ? "critical" : alerts.length ? "attention" : "healthy",
            summary: summary.rows[0],
            alerts,
            inactiveStudents: inactiveStudents.rows,
            certificateIssues: certificateAlerts.rows,
            coursePerformance: coursePerformance.rows,
            recentActivity: recentActivity.rows,
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
