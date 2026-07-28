import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não foi configurada.");
}

const pool = new Pool({ connectionString });

try {
  const migrationFiles = (await fs.readdir(path.join(root, "database")))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  for (const migrationFile of migrationFiles) {
    const migration = await fs.readFile(path.join(root, "database", migrationFile), "utf8");
    await pool.query(migration);
    console.log(`Migração aplicada: ${migrationFile}`);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || "Carol Sol";

  if (email && password) {
    if (password.length < 12) {
      throw new Error("ADMIN_PASSWORD precisa ter pelo menos 12 caracteres.");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      `insert into universe.users(email, password_hash, full_name, role)
       values($1, $2, $3, 'admin')
       on conflict (lower(email)) where status <> 'deleted'
       do update set password_hash=excluded.password_hash,
                     full_name=excluded.full_name,
                     role='admin',
                     status='active',
                     updated_at=now()`,
      [email, passwordHash, fullName],
    );
    console.log(`Administrador preparado: ${email}`);
  } else {
    console.log(
      "Migração aplicada. Administrador não criado: defina ADMIN_EMAIL e ADMIN_PASSWORD.",
    );
  }
} finally {
  await pool.end();
}
