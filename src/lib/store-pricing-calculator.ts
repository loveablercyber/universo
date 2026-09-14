export type PricingPercentages = {
  retailFixedPct: number;
  retailAdsPct: number;
  retailReservePct: number;
  retailProfitPct: number;
  wholesaleFixedPct: number;
  wholesaleReservePct: number;
  wholesaleAcquisitionPct: number;
  warningMarginPct: number;
};

export type PricingCostItem = {
  id?: string;
  scope: "retail_unit" | "wholesale_unit" | "wholesale_order";
  code: string;
  description: string;
  amount: number;
  active: boolean;
  sortOrder?: number;
};

export type PricingInput = {
  purchaseTotal: number;
  purchasedQuantity: number;
  purchasedPieceGrams: number;
  soldGrams: number;
  chosenPrice?: number | null;
  wholesaleQuantity?: number;
};

const round = (value: number, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function roundCommercialPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const tens = Math.ceil((value + 0.1) / 10) * 10;
  return round(tens - 0.1, 2);
}

export function calculateProductPricing(
  input: PricingInput,
  percentages: PricingPercentages,
  costItems: PricingCostItem[],
) {
  if (
    input.purchaseTotal < 0 ||
    input.purchasedQuantity <= 0 ||
    input.purchasedPieceGrams <= 0 ||
    input.soldGrams <= 0
  ) {
    throw new Error("Informe custos e quantidades validos para calcular a precificacao.");
  }

  const retailPctTotal =
    percentages.retailFixedPct + percentages.retailAdsPct + percentages.retailReservePct;
  if (retailPctTotal >= 100) {
    throw new Error("A soma dos percentuais de varejo deve ser menor que 100%.");
  }

  const unitPurchaseCost = input.purchaseTotal / input.purchasedQuantity;
  const gramCost = unitPurchaseCost / input.purchasedPieceGrams;
  const proportionalHairCost = gramCost * input.soldGrams;
  const retailOperationalCost = costItems
    .filter((item) => item.active && item.scope === "retail_unit")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const retailDirectCost = proportionalHairCost + retailOperationalCost;
  const targetProfit = retailDirectCost * (percentages.retailProfitPct / 100);
  const technicalPrice =
    (retailDirectCost + targetProfit) / Math.max(0.0001, 1 - retailPctTotal / 100);
  const suggestedPrice = roundCommercialPrice(technicalPrice);
  const chosenPrice = Number(input.chosenPrice || suggestedPrice);
  const retailDeductions = chosenPrice * (retailPctTotal / 100);
  const retailProfit = chosenPrice - retailDeductions - retailDirectCost;

  const wholesaleQuantity = Math.max(1, Math.floor(input.wholesaleQuantity || 15));
  const wholesaleUnitOperational = costItems
    .filter((item) => item.active && item.scope === "wholesale_unit")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const wholesaleOrderOperational = costItems
    .filter((item) => item.active && item.scope === "wholesale_order")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const wholesaleDirectUnitCost =
    proportionalHairCost + wholesaleUnitOperational + wholesaleOrderOperational / wholesaleQuantity;
  const wholesalePctTotal =
    percentages.wholesaleFixedPct +
    percentages.wholesaleReservePct +
    percentages.wholesaleAcquisitionPct;

  const simulateWholesale = (discountPercent: 40 | 50) => {
    const unitRevenue = chosenPrice * (1 - discountPercent / 100);
    const deductions = unitRevenue * (wholesalePctTotal / 100);
    const unitProfit = unitRevenue - deductions - wholesaleDirectUnitCost;
    const netMarginPct = unitRevenue > 0 ? (unitProfit / unitRevenue) * 100 : -100;
    return {
      discountPercent,
      quantity: wholesaleQuantity,
      unitRevenue: round(unitRevenue, 2),
      unitCost: round(wholesaleDirectUnitCost, 4),
      unitProfit: round(unitProfit, 2),
      netMarginPct: round(netMarginPct, 2),
      totalRevenue: round(unitRevenue * wholesaleQuantity, 2),
      totalProfit: round(unitProfit * wholesaleQuantity, 2),
      health:
        unitProfit < 0
          ? ("loss" as const)
          : netMarginPct < percentages.warningMarginPct
            ? ("warning" as const)
            : ("healthy" as const),
    };
  };

  return {
    retail: {
      unitPurchaseCost: round(unitPurchaseCost),
      gramCost: round(gramCost),
      proportionalHairCost: round(proportionalHairCost),
      operationalCost: round(retailOperationalCost, 2),
      directCost: round(retailDirectCost, 2),
      targetProfit: round(targetProfit, 2),
      technicalPrice: round(technicalPrice, 2),
      suggestedPrice,
      chosenPrice: round(chosenPrice, 2),
      fixedCostsValue: round(chosenPrice * (percentages.retailFixedPct / 100), 2),
      adsValue: round(chosenPrice * (percentages.retailAdsPct / 100), 2),
      reserveValue: round(chosenPrice * (percentages.retailReservePct / 100), 2),
      profit: round(retailProfit, 2),
      markupPct:
        retailDirectCost > 0
          ? round(((chosenPrice - retailDirectCost) / retailDirectCost) * 100, 2)
          : 0,
      netMarginPct: chosenPrice > 0 ? round((retailProfit / chosenPrice) * 100, 2) : -100,
    },
    wholesale: {
      unitOperationalCost: round(wholesaleUnitOperational, 2),
      allocatedOrderCost: round(wholesaleOrderOperational / wholesaleQuantity, 4),
      directUnitCost: round(wholesaleDirectUnitCost, 4),
      fortyPercent: simulateWholesale(40),
      fiftyPercent: simulateWholesale(50),
    },
  };
}

export type ProductPricingResult = ReturnType<typeof calculateProductPricing>;
