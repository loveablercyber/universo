import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");
const backupDir = path.resolve(process.env.BACKUP_DIR || "backups");
const retentionDays = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS || 14));
await mkdir(backupDir, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-").replace(".000Z", "Z");
const target = path.join(backupDir, `universo-${stamp}.dump`);

await new Promise((resolve, reject) => {
  const child = spawn(
    "pg_dump",
    ["--format=custom", "--no-owner", "--no-acl", "--file", target, databaseUrl],
    { stdio: "inherit", shell: false },
  );
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`pg_dump terminou com código ${code}`)),
  );
});

const cutoff = Date.now() - retentionDays * 86400000;
for (const file of await readdir(backupDir)) {
  if (!/^universo-.+\.dump$/.test(file)) continue;
  const fullPath = path.join(backupDir, file);
  if ((await stat(fullPath)).mtimeMs < cutoff) await unlink(fullPath);
}
console.log(`Backup concluído: ${target}`);
