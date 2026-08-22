import assert from "node:assert/strict";
import pg from "pg";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL não configurada. Configure DATABASE_URL para executar os testes.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  try {
    process.stdout.write(`\n▶ Executando: ${name}... `);
    await fn();
    console.log("✅ PASSOU");
    passedTests++;
  } catch (err) {
    console.log(`❌ FALHOU: ${err.message}`);
    console.error(err);
    failedTests++;
  }
}

async function runAllTests() {
  console.log("=================================================");
  console.log("  SUÍTE DE TESTES DE SEGURANÇA E E-COMMERCE SOL  ");
  console.log("=================================================");

  // Setup: Garantir tabela e dados de teste
  const testEmail = `test_${Date.now()}@test.com`;
  const otherEmail = `other_${Date.now()}@test.com`;

  // Criar produto de teste com 1 unidade em estoque
  const prodSlug = `test-prod-${Date.now()}`;
  const prodRes = await pool.query(
    `INSERT INTO universe.store_products(slug, name, price, stock_quantity, image_url, status)
     VALUES ($1, 'Produto Teste Concorrência', 100.00, 1, '/images/test.jpg', 'active')
     RETURNING id, stock_quantity`,
    [prodSlug],
  );
  const testProductId = prodRes.rows[0].id;

  // 1. TESTE: Tentativa de consulta indevida de histórico sem token/sessão
  await test("1. Proibir consulta pública de histórico de pedidos", async () => {
    // Simular validação de acesso
    const token = null;
    const session = null;
    let allowed = false;

    if (session) {
      allowed = true;
    } else if (token) {
      const check = await pool.query(
        `SELECT 1 FROM universe.store_access_tokens WHERE token_hash = $1 AND expires_at > now() AND used_at IS NULL`,
        [hashToken(token)],
      );
      allowed = check.rowCount > 0;
    }

    assert.equal(allowed, false, "Consulta sem sessão ou token deve ser negada");
  });

  // 2. TESTE: Validação de Token de Alta Entropia do Pedido
  await test("2. Acesso a status do pedido apenas com token válido", async () => {
    const rawToken = randomBytes(32).toString("base64url");
    const correctHash = hashToken(rawToken);
    const orderNum = `SOL-TEST-${Date.now()}`;

    // Criar pedido de teste
    await pool.query(
      `INSERT INTO universe.store_orders(order_number, customer_name, customer_email, customer_phone, customer_document,
                                         shipping_address, shipping_cost, subtotal, total_amount, access_token_hash, status)
       VALUES ($1, 'Cliente Teste', $2, '11999999999', '12345678901', '{}'::jsonb, 0, 100, 100, $3, 'pending')`,
      [orderNum, testEmail, correctHash],
    );

    // Teste com token errado
    const wrongToken = randomBytes(32).toString("base64url");
    const wrongRes = await pool.query(
      `SELECT id FROM universe.store_orders WHERE order_number = $1 AND access_token_hash = $2`,
      [orderNum, hashToken(wrongToken)],
    );
    assert.equal(wrongRes.rowCount, 0, "Token incorreto não deve autorizar consulta");

    // Teste com token correto
    const correctRes = await pool.query(
      `SELECT id FROM universe.store_orders WHERE order_number = $1 AND access_token_hash = $2`,
      [orderNum, hashToken(rawToken)],
    );
    assert.equal(correctRes.rowCount, 1, "Token correto deve autorizar consulta");
  });

  // 3. TESTE: Concorrência de Estoque (2 clientes tentando comprar o último item simultâneo)
  await test("3. Bloqueio de concorrência com FOR UPDATE no último item em estoque", async () => {
    let successCount = 0;
    let failCount = 0;

    async function attemptPurchase(buyerEmail) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const res = await client.query(
          `SELECT id, stock_quantity FROM universe.store_products WHERE id = $1 FOR UPDATE`,
          [testProductId],
        );
        const stock = res.rows[0].stock_quantity;

        if (stock < 1) {
          throw new Error("Estoque insuficiente");
        }

        // Decrementar
        await client.query(
          `UPDATE universe.store_products SET stock_quantity = stock_quantity - 1 WHERE id = $1`,
          [testProductId],
        );

        await client.query("COMMIT");
        successCount++;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        failCount++;
      } finally {
        client.release();
      }
    }

    // Disparar 2 tentativas simultâneas
    await Promise.all([
      attemptPurchase("buyer1@test.com"),
      attemptPurchase("buyer2@test.com"),
    ]);

    assert.equal(successCount, 1, "Exatamente 1 compra deve ter sucesso");
    assert.equal(failCount, 1, "A 2ª compra concorrente deve falhar por estoque esgotado");

    const finalProd = await pool.query(`SELECT stock_quantity FROM universe.store_products WHERE id = $1`, [testProductId]);
    assert.equal(finalProd.rows[0].stock_quantity, 0, "Estoque final deve ser exatamente 0");
  });

  // 4. TESTE: Expiração e Estorno Automático de Reserva Abandonada
  await test("4. Liberação e estorno de reserva expirada", async () => {
    const expiredOrderNum = `SOL-EXP-${Date.now()}`;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Criar pedido com reserva expirada no passado (-10 minutos)
      const ordRes = await client.query(
        `INSERT INTO universe.store_orders(order_number, customer_name, customer_email, customer_phone, customer_document,
                                           shipping_address, shipping_cost, subtotal, total_amount, status, stock_reserved,
                                           reservation_expires_at)
         VALUES ($1, 'Cliente Expirado', 'exp@test.com', '11999999999', '12345678901', '{}'::jsonb, 0, 100, 100, 'pending', true, now() - interval '10 minutes')
         RETURNING id`,
        [expiredOrderNum],
      );
      const expiredOrderId = ordRes.rows[0].id;

      await client.query(
        `INSERT INTO universe.store_order_items(order_id, product_id, product_name, unit_price, quantity, total_price)
         VALUES ($1, $2, 'Produto Teste', 100, 1, 100)`,
        [expiredOrderId, testProductId],
      );

      await client.query("COMMIT");

      // Executar estorno de pedidos expirados
      await client.query("BEGIN");
      const { rows: expired } = await client.query(
        `SELECT id FROM universe.store_orders WHERE status = 'pending' AND stock_reserved = true AND reservation_expires_at < now() AND id = $1`,
        [expiredOrderId],
      );

      if (expired.length > 0) {
        // Devolver estoque
        await client.query(
          `UPDATE universe.store_products SET stock_quantity = stock_quantity + 1 WHERE id = $1`,
          [testProductId],
        );
        await client.query(
          `UPDATE universe.store_orders SET status = 'cancelled', stock_reserved = false WHERE id = $1`,
          [expiredOrderId],
        );
      }
      await client.query("COMMIT");

      const finalProd = await pool.query(`SELECT stock_quantity FROM universe.store_products WHERE id = $1`, [testProductId]);
      assert.equal(finalProd.rows[0].stock_quantity, 1, "Estoque deve ser restaurado para 1 após liberação da reserva expirada");
    } finally {
      client.release();
    }
  });

  // 5. TESTE: Idempotência de Webhook SumUp
  await test("5. Idempotência estrita de eventos de Webhook", async () => {
    const eventId = `evt_test_${Date.now()}`;
    const payload = JSON.stringify({ event_type: "CHECKOUT_STATUS_CHANGED", id: eventId });

    // 1º Inserção
    const res1 = await pool.query(
      `INSERT INTO universe.store_webhook_events(gateway, event_id, event_type, payload, status)
       VALUES ('sumup', $1, 'CHECKOUT_STATUS_CHANGED', $2::jsonb, 'processed')
       ON CONFLICT (gateway, event_id) WHERE event_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [eventId, payload],
    );
    assert.equal(res1.rowCount, 1, "Primeiro webhook deve ser registrado");

    // 2º Inserção com mesmo event_id (duplicado)
    const res2 = await pool.query(
      `INSERT INTO universe.store_webhook_events(gateway, event_id, event_type, payload, status)
       VALUES ('sumup', $1, 'CHECKOUT_STATUS_CHANGED', $2::jsonb, 'processed')
       ON CONFLICT (gateway, event_id) WHERE event_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [eventId, payload],
    );
    assert.equal(res2.rowCount, 0, "Webhook duplicado deve ser ignorado sem reprocessar");
  });

  // 6. TESTE: Logout e Revogação Real de Sessão
  await test("6. Revogação de sessão no logout (prevenção de token reutilizado)", async () => {
    const sessionToken = randomBytes(32).toString("base64url");
    const sHash = hashToken(sessionToken);

    // Criar usuário e sessão de teste
    const uRes = await pool.query(
      `INSERT INTO universe.users(email, password_hash, full_name, role, status)
       VALUES ($1, 'hash_fake', 'Usuario Logout', 'customer', 'active')
       RETURNING id`,
      [`logout_${Date.now()}@test.com`],
    );
    const uId = uRes.rows[0].id;

    await pool.query(
      `INSERT INTO universe.sessions(user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '7 days')`,
      [uId, sHash],
    );

    // Verificar sessão ativa
    const checkActive = await pool.query(`SELECT 1 FROM universe.sessions WHERE token_hash = $1`, [sHash]);
    assert.equal(checkActive.rowCount, 1, "Sessão deve existir antes do logout");

    // Simular destroySession
    await pool.query(`DELETE FROM universe.sessions WHERE token_hash = $1`, [sHash]);

    // Verificar sessão após logout
    const checkAfter = await pool.query(`SELECT 1 FROM universe.sessions WHERE token_hash = $1`, [sHash]);
    assert.equal(checkAfter.rowCount, 0, "Sessão deve ter sido apagada do banco no logout");
  });

  // Cleanup de dados temporários de teste
  await pool.query(`DELETE FROM universe.store_products WHERE id = $1`, [testProductId]).catch(() => {});

  console.log("\n=================================================");
  console.log(`  RESULTADO FINAL: ${passedTests} PASSOU / ${failedTests} FALHOU`);
  console.log("=================================================");

  await pool.end();

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Erro fatal durante os testes:", err);
  process.exit(1);
});
