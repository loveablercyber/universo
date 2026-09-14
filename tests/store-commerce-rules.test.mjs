import test from "node:test";
import assert from "node:assert/strict";
import { calculateStoreDiscounts } from "../src/lib/store-discounts.ts";
import { calculateProductPricing } from "../src/lib/store-pricing-calculator.ts";

const eligible = (quantity, regularUnitPrice = 100, promotionalUnitPrice = null) => ({
  key: "eligible",
  quantity,
  regularUnitPrice,
  promotionalUnitPrice,
  wholesaleEligible: true,
});

test("atacado respeita exatamente as faixas 1-14, 15-24 e 25+", () => {
  assert.equal(calculateStoreDiscounts([eligible(14)]).wholesaleDiscountPercent, 0);
  assert.equal(calculateStoreDiscounts([eligible(15)]).wholesaleDiscountPercent, 40);
  assert.equal(calculateStoreDiscounts([eligible(24)]).wholesaleDiscountPercent, 40);
  assert.equal(calculateStoreDiscounts([eligible(25)]).wholesaleDiscountPercent, 50);
});

test("quantidade elegivel soma produtos e variacoes diferentes", () => {
  const result = calculateStoreDiscounts([
    { ...eligible(8), key: "a" },
    { ...eligible(7), key: "b" },
    { ...eligible(30), key: "not-eligible", wholesaleEligible: false },
  ]);
  assert.equal(result.wholesaleEligibleQuantity, 15);
  assert.equal(result.wholesaleDiscountPercent, 40);
  assert.equal(result.lines[0].appliedUnitPrice, 60);
  assert.equal(result.lines[2].appliedUnitPrice, 100);
});

test("atacado nao acumula com promocao nem Pix", () => {
  const result = calculateStoreDiscounts([eligible(15, 100, 20)], {
    paymentMethod: "pix",
    pixDiscountPercent: 5,
  });
  assert.equal(result.discountRule, "wholesale_40");
  assert.equal(result.lines[0].appliedUnitPrice, 60);
});

test("sem atacado aplica apenas a melhor regra entre promocao e Pix", () => {
  const promotionWins = calculateStoreDiscounts([eligible(1, 100, 80)], {
    paymentMethod: "pix",
    pixDiscountPercent: 5,
  });
  assert.equal(promotionWins.lines[0].appliedUnitPrice, 80);
  assert.equal(promotionWins.lines[0].discountType, "promotion");
  const pixWins = calculateStoreDiscounts([eligible(1, 100, 98)], {
    paymentMethod: "pix",
    pixDiscountPercent: 5,
  });
  assert.equal(pixWins.lines[0].appliedUnitPrice, 95);
  assert.equal(pixWins.lines[0].discountType, "pix");
});

test("cupom participa do motor sem acumular e perde prioridade para o atacado", () => {
  const coupon = calculateStoreDiscounts([eligible(1, 100, 95)], {
    paymentMethod: "pix",
    pixDiscountPercent: 5,
    couponDiscountPercent: 12,
  });
  assert.equal(coupon.discountRule, "coupon");
  assert.equal(coupon.lines[0].appliedUnitPrice, 88);
  const wholesale = calculateStoreDiscounts([eligible(15, 100, 20)], {
    paymentMethod: "pix",
    pixDiscountPercent: 5,
    couponDiscountPercent: 80,
  });
  assert.equal(wholesale.discountRule, "wholesale_40");
  assert.equal(wholesale.lines[0].appliedUnitPrice, 60);
});

test("calculadora deriva custo por grama e alerta prejuizo no atacado", () => {
  const result = calculateProductPricing(
    {
      purchaseTotal: 100,
      purchasedQuantity: 1,
      purchasedPieceGrams: 100,
      soldGrams: 50,
      chosenPrice: 100,
      wholesaleQuantity: 15,
    },
    {
      retailFixedPct: 23.58,
      retailAdsPct: 10,
      retailReservePct: 5,
      retailProfitPct: 90,
      wholesaleFixedPct: 23.58,
      wholesaleReservePct: 5,
      wholesaleAcquisitionPct: 5,
      warningMarginPct: 10,
    },
    [
      { scope: "retail_unit", code: "labor", description: "Mao de obra", amount: 10, active: true },
      {
        scope: "wholesale_unit",
        code: "separation",
        description: "Separacao",
        amount: 3,
        active: true,
      },
      { scope: "wholesale_order", code: "label", description: "Etiqueta", amount: 2, active: true },
    ],
  );
  assert.equal(result.retail.unitPurchaseCost, 100);
  assert.equal(result.retail.gramCost, 1);
  assert.equal(result.retail.proportionalHairCost, 50);
  assert.ok(result.retail.suggestedPrice >= result.retail.technicalPrice);
  assert.equal(result.wholesale.fiftyPercent.health, "loss");
});
