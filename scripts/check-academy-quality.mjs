import process from "node:process";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não foi configurada.");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const checks = [];

async function countCheck(name, severity, sql) {
  const result = await pool.query(sql);
  const count = Number(result.rows[0]?.count ?? 0);
  checks.push({ name, severity, ok: count === 0, count });
}

try {
  const migrations = await pool.query(
    `SELECT filename FROM universe.schema_migrations
      WHERE filename=ANY($1::text[]) ORDER BY filename`,
    [
      [
        "018_academy_certificates.sql",
        "019_academy_certificate_signatures.sql",
        "020_academy_operations_quality.sql",
      ],
    ],
  );
  checks.push({
    name: "Migrações operacionais aplicadas",
    severity: "critical",
    ok: migrations.rowCount === 3,
    found: migrations.rows.map((row) => row.filename),
  });

  await countCheck(
    "Cursos ativos sem aulas publicadas",
    "critical",
    `SELECT count(*) FROM universe.academy_courses c
      WHERE c.status='active' AND NOT EXISTS (
        SELECT 1 FROM universe.academy_modules m JOIN universe.academy_lessons l ON l.module_id=m.id
         WHERE m.course_id=c.id AND m.status='published' AND l.status='published'
      )`,
  );
  await countCheck(
    "Aulas publicadas com dados inválidos",
    "critical",
    `SELECT count(*) FROM universe.academy_lessons
      WHERE status='published' AND (duration_minutes<=0 OR btrim(video_url)='')`,
  );
  await countCheck(
    "Progresso vinculado a outro curso",
    "critical",
    `SELECT count(*) FROM universe.academy_student_progress p
      JOIN universe.academy_enrollments e ON e.id=p.enrollment_id
      JOIN universe.academy_lessons l ON l.id=p.lesson_id
      JOIN universe.academy_modules m ON m.id=l.module_id
     WHERE m.course_id<>e.course_id`,
  );
  await countCheck(
    "Matrículas concluídas sem certificado",
    "critical",
    `SELECT count(*) FROM universe.academy_enrollments e
      JOIN universe.academy_courses c ON c.id=e.course_id
      LEFT JOIN universe.academy_certificates cert ON cert.enrollment_id=e.id
     WHERE e.status='completed' AND c.certificate_enabled AND cert.id IS NULL`,
  );
  await countCheck(
    "Certificados válidos de matrículas não concluídas",
    "critical",
    `SELECT count(*) FROM universe.academy_certificates cert
      JOIN universe.academy_enrollments e ON e.id=cert.enrollment_id
     WHERE cert.revoked_at IS NULL AND e.status<>'completed'`,
  );
  await countCheck(
    "Cursos com certificado sem assinatura visual",
    "warning",
    `SELECT count(*) FROM universe.academy_courses
      WHERE status='active' AND certificate_enabled AND certificate_signature_image IS NULL`,
  );
  await countCheck(
    "Matrículas pendentes há mais de 24 horas",
    "warning",
    `SELECT count(*) FROM universe.academy_enrollments
      WHERE status='pending' AND enrolled_at<now()-interval '24 hours'`,
  );

  const criticalFailures = checks.filter((check) => check.severity === "critical" && !check.ok);
  const warningFailures = checks.filter((check) => check.severity === "warning" && !check.ok);
  console.log(
    JSON.stringify(
      {
        ok: criticalFailures.length === 0,
        checkedAt: new Date().toISOString(),
        summary: {
          checks: checks.length,
          criticalFailures: criticalFailures.length,
          warnings: warningFailures.length,
        },
        checks,
      },
      null,
      2,
    ),
  );
  if (criticalFailures.length) process.exitCode = 1;
} finally {
  await pool.end();
}
