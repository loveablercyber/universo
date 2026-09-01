import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("SumUp requires the explicit merchant configured for this production", async () => {
  const source = await readFile("src/lib/sumup.server.ts", "utf8");

  assert.match(source, /requireMerchantCode\(\)/);
  assert.match(source, /requireEnv\("SUMUP_MERCHANT_CODE"\)/);
  assert.match(source, /MERCHANT_CODE_PATTERN\.test\(code\)/);
  assert.match(source, /merchant_code: merchantCode/);
  assert.doesNotMatch(source, /\/v0\.1\/memberships/);
  assert.doesNotMatch(source, /using the API profile/);
});

test("SumUp failures distinguish configuration, authorization and connectivity", async () => {
  const source = await readFile("src/lib/sumup.server.ts", "utf8");

  assert.match(source, /response\.status === 401/);
  assert.match(source, /SUMUP_API_KEY recusada pela SumUp/);
  assert.match(source, /pagamentos online não estão habilitados/);
  assert.match(source, /Falha ao conectar à SumUp/);
  assert.match(source, /referência SumUp/);
  assert.match(source, /chave secreta e o código comercial precisam pertencer à mesma conta/);
});

test("the production template documents the shared SumUp callback for all products", async () => {
  const env = await readFile(".env.example", "utf8");

  assert.match(env, /^SUMUP_MERCHANT_CODE=MXXXXXXX$/m);
  assert.match(env, /^SUMUP_API_KEY=sup_sk_/m);
  assert.match(
    env,
    /^SUMUP_WEBHOOK_URL=https:\/\/loja\.carolsol\.com\.br\/api\/webhook\/sumup$/m,
  );
  assert.match(env, /^SUMUP_RETURN_URL=https:\/\/carolsol\.com\.br\/doacao\/retorno$/m);
  assert.match(env, /^SUMUP_STORE_RETURN_URL=https:\/\/loja\.carolsol\.com\.br\/pedido$/m);
  assert.match(env, /^SUMUP_ACADEMY_RETURN_URL=https:\/\/academy\.carolsol\.com\.br\/aluno$/m);
});
