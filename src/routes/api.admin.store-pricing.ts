import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query } from "@/lib/db.server";
import {
  calculateProductPricing,
  type PricingCostItem,
  type PricingPercentages,
} from "@/lib/store-pricing-calculator";

const number = z.coerce.number().finite().min(0);
const inputSchema = z.object({
  purchaseTotal: number,
  purchasedQuantity: number.positive(),
  purchasedPieceGrams: number.positive(),
  soldGrams: number.positive(),
  chosenPrice: number.optional().nullable(),
  wholesaleQuantity: z.coerce.number().int().positive().optional(),
});
const settingsSchema = z.object({
  retailFixedPct: number,
  retailAdsPct: number,
  retailReservePct: number,
  retailProfitPct: number,
  wholesaleFixedPct: number,
  wholesaleReservePct: number,
  wholesaleAcquisitionPct: number,
  warningMarginPct: z.coerce.number().finite(),
});
const costSchema = z.object({
  id: z.string().uuid().optional(),
  scope: z.enum(["retail_unit", "wholesale_unit", "wholesale_order"]),
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_]+$/),
  description: z.string().trim().min(2).max(160),
  amount: number,
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

async function loadConfiguration() {
  const [settingsResult, costsResult] = await Promise.all([
    query(`SELECT retail_fixed_pct::float as "retailFixedPct", retail_ads_pct::float as "retailAdsPct",
                  retail_reserve_pct::float as "retailReservePct", retail_profit_pct::float as "retailProfitPct",
                  wholesale_fixed_pct::float as "wholesaleFixedPct", wholesale_reserve_pct::float as "wholesaleReservePct",
                  wholesale_acquisition_pct::float as "wholesaleAcquisitionPct", warning_margin_pct::float as "warningMarginPct"
             FROM universe.store_pricing_settings WHERE id = true`),
    query(`SELECT id, scope, code, description, amount::float as amount, active, sort_order as "sortOrder"
             FROM universe.store_pricing_cost_items ORDER BY scope, sort_order, description`),
  ]);
  return {
    settings: settingsResult.rows[0] as PricingPercentages,
    costs: costsResult.rows as PricingCostItem[],
  };
}

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
) {
  await query(
    `INSERT INTO universe.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)`,
    [actorId, action, entityType, entityId || null, JSON.stringify(metadata)],
  );
}

function failure(error: unknown) {
  if (error instanceof Response) return error;
  console.error("[Store pricing]", error);
  return Response.json(
    { ok: false, message: error instanceof Error ? error.message : "Falha na precificacao." },
    { status: 500 },
  );
}

export const Route = createFileRoute("/api/admin/store-pricing")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "store.read");
          const [{ settings, costs }, history, products] = await Promise.all([
            loadConfiguration(),
            query(`SELECT h.id, h.product_id as "productId", p.name as "productName", h.calculation_name as "calculationName",
                          h.purchase_total::float as "purchaseTotal", h.chosen_price::float as "chosenPrice",
                          h.technical_price::float as "technicalPrice", h.suggested_price::float as "suggestedPrice",
                          h.retail_snapshot as "retailSnapshot", h.wholesale_snapshot as "wholesaleSnapshot",
                          h.created_at as "createdAt", u.full_name as "createdByName"
                     FROM universe.store_pricing_calculations h
                     LEFT JOIN universe.store_products p ON p.id = h.product_id
                     LEFT JOIN universe.users u ON u.id = h.created_by
                    ORDER BY h.created_at DESC LIMIT 100`),
            query(`SELECT id, name, slug, price::float as price, wholesale_eligible as "wholesaleEligible"
                     FROM universe.store_products ORDER BY name`),
          ]);
          return Response.json({
            ok: true,
            settings,
            costs,
            history: history.rows,
            products: products.rows,
          });
        } catch (error) {
          return failure(error);
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const actor = await requirePermission(request, "store.write");
          const body = await request.json();

          if (body.action === "save-settings") {
            const parsed = settingsSchema.safeParse(body.settings);
            if (!parsed.success)
              return Response.json(
                { ok: false, message: parsed.error.issues.map((i) => i.message).join("; ") },
                { status: 400 },
              );
            const s = parsed.data;
            if (s.retailFixedPct + s.retailAdsPct + s.retailReservePct >= 100)
              return Response.json(
                { ok: false, message: "A soma dos percentuais de varejo deve ser menor que 100%." },
                { status: 400 },
              );
            if (s.wholesaleFixedPct + s.wholesaleReservePct + s.wholesaleAcquisitionPct >= 100)
              return Response.json(
                {
                  ok: false,
                  message: "A soma dos percentuais de atacado deve ser menor que 100%.",
                },
                { status: 400 },
              );
            await query(
              `UPDATE universe.store_pricing_settings SET retail_fixed_pct=$1, retail_ads_pct=$2,
              retail_reserve_pct=$3, retail_profit_pct=$4, wholesale_fixed_pct=$5, wholesale_reserve_pct=$6,
              wholesale_acquisition_pct=$7, warning_margin_pct=$8, updated_by=$9, updated_at=now() WHERE id=true`,
              [
                s.retailFixedPct,
                s.retailAdsPct,
                s.retailReservePct,
                s.retailProfitPct,
                s.wholesaleFixedPct,
                s.wholesaleReservePct,
                s.wholesaleAcquisitionPct,
                s.warningMarginPct,
                actor.id,
              ],
            );
            await audit(actor.id, "store.pricing.settings_updated", "store_pricing_settings");
            return Response.json({ ok: true });
          }

          if (body.action === "save-cost") {
            const parsed = costSchema.safeParse(body.cost);
            if (!parsed.success)
              return Response.json(
                { ok: false, message: parsed.error.issues.map((i) => i.message).join("; ") },
                { status: 400 },
              );
            const c = parsed.data;
            const result = await query(
              `INSERT INTO universe.store_pricing_cost_items(id,scope,code,description,amount,active,sort_order)
              VALUES(coalesce($1::uuid,gen_random_uuid()),$2,$3,$4,$5,$6,$7)
              ON CONFLICT(scope,code) DO UPDATE SET description=excluded.description, amount=excluded.amount,
                active=excluded.active, sort_order=excluded.sort_order, updated_at=now() RETURNING id`,
              [c.id || null, c.scope, c.code, c.description, c.amount, c.active, c.sortOrder],
            );
            await audit(
              actor.id,
              "store.pricing.cost_saved",
              "store_pricing_cost",
              result.rows[0].id,
              { code: c.code, scope: c.scope },
            );
            return Response.json({ ok: true, id: result.rows[0].id });
          }

          if (body.action === "delete-cost") {
            const id = z.string().uuid().safeParse(body.id);
            if (!id.success)
              return Response.json(
                { ok: false, message: "Item de custo inválido." },
                { status: 400 },
              );
            await query(`DELETE FROM universe.store_pricing_cost_items WHERE id=$1`, [id.data]);
            await audit(actor.id, "store.pricing.cost_deleted", "store_pricing_cost", id.data);
            return Response.json({ ok: true });
          }

          if (
            body.action === "calculate" ||
            body.action === "save-calculation" ||
            body.action === "apply-price"
          ) {
            const parsed = inputSchema.safeParse(body.input);
            if (!parsed.success)
              return Response.json(
                { ok: false, message: parsed.error.issues.map((i) => i.message).join("; ") },
                { status: 400 },
              );
            const { settings, costs } = await loadConfiguration();
            const result = calculateProductPricing(parsed.data, settings, costs);
            const hasLoss =
              result.wholesale.fortyPercent.health === "loss" ||
              result.wholesale.fiftyPercent.health === "loss";

            if (body.action === "apply-price") {
              const productId = z.string().uuid().parse(body.productId);
              if (hasLoss && body.confirmLoss !== true)
                return Response.json(
                  {
                    ok: false,
                    requiresConfirmation: true,
                    message:
                      "O preco gera prejuizo em pelo menos uma faixa de atacado. Confirme explicitamente para aplicar.",
                    result,
                  },
                  { status: 409 },
                );
              const price = Number(parsed.data.chosenPrice || result.retail.suggestedPrice);
              await query(
                `UPDATE universe.store_products SET price=$1, updated_at=now() WHERE id=$2`,
                [price, productId],
              );
              await audit(actor.id, "store.product.price_applied", "store_product", productId, {
                price,
              });
            }

            if (body.action === "save-calculation" || body.action === "apply-price") {
              await query(
                `INSERT INTO universe.store_pricing_calculations
                (product_id,calculation_name,purchase_total,purchased_quantity,purchased_piece_grams,sold_grams,chosen_price,
                 technical_price,suggested_price,retail_snapshot,wholesale_snapshot,settings_snapshot,cost_items_snapshot,created_by)
                VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14)`,
                [
                  body.productId || null,
                  body.calculationName || null,
                  parsed.data.purchaseTotal,
                  parsed.data.purchasedQuantity,
                  parsed.data.purchasedPieceGrams,
                  parsed.data.soldGrams,
                  parsed.data.chosenPrice || result.retail.suggestedPrice,
                  result.retail.technicalPrice,
                  result.retail.suggestedPrice,
                  JSON.stringify(result.retail),
                  JSON.stringify(result.wholesale),
                  JSON.stringify(settings),
                  JSON.stringify(costs),
                  actor.id,
                ],
              );
              await audit(
                actor.id,
                "store.pricing.calculation_saved",
                "store_pricing_calculation",
                undefined,
                {
                  productId: body.productId || null,
                  technicalPrice: result.retail.technicalPrice,
                  suggestedPrice: result.retail.suggestedPrice,
                },
              );
            }
            return Response.json({ ok: true, result, hasLoss });
          }

          return Response.json({ ok: false, message: "Acao invalida." }, { status: 400 });
        } catch (error) {
          return failure(error);
        }
      },
    },
  },
});
