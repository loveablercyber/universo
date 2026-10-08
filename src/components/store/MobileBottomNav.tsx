import { Link, useRouterState } from "@tanstack/react-router";
import { Grid2X2, Heart, House, ShoppingBag, User } from "lucide-react";

export function MobileBottomNav({
  cartCount,
  favoriteCount,
  onOpenCategories,
  onOpenCart,
}: {
  cartCount: number;
  favoriteCount: number;
  onOpenCategories: () => void;
  onOpenCart: () => void;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const itemClass = (active: boolean) =>
    `relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[8px] font-semibold uppercase tracking-[0.08em] transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-copper ${
      active ? "text-copper" : "text-ink-deep/65 hover:text-copper"
    }`;

  return (
    <nav
      aria-label="Navegação móvel da loja"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#FAF7F2]/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_-18px_rgba(75,54,40,0.45)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        <Link
          to="/store"
          className={itemClass(pathname === "/store" || pathname === "/sol-hair-closet")}
        >
          <House size={18} strokeWidth={1.5} aria-hidden />
          <span>Início</span>
        </Link>
        <button type="button" onClick={onOpenCategories} className={itemClass(false)}>
          <Grid2X2 size={18} strokeWidth={1.5} aria-hidden />
          <span>Categorias</span>
        </button>
        <button type="button" onClick={onOpenCart} className={itemClass(false)}>
          <ShoppingBag size={18} strokeWidth={1.5} aria-hidden />
          <span>Carrinho</span>
          {cartCount > 0 ? (
            <span className="absolute right-[23%] top-1 grid h-4 min-w-4 place-items-center rounded-full bg-copper px-1 text-[8px] text-white">
              {cartCount}
            </span>
          ) : null}
        </button>
        <Link to="/sol-hair-closet/favoritos" className={itemClass(pathname.includes("favoritos"))}>
          <Heart size={18} strokeWidth={1.5} aria-hidden />
          <span>Favoritos</span>
          {favoriteCount > 0 ? (
            <span className="absolute right-[23%] top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#CB9A7B] px-1 text-[8px] font-bold text-[#4B3628]">
              {favoriteCount}
            </span>
          ) : null}
        </Link>
        <Link to="/sol-hair-closet/conta" className={itemClass(pathname.includes("conta"))}>
          <User size={18} strokeWidth={1.5} aria-hidden />
          <span>Minha conta</span>
        </Link>
      </div>
    </nav>
  );
}
