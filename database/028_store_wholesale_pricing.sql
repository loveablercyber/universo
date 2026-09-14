-- 028_store_wholesale_pricing.sql
-- Evolucao incremental do catalogo, atacado e precificacao administrativa.

ALTER TABLE universe.store_categories
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive'));

ALTER TABLE universe.store_products
  ADD COLUMN IF NOT EXISTS wholesale_eligible boolean NOT NULL DEFAULT false;

ALTER TABLE universe.store_orders
  ADD COLUMN IF NOT EXISTS base_subtotal numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_percent numeric(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_rule text,
  ADD COLUMN IF NOT EXISTS wholesale_eligible_quantity int NOT NULL DEFAULT 0;

UPDATE universe.store_orders
   SET base_subtotal = subtotal
 WHERE base_subtotal IS NULL;

ALTER TABLE universe.store_orders
  ALTER COLUMN base_subtotal SET NOT NULL;

ALTER TABLE universe.store_order_items
  ADD COLUMN IF NOT EXISTS base_unit_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS final_unit_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent numeric(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS wholesale_eligible boolean NOT NULL DEFAULT false;

UPDATE universe.store_order_items
   SET base_unit_price = unit_price,
       final_unit_price = unit_price
 WHERE base_unit_price IS NULL OR final_unit_price IS NULL;

ALTER TABLE universe.store_order_items
  ALTER COLUMN base_unit_price SET NOT NULL,
  ALTER COLUMN final_unit_price SET NOT NULL;

CREATE TABLE IF NOT EXISTS universe.store_pricing_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  retail_fixed_pct numeric(7,4) NOT NULL DEFAULT 23.58 CHECK (retail_fixed_pct >= 0),
  retail_ads_pct numeric(7,4) NOT NULL DEFAULT 10 CHECK (retail_ads_pct >= 0),
  retail_reserve_pct numeric(7,4) NOT NULL DEFAULT 5 CHECK (retail_reserve_pct >= 0),
  retail_profit_pct numeric(7,4) NOT NULL DEFAULT 90 CHECK (retail_profit_pct >= 0),
  wholesale_fixed_pct numeric(7,4) NOT NULL DEFAULT 23.58 CHECK (wholesale_fixed_pct >= 0),
  wholesale_reserve_pct numeric(7,4) NOT NULL DEFAULT 5 CHECK (wholesale_reserve_pct >= 0),
  wholesale_acquisition_pct numeric(7,4) NOT NULL DEFAULT 5 CHECK (wholesale_acquisition_pct >= 0),
  warning_margin_pct numeric(7,4) NOT NULL DEFAULT 10,
  updated_by uuid REFERENCES universe.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO universe.store_pricing_settings(id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS universe.store_pricing_cost_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('retail_unit', 'wholesale_unit', 'wholesale_order')),
  code text NOT NULL,
  description text NOT NULL,
  amount numeric(12,4) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, code)
);

INSERT INTO universe.store_pricing_cost_items(scope, code, description, amount, sort_order)
VALUES
  ('retail_unit','personalized_bag','Sacola personalizada',0.91,10),
  ('retail_unit','security_envelope','Envelope de seguranca',0.33,20),
  ('retail_unit','label_declaration','Etiqueta e declaracao',2.00,30),
  ('retail_unit','thank_you_card','Cartao de agradecimento',0.35,40),
  ('retail_unit','tissue_paper','Papel de seda',1.29,50),
  ('retail_unit','instruction_folder','Pasta de instrucoes',3.50,60),
  ('retail_unit','adhesive_tape','Fita adesiva',0.10,70),
  ('retail_unit','seal','Lacre',0.30,80),
  ('retail_unit','decorative_sticker','Adesivo decorativo',0.25,90),
  ('retail_unit','decorative_ribbon','Fita decorativa',3.65,100),
  ('retail_unit','perfume','Perfume',0.15,110),
  ('retail_unit','labor','Mao de obra',10.00,120),
  ('wholesale_unit','personalized_bag','Sacola personalizada',0.91,10),
  ('wholesale_unit','separation','Separacao por unidade',3.00,20),
  ('wholesale_order','label_declaration','Etiqueta e declaracao por pedido',2.00,10),
  ('wholesale_order','closing_material','Material de fechamento por pedido',0.50,20)
ON CONFLICT (scope, code) DO NOTHING;

CREATE TABLE IF NOT EXISTS universe.store_pricing_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES universe.store_products(id) ON DELETE SET NULL,
  calculation_name text,
  purchase_total numeric(14,4) NOT NULL,
  purchased_quantity numeric(14,4) NOT NULL CHECK (purchased_quantity > 0),
  purchased_piece_grams numeric(14,4) NOT NULL CHECK (purchased_piece_grams > 0),
  sold_grams numeric(14,4) NOT NULL CHECK (sold_grams > 0),
  chosen_price numeric(14,2),
  technical_price numeric(14,2) NOT NULL,
  suggested_price numeric(14,2) NOT NULL,
  retail_snapshot jsonb NOT NULL,
  wholesale_snapshot jsonb NOT NULL,
  settings_snapshot jsonb NOT NULL,
  cost_items_snapshot jsonb NOT NULL,
  created_by uuid REFERENCES universe.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS universe_store_pricing_history_product_idx
  ON universe.store_pricing_calculations(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS universe_store_pricing_history_created_idx
  ON universe.store_pricing_calculations(created_at DESC);
