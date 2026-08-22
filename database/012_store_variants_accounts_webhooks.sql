-- 012_store_variants_accounts_webhooks.sql
-- Expansão do e-commerce Sol Hair Closet: Variações, Contas de Clientes, Descontos, Estoque e Webhooks.

-- 1. Garantir slug e ordenação em categorias
ALTER TABLE universe.store_categories
  ADD COLUMN IF NOT EXISTS slug text;

UPDATE universe.store_categories
  SET slug = id
  WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS universe_store_categories_slug_uidx
  ON universe.store_categories(slug);

-- 2. Tabela de Variações de Produto (Cor, Comprimento, Peso, Textura)
CREATE TABLE IF NOT EXISTS universe.store_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES universe.store_products(id) ON DELETE CASCADE,
  sku text,
  title text NOT NULL,
  color text,
  color_hex text,
  length_cm int,
  weight_g int,
  texture text,
  price_override numeric(12,2) CHECK (price_override >= 0),
  promotional_price_override numeric(12,2) CHECK (promotional_price_override >= 0),
  stock_quantity int NOT NULL DEFAULT 10 CHECK (stock_quantity >= 0),
  image_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'out_of_stock', 'inactive')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS universe_store_variants_product_idx
  ON universe.store_product_variants(product_id);
CREATE INDEX IF NOT EXISTS universe_store_variants_status_idx
  ON universe.store_product_variants(status);

-- 3. Atualizar Itens de Pedido para suportar Variações
ALTER TABLE universe.store_order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES universe.store_product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_name text;

-- 4. Contas de Clientes e Autenticação
ALTER TABLE universe.store_customers
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS is_registered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 5. Atualizar Pedidos com Descontos e Controle de Estoque
ALTER TABLE universe.store_orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS payment_method_selected text,
  ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false;

-- 6. Histórico e Auditoria de Estoque
CREATE TABLE IF NOT EXISTS universe.store_stock_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES universe.store_products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES universe.store_product_variants(id) ON DELETE SET NULL,
  order_id uuid REFERENCES universe.store_orders(id) ON DELETE SET NULL,
  change_qty int NOT NULL,
  reason text NOT NULL CHECK (reason IN ('sale', 'cancellation', 'adjustment', 'restock', 'return')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS universe_store_stock_logs_product_idx
  ON universe.store_stock_logs(product_id, created_at DESC);

-- 7. Registro e Processamento de Webhooks SumUp
CREATE TABLE IF NOT EXISTS universe.store_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL DEFAULT 'sumup',
  event_id text,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS universe_store_webhook_events_status_idx
  ON universe.store_webhook_events(status, created_at DESC);

-- 8. Seed inicial de variações para os produtos padrão
INSERT INTO universe.store_product_variants (product_id, sku, title, color, length_cm, weight_g, texture, stock_quantity)
SELECT p.id, p.slug || '-default', 'Padrão (' || coalesce(p.info, 'Natural') || ')', 'Preto Natural', 60, 150, 'Lisa', 25
FROM universe.store_products p
WHERE NOT EXISTS (
  SELECT 1 FROM universe.store_product_variants v WHERE v.product_id = p.id
);
