-- 006_store_ecommerce.sql
-- Estrutura para e-commerce Sol Hair Closet

-- 1. Categorias de Produtos
CREATE TABLE IF NOT EXISTS universe.store_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Produtos da Loja
CREATE TABLE IF NOT EXISTS universe.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  info text,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  promotional_price numeric(12,2) CHECK (promotional_price >= 0),
  stock_quantity int NOT NULL DEFAULT 50 CHECK (stock_quantity >= 0),
  category_id text REFERENCES universe.store_categories(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge_label text,
  badge_tone text DEFAULT 'gold',
  rating numeric(3,2) DEFAULT 4.5,
  reviews_count int DEFAULT 0,
  sold_count int DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'out_of_stock', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Pedidos
CREATE TABLE IF NOT EXISTS universe.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_document text NOT NULL,
  shipping_address jsonb NOT NULL,
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'sumup_online',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  sumup_checkout_id text UNIQUE,
  tracking_code text,
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Itens do Pedido
CREATE TABLE IF NOT EXISTS universe.store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES universe.store_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES universe.store_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  total_price numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS universe_store_products_category_idx ON universe.store_products(category_id);
CREATE INDEX IF NOT EXISTS universe_store_products_status_idx ON universe.store_products(status);
CREATE INDEX IF NOT EXISTS universe_store_orders_status_idx ON universe.store_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS universe_store_orders_number_idx ON universe.store_orders(order_number);

-- Seed de Categorias Iniciais
INSERT INTO universe.store_categories(id, name, image_url, sort_order)
VALUES
  ('fibra-russa', 'FIBRA RUSSA', '/images/produto-fibra-russa.jpg', 1),
  ('apliques', 'APLIQUES', '/images/produto-rabo-cavalo.jpg', 2),
  ('perucas', 'PERUCAS', '/images/categoria-perucas.jpg', 3),
  ('acessorios', 'ACESSÓRIOS', '/images/categoria-acessorios.jpg', 4),
  ('manutencao', 'MANUTENÇÃO', '/images/categoria-manutencao.jpg', 5),
  ('fibra-europeia', 'FIBRA EUROPEIA', '/images/categoria-fibra-europeia.jpg', 6)
ON CONFLICT (id) DO NOTHING;

-- Seed de Produtos Iniciais
INSERT INTO universe.store_products (slug, name, info, description, price, stock_quantity, category_id, image_url, badge_label, badge_tone, rating, reviews_count, sold_count)
VALUES
  ('fibra-russa-lisa', 'Fibra Russa Lisa Natural', 'Preto • 150g • 60cm', 'Fibra natural de altíssima qualidade com brilho e maciez premium.', 219.90, 45, 'fibra-russa', '/images/produto-fibra-russa.jpg', '✦ MAIS VENDIDO', 'gold', 4.7, 146, 1200),
  ('crochet-cacheado', 'Crochet Cacheado', 'Preto • 300g • 40cm', 'Cachos volumosos e definir para um visual moderno e autêntico.', 39.90, 80, 'apliques', '/images/produto-crochet-cacheado.jpg', '✦ QUERIDINHA', 'cream', 4.6, 156, 1800),
  ('rabo-cavalo-liso', 'Rabo de Cavalo Liso', 'Preto • 80cm • 120g', 'Aplique prático de rabo de cavalo com fixação fácil e visual impecável.', 149.90, 30, 'apliques', '/images/produto-rabo-cavalo.jpg', '♥ FAVORITA', 'rose', 4.5, 87, 670),
  ('lace-morena-iluminada', 'Lace Front Morena Iluminada', '70cm • Fibra Premium • 180%', 'Lace front realista com acabamento invisível e tom morena iluminada.', 549.90, 15, 'perucas', '/images/produto-lace-morena.jpg', '✦ LANÇAMENTO', 'copper', 4.6, 97, 950)
ON CONFLICT (slug) DO NOTHING;
