import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Elo donation confirmation is idempotent at database level", async () => {
  const migration = await source("database/021_elo_operations.sql");
  const donationApi = await source("src/routes/api.donation.ts");
  const webhook = await source("src/routes/api.webhook.sumup.ts");
  assert.match(migration, /unique index[\s\S]*elo_donations\(checkout_id\)/i);
  assert.match(donationApi, /on conflict \(checkout_id\) do nothing/i);
  assert.match(donationApi, /assertSameOrigin\(request\)/);
  assert.match(donationApi, /enforceEloPublicRateLimit\(request, "donation_checkout"\)/);
  assert.match(webhook, /on conflict \(checkout_id\) do nothing/i);
});

test("public Elo applications enter the CRM with consent, request and history", async () => {
  const api = await source("src/routes/api.elo.ts");
  const publicSecurity = await source("src/lib/elo.server.ts");
  const migration = await source("database/021_elo_operations.sql");
  assert.match(api, /eloPublicSubmissionSchema\.safeParse/);
  assert.match(api, /enforceEloPublicRateLimit/);
  assert.match(publicSecurity, /elo_public_submission_limits/);
  assert.match(api, /insert into universe\.elo_participants/i);
  assert.match(api, /insert into universe\.elo_requests/i);
  assert.match(api, /insert into universe\.elo_history/i);
  assert.match(migration, /source text not null default 'admin'/i);
});

test("admin Elo exposes every operational action used by the interface", async () => {
  const api = await source("src/routes/api.admin.elo.ts");
  const detail = await source("src/components/admin/EloParticipantDetail.tsx");
  for (const action of [
    "save-participant",
    "delete-participant",
    "save-donation",
    "update-donation",
    "save-request",
    "update-request",
    "add-note",
    "update-consent",
    "assign",
    "delete-attachment",
  ]) {
    assert.match(api, new RegExp(action));
    assert.match(detail, new RegExp(action));
  }
  assert.match(api, /multipart\/form-data/);
  assert.match(detail, /name="file"/);
  assert.match(api, /action === "attachment"/);
  assert.match(api, /await storage\.get/);
  assert.match(detail, /api\/admin\/elo\?action=attachment/);
});

test("public calls-to-action use real forms and transparency routes", async () => {
  const data = await source("src/data/elo-site.ts");
  const page = await source("src/routes/projeto-elo.tsx");
  assert.match(data, /projeto-elo\/participar\?tipo=hair_donation/);
  assert.match(data, /projeto-elo\/participar\?tipo=beneficiary_request/);
  assert.match(data, /projeto-elo\/participar\?tipo=volunteer/);
  assert.match(data, /projeto-elo\/transparencia/);
  assert.match(page, /function EloInternalLink/);
  assert.match(page, /<EloInternalLink\s+to=\{c\.href\}/);
});

test("Elo subdomain routes to the project instead of the portal home", async () => {
  const server = await source("src/server.ts");
  const home = await source("src/routes/index.tsx");
  assert.match(server, /ELO_HOSTNAME = "elo\.carolsol\.com\.br"/);
  assert.match(server, /url\.pathname = "\/projeto-elo"/);
  assert.match(home, /window\.location\.hostname === "elo\.carolsol\.com\.br"/);
  assert.match(home, /window\.location\.replace\(`\/projeto-elo/);
});
