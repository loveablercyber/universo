import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const databaseUrl = process.env.DATABASE_URL;
const backupFile = process.argv[2] ? path.resolve(process.argv[2]) : "";
if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");
if (!backupFile) throw new Error("Informe o arquivo: npm run db:restore -- caminho/backup.dump");
if (process.env.CONFIRM_DATABASE_RESTORE !== "RESTAURAR_UNIVERSO")
  throw new Error("Defina CONFIRM_DATABASE_RESTORE=RESTAURAR_UNIVERSO para confirmar.");
await access(backupFile);

await new Promise((resolve, reject) => {
  const child = spawn(
    "pg_restore",
    ["--clean", "--if-exists", "--no-owner", "--no-acl", "--dbname", databaseUrl, backupFile],
    { stdio: "inherit", shell: false },
  );
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`pg_restore terminou com código ${code}`)),
  );
});
console.log("Restauração concluída.");
