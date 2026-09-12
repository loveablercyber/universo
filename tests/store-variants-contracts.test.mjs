import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("checkout requires a real variant and persists its historical snapshot", async () => {
  const api = await source("src/routes/api.store.ts");
  const migration = await source("database/027_store_variant_integrity.sql");
  assert.match(api, /product\.has_variants && !item\.variantId/);
  assert.match(api, /SELECT id, title,[\s\S]*sku, color, length_cm, weight_g, image_url, images/);
  for (const column of [
    "variant_sku",
    "variant_color",
    "variant_length_cm",
    "variant_weight_g",
    "image_url",
  ]) {
    assert.match(api, new RegExp(column));
    assert.match(migration, new RegExp(column));
  }
});

test("variant inventory is authoritative and cart quantities are clamped", async () => {
  const api = await source("src/routes/api.store.ts");
  const store = await source("src/hooks/use-store.ts");
  assert.match(api, /FOR UPDATE/);
  assert.match(api, /stock_quantity = stock_quantity - \$1/);
  assert.match(api, /variant\.stock_quantity < item\.qty/);
  assert.match(store, /Math\.min\(updated\[existingIdx\]\.qty \+ requested, available\)/);
  assert.match(store, /qty: Math\.min\(qty, available\)/);
});

test("product page uses one gallery and attribute selectors without color cards", async () => {
  const page = await source("src/routes/sol-hair-closet.produto.$slug.tsx");
  assert.match(page, /variantImages\.length[\s\S]*product\.images/);
  assert.match(page, /<select[\s\S]*Selecione a cor/);
  assert.match(page, /sizeOptions\.length <= 5/);
  assert.match(page, /hasVariants && !selectedVariant/);
  assert.doesNotMatch(page, /Opção selecionada:/);
  assert.doesNotMatch(page, /product\.reviews \|\| 120/);
});

test("admin edits variants in place, soft-deactivates removed rows and rejects duplicates", async () => {
  const api = await source("src/routes/api.admin.store.ts");
  const admin = await source("src/components/admin/StoreManager.tsx");
  const migration = await source("database/027_store_variant_integrity.sql");
  assert.match(
    api,
    /UPDATE universe\.store_product_variants[\s\S]*WHERE id = \$14 AND product_id = \$15/,
  );
  assert.match(api, /SET status='inactive'[\s\S]*NOT \(id=ANY/);
  assert.match(admin, /Gerar combinações/);
  assert.match(admin, /SKU único/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS universe_store_variants_sku_uidx/);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS universe_store_variants_combination_uidx/,
  );
});
