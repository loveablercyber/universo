import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Loader2, ArrowRight, ShoppingBag } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product } from "@/lib/sol-data";

export const Route = createFileRoute("/sol-hair-closet/favoritos")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const store = useStore();
  const [favedProducts, setFavedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavedProducts() {
      if (store.favs.length === 0) {
        setFavedProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/store?action=products&limit=100");
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.products)) {
          const matched = data.products.filter((p: Product) =>
            store.favs.includes(p.id),
          );
          setFavedProducts(matched);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    void loadFavedProducts();
  }, [store.favs]);

  return (
    <StoreLayout storeState={store}>
      <div className="container-shell py-12">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-line">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink-deep font-bold flex items-center gap-3">
              <Heart size={28} className="text-[#B7476A]" fill="#B7476A" /> Meus Favoritos
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Seus itens salvos para comprar quando quiser.
            </p>
          </div>
          <Link
            to="/sol-hair-closet/produtos"
            className="text-xs font-semibold text-copper hover:text-ink-deep transition hidden sm:inline-flex items-center gap-1"
          >
            Continuar Comprando <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-secondary">
            <Loader2 size={32} className="animate-spin text-copper mb-3" />
            <p className="text-xs font-medium">Carregando seus favoritos...</p>
          </div>
        ) : favedProducts.length === 0 ? (
          <div className="text-center py-20 bg-warm-white rounded-3xl border border-line p-8 max-w-md mx-auto">
            <div className="h-16 w-16 rounded-full bg-blush flex items-center justify-center text-[#B7476A] mx-auto mb-4">
              <Heart size={28} />
            </div>
            <p className="font-serif text-xl font-bold text-ink-deep">Nenhum favorito salvo</p>
            <p className="text-xs text-text-secondary mt-1">
              Clique no ícone de coração nos produtos para salvá-los nesta lista.
            </p>
            <Link
              to="/sol-hair-closet/produtos"
              className="mt-6 inline-block rounded-full bg-ink-deep px-6 py-2.5 text-xs font-semibold text-cream hover:bg-copper transition"
            >
              EXPLORAR PRODUTOS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {favedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAdd={(item) => store.addToCart(item)}
                onFav={(id) => store.toggleFav(id)}
                faved={true}
              />
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
