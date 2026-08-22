-- 013_store_security_hardening.sql
-- Hardening de segurança, proteção de pedidos, idempotência, expiração de reservas e integridade de estoque.

-- 1. Tokens de acesso e expiração de reserva na tabela de pedidos
ALTER TABLE universe.store_orders
  ADD COLUMN IF NOT EXISTS access_token_hash text,
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE INDEX IF NOT EXISTS universe_store_orders_token_hash_idx
  ON universe.store_orders(access_token_hash)
  WHERE access_token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS universe_store_orders_idempotency_uidx
  ON universe.store_orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL AND status != 'cancelled';

CREATE INDEX IF NOT EXISTS universe_store_orders_expired_res_idx
  ON universe.store_orders(status, stock_reserved, reservation_expires_at)
  WHERE stock_reserved = true AND status = 'pending';

-- 2. Tabela de tokens de acesso temporário a histórico de compras (magic links de consulta para clientes sem conta)
CREATE TABLE IF NOT EXISTS universe.store_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  requested_ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS universe_store_access_tokens_lookup_idx
  ON universe.store_access_tokens(token_hash, expires_at)
  WHERE used_at IS NULL;

-- 3. Idempotência estrita para Webhooks
CREATE UNIQUE INDEX IF NOT EXISTS universe_store_webhook_events_uidx
  ON universe.store_webhook_events(gateway, event_id)
  WHERE event_id IS NOT NULL;

-- 4. Função e trigger para manter store_products.stock_quantity sincronizado com a soma das variações
CREATE OR REPLACE FUNCTION universe.sync_product_stock_from_variants()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id uuid;
  total_variant_stock int;
  variant_count int;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT count(*), coalesce(sum(stock_quantity), 0)
    INTO variant_count, total_variant_stock
    FROM universe.store_product_variants
   WHERE product_id = target_product_id AND status != 'inactive';

  IF variant_count > 0 THEN
    UPDATE universe.store_products
       SET stock_quantity = total_variant_stock,
           status = CASE
                      WHEN total_variant_stock <= 0 AND status = 'active' THEN 'out_of_stock'
                      WHEN total_variant_stock > 0 AND status = 'out_of_stock' THEN 'active'
                      ELSE status
                    END,
           updated_at = now()
     WHERE id = target_product_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_stock ON universe.store_product_variants;
CREATE TRIGGER trg_sync_product_stock
AFTER INSERT OR UPDATE OF stock_quantity, status OR DELETE
ON universe.store_product_variants
FOR EACH ROW
EXECUTE FUNCTION universe.sync_product_stock_from_variants();

-- 5. Atualizar produtos existentes com hash de token para pedidos legados (se houver)
UPDATE universe.store_orders
   SET access_token_hash = encode(digest(order_number || '-' || created_at::text, 'sha256'), 'hex')
 WHERE access_token_hash IS NULL;
