import React from "react";
import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, ShoppingBag, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import type { CartItem } from "@/hooks/use-store";
import { FREE_SHIPPING_THRESHOLD } from "@/hooks/use-store";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CartDrawer({
  open,
  onClose,
  cart,
  onSetQty,
  onRemove,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onSetQty: (productId: string, variantId: string | null | undefined, qty: number) => void;
  onRemove: (productId: string, variantId?: string | null) => void;
  onCheckout: () => void;
}) {
  if (!open) return null;

  const subtotal = cart.reduce((acc, item) => {
    const price = item.variant
      ? Number(item.variant.promotionalPriceOverride ?? item.variant.priceOverride ?? item.product.promotionalPrice ?? item.product.price)
      : Number(item.product.promotionalPrice ?? item.product.price);
    return acc + price * item.qty;
  }, 0);

  const missingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const pixTotal = subtotal * 0.95;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-deep/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <aside className="w-screen max-w-md bg-warm-white shadow-2xl flex flex-col border-l border-line">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-cream/40">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} className="text-copper" />
              <h2 className="font-serif text-xl tracking-wide uppercase text-ink-deep font-semibold">
                Sua Sacola ({cart.reduce((a, b) => a + b.qty, 0)})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-ink-deep/70 hover:bg-blush hover:text-ink-deep transition"
              aria-label="Fechar sacola"
            >
              <X size={20} />
            </button>
          </div>

          {/* Frete Grátis Bar */}
          <div className="px-6 py-3 bg-blush/60 border-b border-line">
            {missingForFreeShipping > 0 ? (
              <p className="text-xs text-ink-deep font-medium">
                Faltam <span className="font-bold text-copper">{fmt(missingForFreeShipping)}</span> para{" "}
                <span className="font-bold">Frete Grátis!</span>
              </p>
            ) : (
              <p className="text-xs text-[#2E7D32] font-semibold flex items-center gap-1.5">
                <Sparkles size={14} /> Parabéns! Você ganhou Frete Grátis!
              </p>
            )}
            <div className="mt-2 h-1.5 w-full rounded-full bg-copper/20 overflow-hidden">
              <div
                className="h-full bg-copper transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-line">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-blush flex items-center justify-center text-copper mb-4">
                  <ShoppingBag size={28} />
                </div>
                <p className="font-serif text-lg text-ink-deep font-medium">Sua sacola está vazia</p>
                <p className="text-xs text-text-secondary mt-1 max-w-xs">
                  Explore nossas coleções exclusivas de fibras, laces e acessórios de alta qualidade.
                </p>
                <Link
                  to="/sol-hair-closet/produtos"
                  onClick={onClose}
                  className="mt-6 rounded-full bg-ink-deep px-6 py-2.5 text-[11px] tracking-[0.2em] font-semibold text-cream hover:bg-copper transition"
                >
                  VER PRODUTOS
                </Link>
              </div>
            ) : (
              cart.map((item, idx) => {
                const itemPrice = item.variant
                  ? Number(item.variant.promotionalPriceOverride ?? item.variant.priceOverride ?? item.product.promotionalPrice ?? item.product.price)
                  : Number(item.product.promotionalPrice ?? item.product.price);

                return (
                  <div key={`${item.product.id}-${item.variant?.id || "base"}-${idx}`} className="pt-4 first:pt-0 flex gap-4">
                    <img
                      src={item.variant?.imageUrl || item.product.image || "/images/produto-fibra-russa.jpg"}
                      alt={item.product.name}
                      className="h-20 w-20 rounded-xl object-cover border border-line bg-blush shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[13px] font-medium text-ink-deep leading-tight truncate">
                          {item.product.name}
                        </h4>
                        {item.variant ? (
                          <span className="inline-block mt-0.5 rounded bg-blush px-2 py-0.5 text-[10px] font-medium text-copper">
                            {item.variant.title}
                          </span>
                        ) : item.product.info ? (
                          <p className="text-[11px] text-text-secondary truncate mt-0.5">
                            {item.product.info}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-line rounded-full bg-warm-white">
                          <button
                            onClick={() => onSetQty(item.product.id, item.variant?.id, item.qty - 1)}
                            className="p-1.5 text-ink-deep hover:text-copper transition"
                            aria-label="Diminuir"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2 text-xs font-semibold font-mono">{item.qty}</span>
                          <button
                            onClick={() => onSetQty(item.product.id, item.variant?.id, item.qty + 1)}
                            className="p-1.5 text-ink-deep hover:text-copper transition"
                            aria-label="Aumentar"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-[13px] font-semibold text-ink-deep">
                            {fmt(itemPrice * item.qty)}
                          </p>
                          <button
                            onClick={() => onRemove(item.product.id, item.variant?.id)}
                            className="text-[10px] text-text-secondary hover:text-[#B7476A] tracking-wider transition underline"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.length > 0 && (
            <div className="border-t border-line p-6 bg-cream/40 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span className="font-semibold text-ink-deep">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Frete</span>
                  <span>
                    {missingForFreeShipping === 0 ? (
                      <span className="font-semibold text-[#2E7D32]">GRÁTIS</span>
                    ) : (
                      "Calculado no checkout"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-copper font-medium pt-1 border-t border-line/50">
                  <span>À vista no Pix (5% OFF)</span>
                  <span className="font-bold">{fmt(pixTotal)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onCheckout();
                }}
                className="w-full rounded-full bg-ink-deep py-3.5 text-[11px] tracking-[0.25em] font-semibold text-cream hover:bg-copper transition flex items-center justify-center gap-2 shadow-lg shadow-ink-deep/10 active:scale-[0.98]"
              >
                FINALIZAR COMPRA <ArrowRight size={16} />
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-text-secondary pt-1">
                <ShieldCheck size={14} className="text-[#2E7D32]" />
                <span>Ambiente 100% seguro com garantia SumUp</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
