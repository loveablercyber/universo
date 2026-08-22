import React, { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Menu,
  Search,
  Heart,
  ShoppingBag,
  User,
  Truck,
  CreditCard,
  MessageCircle,
  ShieldCheck,
  RefreshCw,
  Award,
  Instagram,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { CartDrawer } from "./CartDrawer";
import { SearchDrawer } from "./SearchDrawer";
import { CategoryDrawer } from "./CategoryDrawer";
import { CheckoutModal } from "./CheckoutModal";

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/sol-hair-closet" className="flex flex-col items-center leading-none select-none group">
      <div
        className={`font-serif tracking-[0.15em] transition-transform group-hover:scale-105 ${
          compact ? "text-2xl" : "text-3xl sm:text-4xl"
        }`}
        style={{ color: "var(--rose-gold, #C89352)" }}
      >
        S
        <span className="relative inline-block">
          O
          <span aria-hidden className="absolute -top-1 -right-1 text-copper text-[0.55em]">
            ❋
          </span>
        </span>
        L
      </div>
      <div className="mt-1 flex items-center gap-2 text-[9px] sm:text-[10px] tracking-[0.35em] text-copper font-medium">
        <span>✦</span>
        <span>HAIR CLOSET</span>
        <span>✦</span>
      </div>
    </Link>
  );
}

export function StoreLayout({
  children,
  storeState,
}: {
  children: ReactNode;
  storeState: ReturnType<typeof useStore>;
}) {
  const store = storeState;

  return (
    <div className="theme-sol min-h-dvh bg-cream text-text-primary flex flex-col selection:bg-copper selection:text-warm-white">
      {/* Top Banner de Benefícios */}
      <div className="bg-ink text-copper-light">
        <div className="container-shell grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-copper/20 text-[10px] sm:text-[11px] tracking-[0.15em] font-medium">
          <div className="flex items-center justify-center gap-2 py-2.5">
            <Truck size={14} strokeWidth={1.5} className="text-copper-light" />
            <span>ENVIO RÁPIDO PARA TODO O BRASIL</span>
          </div>
          <div className="flex items-center justify-center gap-2 py-2.5">
            <CreditCard size={14} strokeWidth={1.5} className="text-copper-light" />
            <span>PARCELE EM ATÉ 12X OU 5% OFF NO PIX</span>
          </div>
          <div className="flex items-center justify-center gap-2 py-2.5">
            <MessageCircle size={14} strokeWidth={1.5} className="text-copper-light" />
            <span>ATENDIMENTO PERSONALIZADO</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-warm-white/95 backdrop-blur-md border-b border-line shadow-sm">
        <div className="container-shell grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4 lg:py-5">
          {/* Lado Esquerdo: Menu Categorias */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => store.setOpenDrawer("cat")}
              className="flex items-center gap-2 text-ink-deep hover:text-copper transition-colors"
              aria-label="Abrir menu de categorias"
            >
              <Menu size={22} strokeWidth={1.5} />
              <span className="hidden sm:inline text-[11px] tracking-[0.2em] font-semibold uppercase">
                CATEGORIAS
              </span>
            </button>
            <Link
              to="/sol-hair-closet/produtos"
              className="hidden md:inline-flex text-[11px] tracking-[0.2em] text-ink-mid hover:text-copper uppercase font-medium"
            >
              PRODUTOS
            </Link>
          </div>

          {/* Centro: Logotipo */}
          <Logo />

          {/* Lado Direito: Ações */}
          <div className="flex items-center justify-end gap-3 sm:gap-5 text-ink-deep">
            <button
              onClick={() => store.setOpenDrawer("search")}
              className="p-1.5 hover:text-copper transition"
              aria-label="Buscar produtos"
            >
              <Search size={20} strokeWidth={1.5} />
            </button>

            <Link
              to="/sol-hair-closet/favoritos"
              className="relative p-1.5 hover:text-copper transition"
              aria-label="Meus favoritos"
            >
              <Heart size={20} strokeWidth={1.5} />
              {store.favs.length > 0 && (
                <span className="absolute 0 top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B7476A] px-1 text-[9px] font-bold text-warm-white">
                  {store.favs.length}
                </span>
              )}
            </Link>

            <Link
              to="/sol-hair-closet/conta"
              className="p-1.5 hover:text-copper transition hidden sm:inline-flex"
              aria-label="Minha conta"
            >
              <User size={20} strokeWidth={1.5} />
            </Link>

            <button
              onClick={() => store.setOpenDrawer("cart")}
              className="relative p-1.5 hover:text-copper transition"
              aria-label="Sacola de compras"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {store.cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper px-1 text-[10px] font-bold text-warm-white animate-pulse">
                  {store.cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo da Página */}
      <main className="flex-1">{children}</main>

      {/* Benefícios do Rodapé */}
      <section className="bg-ink text-cream mt-16 border-t border-copper/30">
        <div className="container-shell grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-copper/20">
          <div className="flex items-start gap-3 px-5 py-6">
            <ShieldCheck size={26} strokeWidth={1.3} className="text-copper-light shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] tracking-[0.2em] font-semibold text-copper-light uppercase">
                PAGAMENTO SEGURO
              </p>
              <p className="text-[11px] text-cream/70 mt-1 leading-relaxed">
                Ambiente 100% protegido e criptografado
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 px-5 py-6">
            <RefreshCw size={26} strokeWidth={1.3} className="text-copper-light shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] tracking-[0.2em] font-semibold text-copper-light uppercase">
                TROCA FACILITADA
              </p>
              <p className="text-[11px] text-cream/70 mt-1 leading-relaxed">
                Garantia e suporte pós-venda dedicado
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 px-5 py-6">
            <MessageCircle size={26} strokeWidth={1.3} className="text-copper-light shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] tracking-[0.2em] font-semibold text-copper-light uppercase">
                ATENDIMENTO HUMANIZADO
              </p>
              <p className="text-[11px] text-cream/70 mt-1 leading-relaxed">
                Especialistas prontas para te ajudar via WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 px-5 py-6">
            <Award size={26} strokeWidth={1.3} className="text-copper-light shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] tracking-[0.2em] font-semibold text-copper-light uppercase">
                QUALIDADE PREMIUM
              </p>
              <p className="text-[11px] text-cream/70 mt-1 leading-relaxed">
                Fibras e laces testadas e aprovadas por Carol Sol
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Principal */}
      <footer className="bg-ink-deep text-copper-light border-t border-copper/20">
        <div className="container-shell grid grid-cols-1 md:grid-cols-3 items-center gap-6 py-8 divide-y md:divide-y-0 md:divide-x divide-copper/20">
          <div className="flex md:justify-start justify-center">
            <Logo compact />
          </div>

          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] tracking-[0.2em] font-medium py-4 md:py-0 uppercase">
            <Link to="/sol-hair-closet" className="hover:text-warm-white transition-colors">
              INÍCIO
            </Link>
            <Link to="/sol-hair-closet/produtos" className="hover:text-warm-white transition-colors">
              CATÁLOGO
            </Link>
            <Link to="/sol-hair-closet/favoritos" className="hover:text-warm-white transition-colors">
              FAVORITOS
            </Link>
            <Link to="/sol-hair-closet/pedidos" className="hover:text-warm-white transition-colors">
              MEUS PEDIDOS
            </Link>
            <Link to="/sol-hair-closet/conta" className="hover:text-warm-white transition-colors">
              MINHA CONTA
            </Link>
            <Link to="/sobre" className="hover:text-warm-white transition-colors">
              SOBRE
            </Link>
          </nav>

          <div className="flex md:justify-end justify-center gap-5 text-copper-light">
            <a
              href="https://www.instagram.com/carolsolhair/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram Carol Sol"
              className="hover:text-warm-white transition"
            >
              <Instagram size={18} strokeWidth={1.5} />
            </a>
            <a
              href="https://wa.me/5514998373935"
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp Atendimento"
              className="hover:text-warm-white transition"
            >
              <MessageCircle size={18} strokeWidth={1.5} />
            </a>
          </div>
        </div>

        <div className="border-t border-copper/10 py-4 text-center text-[10px] text-cream/50 tracking-wider">
          © {new Date().getFullYear()} Sol Hair Closet — Universo Carol Sol. Todos os direitos reservados.
        </div>
      </footer>

      {/* Drawers e Modais */}
      <CategoryDrawer
        open={store.openDrawer === "cat"}
        onClose={() => store.setOpenDrawer(null)}
      />

      <SearchDrawer
        open={store.openDrawer === "search"}
        onClose={() => store.setOpenDrawer(null)}
      />

      <CartDrawer
        open={store.openDrawer === "cart"}
        onClose={() => store.setOpenDrawer(null)}
        cart={store.cart}
        onSetQty={store.setItemQty}
        onRemove={store.removeFromCart}
        onCheckout={() => store.setShowCheckoutModal(true)}
      />

      {store.showCheckoutModal && (
        <CheckoutModal
          cart={store.cart}
          onClose={() => store.setShowCheckoutModal(false)}
          onOrderSuccess={() => {
            store.clearCart();
            store.setShowCheckoutModal(false);
          }}
        />
      )}

      {/* Toast Alert */}
      {store.toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink-deep text-cream px-6 py-3 text-xs tracking-wider font-semibold shadow-2xl border border-copper/40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles size={14} className="text-copper" />
          <span>{store.toastMessage}</span>
        </div>
      )}
    </div>
  );
}
