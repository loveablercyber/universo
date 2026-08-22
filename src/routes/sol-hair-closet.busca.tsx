import React, { useState, useEffect } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product } from "@/lib/sol-data";

export const Route = createFileRoute("/sol-hair-closet/busca")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: SearchPage,
});

function SearchPage() {
  const searchParams = useSearch({ from: "/sol-hair-closet/busca" });
  const store = useStore();

  const [query, setQuery] = useState(searchParams.q || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function searchProducts() {
      if (!query.trim()) {
        setProducts([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/store?action=products&search=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    void searchProducts();
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <StoreLayout storeState={store}>
      <div className="container-shell py-10">
        {/* Barra de Busca Principal */}
        <div className="max-w-2xl mx-auto mb-12 text-center space-y-4">
          <h1 className="font-serif text-3xl sm:text-4xl text-ink-deep font-bold">
            Buscar no Catálogo
          </h1>
          <form onSubmit={handleSubmit} className="relative flex items-center rounded-full border border-copper/40 bg-warm-white p-2 shadow-lg focus-within:ring-2 focus-within:ring-copper/30">
            <Search size={20} className="text-copper ml-4 mr-2 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o nome de uma fibra, peruca, cor ou acessório..."
              className="w-full bg-transparent outline-none text-sm text-ink-deep placeholder:text-text-secondary pr-4"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-xs text-text-secondary hover:text-ink-deep px-3 py-1.5"
              >
                Limpar
              </button>
            )}
          </form>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
            <Loader2 size={32} className="animate-spin text-copper mb-3" />
            <p className="text-sm font-medium">Buscando resultados...</p>
          </div>
        ) : query ? (
          <div>
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-line">
              <p className="text-sm text-text-secondary">
                Resultados para <span className="font-bold text-ink-deep font-serif text-base">"{query}"</span> ({products.length})
              </p>
              <Link to="/sol-hair-closet/produtos" className="text-xs font-semibold text-copper hover:text-ink-deep transition">
                Ver todos os produtos →
              </Link>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 bg-warm-white rounded-3xl border border-line p-8 max-w-md mx-auto">
                <p className="font-serif text-lg font-semibold text-ink-deep">Nenhum resultado encontrado</p>
                <p className="text-xs text-text-secondary mt-1">
                  Não encontramos nenhum produto com o termo "{query}". Tente buscar por outros termos como "fibra", "lace" ou "crochet".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAdd={(item) => store.addToCart(item)}
                    onFav={(id) => store.toggleFav(id)}
                    faved={store.isFaved(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-text-secondary">
            <p className="text-sm">Digite no campo acima para pesquisar em nosso catálogo completo.</p>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
