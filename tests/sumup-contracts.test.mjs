import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("SumUp merchant resolution follows the official membership response", async () => {
  const source = await readFile("src/lib/sumup.server.ts", "utf8");

  assert.match(source, /membership\.resource_id \|\| resource\.id/);
  assert.match(source, /resourceType !== "merchant"/);
  assert.match(source, /membershipCodes\.includes\(configuredCode\)/);
  assert.match(source, /membershipCodes\.length === 1/);
  assert.match(source, /\/v1\/merchants\/\$\{encodeURIComponent\(code\)\}/);
  assert.doesNotMatch(
    source,
    /fetchMerchantCode\("\/v0\.1\/memberships\?kind=merchant&limit=25"\)/,
  );
});

test("SumUp failures distinguish an invalid secret from merchant association", async () => {
  const source = await readFile("src/lib/sumup.server.ts", "utf8");

  assert.match(source, /response\.status === 401/);
  assert.match(source, /SUMUP_API_KEY recusada pela SumUp/);
  assert.match(source, /não reconheceu uma conta comercial autorizada para esta chave/);
  assert.doesNotMatch(
    source,
    /if \(MERCHANT_CODE_PATTERN\.test\(configuredCode\)\) return configuredCode/,
  );
});
