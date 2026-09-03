import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const auth = await readFile(new URL("../src/lib/auth.server.ts", import.meta.url), "utf8");
const api = await readFile(new URL("../src/routes/api.auth.ts", import.meta.url), "utf8");
const migration = await readFile(
  new URL("../database/022_unified_identity.sql", import.meta.url),
  "utf8",
);
const setup = await readFile(new URL("../scripts/db-setup.mjs", import.meta.url), "utf8");

test("SSO mantém cookies restritos ao host", () => {
  assert.doesNotMatch(auth, /Domain=/);
  assert.match(auth, /HttpOnly/);
  assert.match(auth, /SameSite=Lax/);
  assert.match(auth, /Secure/);
});

test("código SSO é temporário, vinculado ao destino e consumido uma única vez", () => {
  assert.match(auth, /hashToken\(code\)/);
  assert.match(auth, /interval '60 seconds'/);
  assert.match(auth, /target_origin=\$2/);
  assert.match(auth, /used_at is null/);
  assert.match(auth, /set used_at=now\(\)/);
  assert.match(api, /Cache-Control.*no-store/);
});

test("migração vincula a identidade sem substituir permissões de módulo", () => {
  assert.match(migration, /identity_user_id uuid/);
  assert.match(migration, /lower\(universe_user\.email\)=lower\(identity_user\.email\)/);
  assert.match(migration, /carolsol_sso_codes/);
  assert.doesNotMatch(migration, /Domain=/);
});

test("db setup nunca redefine a senha de administrador existente", () => {
  assert.match(setup, /Administrador já existe/);
  assert.match(setup, /senha do painel foi preservada/);
  assert.doesNotMatch(setup, /do update set password_hash=excluded\.password_hash/);
});

test("erros de autenticação das APIs mantêm contrato JSON", () => {
  assert.match(auth, /Response\.json\(/);
  assert.match(auth, /reauthenticationRequired: status === 401/);
  assert.match(auth, /Sua sessão expirou\. Entre novamente para continuar\./);
  assert.doesNotMatch(auth, /throw new Response\("Autenticação necessária\./);
});

test("JWT configurado não invalida a sessão local quando os bancos são separados", () => {
  assert.match(auth, /token\.split\("\."\)\.length === 3/);
  assert.match(auth, /const sharedToken = cookieValue\(request, SHARED_COOKIE_NAME\)/);
  assert.match(auth, /const token = cookieValue\(request, LEGACY_COOKIE_NAME\)/);
  assert.doesNotMatch(auth, /if \(secret\) \{\s*const token = cookieValue\(request, SHARED_COOKIE_NAME\);\s*if \(!token\) return null/);
});
