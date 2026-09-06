ALTER TABLE universe.store_products
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS characteristics text,
  ADD COLUMN IF NOT EXISTS methods text,
  ADD COLUMN IF NOT EXISTS care_instructions text;
