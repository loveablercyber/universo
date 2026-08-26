import process from "node:process";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não foi configurada.");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const checks = [];

async function countCheck(name, severity, sql) {
  const result = await pool.query(sql);
  const count = Number(result.rows[0]?.count || 0);
  checks.push({ name, severity, ok: count === 0, count });
}

try {
  const migration = await pool.query(
    `select 1 from universe.schema_migrations where filename='021_elo_operations.sql'`,
  );
  checks.push({
    name: "Migração operacional do Elo aplicada",
    severity: "critical",
    ok: Boolean(migration.rowCount),
  });

  await countCheck(
    "Checkouts pagos sem doação consolidada",
    "critical",
    `select count(*) from universe.elo_checkouts checkout
      where checkout.status='paid' and not exists (
        select 1 from universe.elo_donations donation where donation.checkout_id=checkout.id
      )`,
  );
  await countCheck(
    "Doações duplicadas para o mesmo checkout",
    "critical",
    `select count(*) from (
       select checkout_id from universe.elo_donations
        where checkout_id is not null group by checkout_id having count(*)>1
     ) duplicated`,
  );
  await countCheck(
    "Cadastros públicos sem consentimento",
    "critical",
    `select count(*) from universe.elo_participants
      where source='public_form' and (lgpd_accepted=false or consent_at is null)`,
  );
  await countCheck(
    "Cadastros públicos sem solicitação de triagem",
    "critical",
    `select count(*) from universe.elo_participants participant
      where participant.source='public_form' and participant.is_deleted=false
        and not exists (select 1 from universe.elo_requests request where request.participant_id=participant.id)`,
  );
  await countCheck(
    "Solicitações prioritárias sem responsável há mais de 48 horas",
    "warning",
    `select count(*) from universe.elo_requests request
      where request.status in ('open','in_progress') and request.priority in ('high','urgent')
        and request.assigned_to is null and request.created_at<now()-interval '48 hours'`,
  );
  await countCheck(
    "Participantes novos sem movimentação há mais de 7 dias",
    "warning",
    `select count(*) from universe.elo_participants
      where status='new' and is_deleted=false and created_at<now()-interval '7 days'`,
  );

  const critical = checks.filter((check) => check.severity === "critical" && !check.ok);
  const warnings = checks.filter((check) => check.severity === "warning" && !check.ok);
  console.log(
    JSON.stringify(
      {
        ok: critical.length === 0,
        checkedAt: new Date().toISOString(),
        summary: {
          checks: checks.length,
          criticalFailures: critical.length,
          warnings: warnings.length,
        },
        checks,
      },
      null,
      2,
    ),
  );
  if (critical.length) process.exitCode = 1;
} finally {
  await pool.end();
}
