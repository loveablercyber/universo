export const WHOLESALE_FIRST_THRESHOLD = 15;
export const WHOLESALE_SECOND_THRESHOLD = 25;
export const WHOLESALE_FIRST_DISCOUNT = 40;
export const WHOLESALE_SECOND_DISCOUNT = 50;
export const DEFAULT_PIX_DISCOUNT = 5;

export type DiscountCartLine<T = unknown> = {
  key: string;
  quantity: number;
  regularUnitPrice: number;
  promotionalUnitPrice?: number | null;
  wholesaleEligible: boolean;
  source?: T;
};

export type CalculatedDiscountLine<T = unknown> = DiscountCartLine<T> & {
  appliedUnitPrice: number;
  lineBaseTotal: number;
  lineTotal: number;
  lineDiscount: number;
  discountPercent: number;
  discountType: "none" | "promotion" | "pix" | "coupon" | "wholesale_40" | "wholesale_50";
};

export type StoreDiscountResult<T = unknown> = {
  lines: CalculatedDiscountLine<T>[];
  wholesaleEligibleQuantity: number;
  wholesaleDiscountPercent: 0 | 40 | 50;
  wholesaleActive: boolean;
  nextWholesaleThreshold: 15 | 25 | null;
  unitsUntilNextWholesaleTier: number;
  baseSubtotal: number;
  merchandiseSubtotal: number;
  discountAmount: number;
  discountPercent: number;
  discountRule: "none" | "promotion" | "pix" | "coupon" | "wholesale_40" | "wholesale_50";
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateStoreDiscounts<T>(
  inputLines: DiscountCartLine<T>[],
  options: {
    paymentMethod?: string;
    pixDiscountPercent?: number;
    couponDiscountPercent?: number;
  } = {},
): StoreDiscountResult<T> {
  const lines = inputLines.filter(
    (line) =>
      Number.isFinite(line.regularUnitPrice) &&
      line.regularUnitPrice >= 0 &&
      Number.isInteger(line.quantity) &&
      line.quantity > 0,
  );
  const eligibleQuantity = lines.reduce(
    (total, line) => total + (line.wholesaleEligible ? line.quantity : 0),
    0,
  );
  const wholesaleDiscountPercent: 0 | 40 | 50 =
    eligibleQuantity >= WHOLESALE_SECOND_THRESHOLD
      ? WHOLESALE_SECOND_DISCOUNT
      : eligibleQuantity >= WHOLESALE_FIRST_THRESHOLD
        ? WHOLESALE_FIRST_DISCOUNT
        : 0;
  const wholesaleActive = wholesaleDiscountPercent > 0;
  const pixPercent = Math.max(0, Number(options.pixDiscountPercent ?? DEFAULT_PIX_DISCOUNT));
  const pixActive = !wholesaleActive && options.paymentMethod === "pix" && pixPercent > 0;
  const couponPercent = Math.max(0, Number(options.couponDiscountPercent || 0));
  const couponActive = !wholesaleActive && couponPercent > 0;

  let hasPromotion = false;
  const calculated = lines.map<CalculatedDiscountLine<T>>((line) => {
    const regular = money(line.regularUnitPrice);
    const promotion =
      line.promotionalUnitPrice != null &&
      Number.isFinite(line.promotionalUnitPrice) &&
      line.promotionalUnitPrice >= 0 &&
      line.promotionalUnitPrice < regular
        ? money(line.promotionalUnitPrice)
        : null;

    let unit = regular;
    let discountPercent = 0;
    let discountType: CalculatedDiscountLine<T>["discountType"] = "none";

    if (wholesaleActive && line.wholesaleEligible) {
      unit = money(regular * (1 - wholesaleDiscountPercent / 100));
      discountPercent = wholesaleDiscountPercent;
      discountType = wholesaleDiscountPercent === 50 ? "wholesale_50" : "wholesale_40";
    } else if (!wholesaleActive && promotion != null) {
      unit = promotion;
      discountPercent = money(((regular - promotion) / regular) * 100);
      discountType = "promotion";
      hasPromotion = true;
    }

    // O Pix nunca acumula com o atacado. Sem atacado, substitui a promocao
    // somente quando produzir o menor preco para a linha.
    if (pixActive) {
      const pixUnit = money(regular * (1 - pixPercent / 100));
      if (pixUnit < unit) {
        unit = pixUnit;
        discountPercent = pixPercent;
        discountType = "pix";
      }
    }
    if (couponActive) {
      const couponUnit = money(regular * (1 - couponPercent / 100));
      if (couponUnit < unit) {
        unit = couponUnit;
        discountPercent = couponPercent;
        discountType = "coupon";
      }
    }

    const lineBaseTotal = money(regular * line.quantity);
    const lineTotal = money(unit * line.quantity);
    return {
      ...line,
      regularUnitPrice: regular,
      promotionalUnitPrice: promotion,
      appliedUnitPrice: unit,
      lineBaseTotal,
      lineTotal,
      lineDiscount: money(lineBaseTotal - lineTotal),
      discountPercent,
      discountType,
    };
  });

  const baseSubtotal = money(calculated.reduce((sum, line) => sum + line.lineBaseTotal, 0));
  const merchandiseSubtotal = money(calculated.reduce((sum, line) => sum + line.lineTotal, 0));
  const discountAmount = money(baseSubtotal - merchandiseSubtotal);
  const discountRule: StoreDiscountResult<T>["discountRule"] = wholesaleActive
    ? wholesaleDiscountPercent === 50
      ? "wholesale_50"
      : "wholesale_40"
    : pixActive && calculated.some((line) => line.discountType === "pix")
      ? "pix"
      : couponActive && calculated.some((line) => line.discountType === "coupon")
        ? "coupon"
        : hasPromotion
          ? "promotion"
          : "none";

  const nextWholesaleThreshold =
    eligibleQuantity < WHOLESALE_FIRST_THRESHOLD
      ? WHOLESALE_FIRST_THRESHOLD
      : eligibleQuantity < WHOLESALE_SECOND_THRESHOLD
        ? WHOLESALE_SECOND_THRESHOLD
        : null;

  return {
    lines: calculated,
    wholesaleEligibleQuantity: eligibleQuantity,
    wholesaleDiscountPercent,
    wholesaleActive,
    nextWholesaleThreshold,
    unitsUntilNextWholesaleTier: nextWholesaleThreshold
      ? Math.max(0, nextWholesaleThreshold - eligibleQuantity)
      : 0,
    baseSubtotal,
    merchandiseSubtotal,
    discountAmount,
    discountPercent: baseSubtotal > 0 ? money((discountAmount / baseSubtotal) * 100) : 0,
    discountRule,
  };
}
