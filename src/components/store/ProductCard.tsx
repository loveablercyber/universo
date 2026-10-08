import React from "react";
import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Star } from "lucide-react";
import type { Product } from "@/lib/sol-data";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProductCard({
  product,
  onAdd,
  onFav,
  faved,
}: {
  product: Product;
  onAdd?: (p: Product) => void;
  onFav?: (id: string) => void;
  faved?: boolean;
}) {
  const activeVariants = (product.variants || []).filter((variant) => variant.status === "active");
  const availableVariants = activeVariants.filter((variant) => variant.stockQuantity > 0);
  const variantPrices = availableVariants.map((variant) =>
    Number(
      variant.promotionalPriceOverride ??
        variant.priceOverride ??
        product.promotionalPrice ??
        product.price,
    ),
  );
  const currentPrice = variantPrices.length
    ? Math.min(...variantPrices)
    : Number(product.promotionalPrice ?? product.price);
  const oldPrice =
    !activeVariants.length && product.promotionalPrice ? Number(product.price) : null;
  const isOutOfStock = activeVariants.length
    ? availableVariants.length === 0
    : product.stockQuantity <= 0;
  const summaryVariant = availableVariants[0] || activeVariants[0];
  const variantSummary = summaryVariant
    ? [
        summaryVariant.weightG ? `${summaryVariant.weightG} g` : null,
        summaryVariant.lengthCm ? `${summaryVariant.lengthCm} cm` : null,
        summaryVariant.texture || null,
      ]
        .filter(Boolean)
        .join(" • ")
    : "";
  const productSummary = variantSummary || product.info || "";

  const badgeTone = product.badge
    ? {
        gold: "bg-gold-soft text-ink-deep",
        cream: "bg-cream text-ink-deep border border-copper/30",
        copper: "bg-copper text-warm-white",
        rose: "bg-[#CB9A7B] text-[#4B3628]",
      }[product.badge.tone]
    : "bg-copper text-warm-white";

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden border border-line bg-[#FAF7F2] shadow-[0_5px_18px_-16px_rgba(75,54,40,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:border-copper/50 hover:shadow-[0_10px_24px_-18px_rgba(75,54,40,0.55)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-blush">
        <Link
          to="/sol-hair-closet/produto/$slug"
          params={{ slug: product.slug || product.id }}
          className="block h-full w-full"
        >
          <img
            src={product.image || "/images/produto-fibra-russa.jpg"}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
            loading="lazy"
          />
        </Link>

        {product.badge?.label && (
          <span
            className={`absolute left-2 top-2 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] sm:left-3 sm:top-3 sm:text-[9px] ${badgeTone}`}
          >
            {product.badge.label}
          </span>
        )}

        {isOutOfStock && (
          <span className="absolute bottom-2 left-2 bg-ink-deep/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-warm-white">
            Esgotado
          </span>
        )}

        {onFav && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onFav(product.id);
            }}
            aria-label={faved ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border border-line bg-warm-white/95 text-ink-deep shadow-sm transition-transform hover:text-copper active:scale-90 sm:right-3 sm:top-3"
          >
            <Heart
              size={16}
              strokeWidth={1.5}
              fill={faved ? "#CB9A7B" : "none"}
              className={faved ? "text-[#CB9A7B]" : ""}
            />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <Link
          to="/sol-hair-closet/produto/$slug"
          params={{ slug: product.slug || product.id }}
          className="group-hover:text-copper transition-colors"
        >
          <h3 className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink-deep sm:text-[14px]">
            {product.name}
          </h3>
        </Link>

        {productSummary && (
          <p className="mt-1 truncate text-[10px] text-text-secondary sm:text-[11px]">
            {productSummary}
          </p>
        )}
        {product.wholesaleEligible && (
          <p className="mt-2 rounded-lg bg-copper/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-copper">
            Atacado: 40% a partir de 15 • 50% a partir de 25
          </p>
        )}

        {product.reviews > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <div className="flex text-copper">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  size={10}
                  fill="currentColor"
                  strokeWidth={0}
                  className={i < Math.floor(product.rating) ? "" : "opacity-25"}
                />
              ))}
            </div>
            <span className="font-mono text-[9px] text-text-secondary">({product.reviews})</span>
          </div>
        )}

        <div className="mt-auto pt-2.5">
          {variantPrices.length > 1 && (
            <p className="text-[8px] uppercase tracking-wider text-text-secondary">A partir de</p>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-[15px] font-bold text-ink-deep sm:text-xl">{fmt(currentPrice)}</p>
            {oldPrice && (
              <span className="text-xs text-text-secondary line-through">{fmt(oldPrice)}</span>
            )}
          </div>
          <p className="mt-0.5 text-[8px] font-semibold tracking-wide text-copper sm:text-[10px]">
            5% OFF NO PIX · {fmt(currentPrice * 0.95)}
          </p>

          <div className="mt-2.5 flex gap-2 sm:mt-4">
            {onAdd && !isOutOfStock && !product.variants?.length ? (
              <button
                onClick={() => onAdd(product)}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 bg-ink-deep px-2 py-2 text-[8px] font-semibold tracking-[0.13em] text-cream transition-colors hover:bg-copper active:scale-[0.98] sm:text-[10px]"
              >
                ADICIONAR <ShoppingBag size={13} strokeWidth={1.5} />
              </button>
            ) : (
              <Link
                to="/sol-hair-closet/produto/$slug"
                params={{ slug: product.slug || product.id }}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 border border-ink-deep px-2 py-2 text-[8px] font-semibold tracking-[0.13em] text-ink-deep transition-colors hover:bg-blush sm:text-[10px]"
              >
                {isOutOfStock ? "VER DETALHES" : "ESCOLHER"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
