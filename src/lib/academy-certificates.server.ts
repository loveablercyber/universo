import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";

export type CertificateRecord = {
  id: string;
  enrollmentId: string;
  verificationCode: string;
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  workloadHours: number;
  completionPercentage: number;
  signatoryName: string;
  signatoryRole: string;
  issuedAt: string | Date;
  revokedAt?: string | Date | null;
  revocationReason?: string | null;
};

function newVerificationCode() {
  return randomBytes(16).toString("hex").toUpperCase();
}

function newCertificateNumber() {
  return `CS-${new Date().getUTCFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function syncEnrollmentCompletion(
  client: PoolClient,
  enrollmentId: string,
  issuedBy: string | null = null,
  restoreManualRevocation = false,
) {
  const eligibility = await client.query<{
    status: string;
    student_name: string;
    course_title: string;
    workload_hours: number;
    certificate_enabled: boolean;
    completion_percentage: number;
    certificate_signatory: string;
    certificate_signatory_role: string;
    total_lessons: number;
    completed_lessons: number;
  }>(
    `SELECT e.status,e.student_name,c.title as course_title,c.workload_hours,c.certificate_enabled,
            c.completion_percentage,c.certificate_signatory,c.certificate_signatory_role,
            (SELECT count(*)::int FROM universe.academy_lessons l JOIN universe.academy_modules m ON m.id=l.module_id
              WHERE m.course_id=e.course_id AND m.status='published' AND l.status='published') as total_lessons,
            (SELECT count(*)::int FROM universe.academy_student_progress p JOIN universe.academy_lessons l ON l.id=p.lesson_id
              JOIN universe.academy_modules m ON m.id=l.module_id
              WHERE p.enrollment_id=e.id AND p.completed AND m.course_id=e.course_id AND m.status='published' AND l.status='published') as completed_lessons
       FROM universe.academy_enrollments e JOIN universe.academy_courses c ON c.id=e.course_id
      WHERE e.id=$1 FOR UPDATE OF e`,
    [enrollmentId],
  );
  const row = eligibility.rows[0];
  if (!row) throw new Response("Matrícula não encontrada.", { status: 404 });
  const progressPercentage = row.total_lessons
    ? Math.floor((row.completed_lessons / row.total_lessons) * 100)
    : 0;
  const eligible =
    row.status !== "cancelled" &&
    row.status !== "pending" &&
    row.total_lessons > 0 &&
    progressPercentage >= row.completion_percentage;

  if (eligible) {
    await client.query(
      `UPDATE universe.academy_enrollments SET status='completed',completed_at=coalesce(completed_at,now()) WHERE id=$1`,
      [enrollmentId],
    );
    if (row.certificate_enabled) {
      await client.query(
        `INSERT INTO universe.academy_certificates
           (enrollment_id,verification_code,certificate_number,student_name,course_title,workload_hours,
            completion_percentage,signatory_name,signatory_role,issued_by,metadata)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
         ON CONFLICT(enrollment_id) DO UPDATE SET
           student_name=excluded.student_name,course_title=excluded.course_title,workload_hours=excluded.workload_hours,
           completion_percentage=excluded.completion_percentage,signatory_name=excluded.signatory_name,
           signatory_role=excluded.signatory_role,metadata=excluded.metadata,updated_at=now()`,
        [
          enrollmentId,
          newVerificationCode(),
          newCertificateNumber(),
          row.student_name,
          row.course_title,
          row.workload_hours,
          progressPercentage,
          row.certificate_signatory,
          row.certificate_signatory_role,
          issuedBy,
          JSON.stringify({
            totalLessons: row.total_lessons,
            completedLessons: row.completed_lessons,
          }),
        ],
      );
      await client.query(
        `UPDATE universe.academy_certificates SET revoked_at=NULL,revoked_by=NULL,revocation_reason=NULL,
           revocation_kind=NULL,updated_at=now()
         WHERE enrollment_id=$1 AND revoked_at IS NOT NULL AND (revocation_kind='progress' OR $2::boolean)`,
        [enrollmentId, restoreManualRevocation],
      );
    }
  } else {
    if (row.status === "completed") {
      await client.query(
        `UPDATE universe.academy_enrollments SET status='active',completed_at=NULL WHERE id=$1`,
        [enrollmentId],
      );
    }
    await client.query(
      `UPDATE universe.academy_certificates SET revoked_at=coalesce(revoked_at,now()),
         revocation_reason=coalesce(revocation_reason,'Critério de conclusão não atendido.'),
         revocation_kind=coalesce(revocation_kind,'progress'),updated_at=now()
       WHERE enrollment_id=$1 AND revoked_at IS NULL`,
      [enrollmentId],
    );
  }
  return {
    eligible,
    progressPercentage,
    totalLessons: row.total_lessons,
    completedLessons: row.completed_lessons,
  };
}
