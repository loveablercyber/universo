ALTER TABLE universe.store_order_items
  ADD COLUMN IF NOT EXISTS variant_sku text,
  ADD COLUMN IF NOT EXISTS variant_color text,
  ADD COLUMN IF NOT EXISTS variant_length_cm int,
  ADD COLUMN IF NOT EXISTS variant_weight_g int,
  ADD COLUMN IF NOT EXISTS image_url text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM universe.store_product_variants WHERE nullif(trim(sku),'') IS NOT NULL GROUP BY lower(trim(sku)) HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS universe_store_variants_sku_uidx ON universe.store_product_variants(lower(trim(sku))) WHERE nullif(trim(sku),'') IS NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM universe.store_product_variants WHERE status <> 'inactive' GROUP BY product_id, lower(coalesce(color,'')), coalesce(length_cm,-1) HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS universe_store_variants_combination_uidx ON universe.store_product_variants(product_id, lower(coalesce(color,'')), coalesce(length_cm,-1)) WHERE status <> 'inactive';
  END IF;
END $$;
