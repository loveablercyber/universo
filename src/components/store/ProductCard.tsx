import React from "react";
import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Star } from "lucide-react";
import type { Product } from "@/lib/sol-data";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const currentPrice = Number(product.promotionalPrice ?? product.price);
  const oldPrice = product.promotionalPrice ? Number(product.price) : null;
  const isOutOfStock = product.stockQuantity <= 0;

  const badgeTone = product.badge
    ? {
        gold: "bg-gold-soft text-ink-deep",
        cream: "bg-cream text-ink-deep border border-copper/30",
        copper: "bg-copper text-warm-white",
        rose: "bg-[#B7476A] text-warm-white",
      }[product.badge.tone]
    : "bg-copper text-warm-white";

  return (
    <article className="group flex flex-col rounded-2xl bg-warm-white border border-line overflow-hidden shadow-[0_2px_18px_-8px_rgba(87,48,29,0.12)] hover:shadow-[0_8px_30px_-10px_rgba(87,48,29,0.22)] transition-all duration-300">
      <div className="relative aspect-square bg-blush overflow-hidden">
        <Link
          to="/sol-hair-closet/produto/$slug"
          params={{ slug: product.slug || product.id }}
          className="block h-full w-full"
        >
          <img
            src={product.image || "/images/produto-fibra-russa.jpg"}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {product.badge?.label && (
          <span
            className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[9px] tracking-[0.15em] font-semibold uppercase ${badgeTone}`}
          >
            {product.badge.label}
          </span>
        )}

        {isOutOfStock && (
          <span className="absolute bottom-3 left-3 rounded-full bg-ink-deep/90 text-warm-white px-3 py-1 text-[10px] tracking-wider uppercase font-semibold">
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
            className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-warm-white/90 text-ink-deep hover:text-copper shadow-sm transition-transform active:scale-90"
          >
            <Heart
              size={16}
              strokeWidth={1.5}
              fill={faved ? "#B7476A" : "none"}
              className={faved ? "text-[#B7476A]" : ""}
            />
          </button>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 sm:p-5">
        <Link
          to="/sol-hair-closet/produto/$slug"
          params={{ slug: product.slug || product.id }}
          className="group-hover:text-copper transition-colors"
        >
          <h3 className="text-[14px] sm:text-[15px] font-medium text-ink-deep leading-snug line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {product.info && (
          <p className="mt-1 text-[11px] text-text-secondary truncate">{product.info}</p>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex text-copper">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                size={12}
                fill="currentColor"
                strokeWidth={0}
                className={i < Math.floor(product.rating || 5) ? "" : "opacity-25"}
              />
            ))}
          </div>
          <span className="text-[11px] text-text-secondary font-mono">
            ({product.reviews || 0})
          </span>
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <p className="font-serif text-xl sm:text-2xl text-ink-deep font-semibold">
              {fmt(currentPrice)}
            </p>
            {oldPrice && (
              <span className="text-xs text-text-secondary line-through">
                {fmt(oldPrice)}
              </span>
            )}
          </div>
          <p className="text-[10px] tracking-wider text-copper font-medium mt-0.5">
            5% OFF NO PIX: {fmt(currentPrice * 0.95)}
          </p>

          <div className="mt-4 flex gap-2">
            {onAdd && !isOutOfStock ? (
              <button
                onClick={() => onAdd(product)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-ink-deep px-4 py-2.5 text-[10px] sm:text-[11px] tracking-[0.2em] font-semibold text-cream hover:bg-copper transition-colors active:scale-95"
              >
                COMPRAR <ShoppingBag size={14} strokeWidth={1.5} />
              </button>
            ) : (
              <Link
                to="/sol-hair-closet/produto/$slug"
                params={{ slug: product.slug || product.id }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-[10px] sm:text-[11px] tracking-[0.2em] font-semibold text-ink-deep hover:bg-blush transition-colors"
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
