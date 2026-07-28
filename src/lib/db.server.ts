import { createHash } from "node:crypto";
import pg, { type QueryResultRow } from "pg";

const { Pool } = pg;

declare global {
  var __universoCarolSolPool: pg.Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  return new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX || 5),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 20_000,
  });
}

export const db = globalThis.__universoCarolSolPool ?? createPool();
if (process.env.NODE_ENV !== "production" && db) globalThis.__universoCarolSolPool = db;

export function requireDatabase() {
  if (!db) throw new Error("DATABASE_URL não foi configurada.");
  return db;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return requireDatabase().query<T>(text, values);
}

export async function checkDatabase() {
  if (!db) return { configured: false, connected: false };
  try {
    await db.query("select 1");
    return { configured: true, connected: true };
  } catch {
    return { configured: true, connected: false };
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
