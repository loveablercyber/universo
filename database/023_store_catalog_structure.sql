-- Categorias hierárquicas e galerias por variação.
ALTER TABLE universe.store_categories
  ADD COLUMN IF NOT EXISTS parent_id text REFERENCES universe.store_categories(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS universe_store_categories_parent_idx ON universe.store_categories(parent_id);
ALTER TABLE universe.store_products
  ADD COLUMN IF NOT EXISTS subcategory_id text REFERENCES universe.store_categories(id) ON DELETE SET NULL;

ALTER TABLE universe.store_product_variants
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS universe_store_categories_parent_name_uidx
  ON universe.store_categories (coalesce(parent_id, ''), lower(name));
