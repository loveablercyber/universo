import process from "node:process";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não foi configurada.");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows } = await pool.query(
    `select current_database() as database,
            count(*)::int as users
       from universe.users`,
  );
  console.log(JSON.stringify({ ok: true, ...rows[0] }, null, 2));
} finally {
  await pool.end();
}
