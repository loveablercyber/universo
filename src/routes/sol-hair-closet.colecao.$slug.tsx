import React, { useState, useEffect } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product } from "@/lib/sol-data";

export const Route = createFileRoute("/sol-hair-closet/colecao/$slug")({
  component: CollectionPage,
});

function CollectionPage() {
  const { slug } = useParams({ from: "/sol-hair-closet/colecao/$slug" });
  const store = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollection() {
      setLoading(true);
      try {
        const res = await fetch(`/api/store?action=products&category=${encodeURIComponent(slug)}`);
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
    void loadCollection();
  }, [slug]);

  const collectionTitle = slug === "perucas" ? "Coleção de Perucas & Laces" : slug.replace(/-/g, " ").toUpperCase();

  return (
    <StoreLayout storeState={store}>
      <div className="relative overflow-hidden bg-gradient-to-r from-ink via-ink-deep to-ink text-cream py-16 px-6">
        <div className="container-shell text-center max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-copper/40 bg-blush/10 px-4 py-1 text-xs font-semibold text-copper-light uppercase tracking-widest">
            <Sparkles size={14} /> Coleção Exclusiva Sol Hair Closet
          </div>
          <h1 className="font-serif text-4xl sm:text-6xl uppercase tracking-wider text-copper-light font-bold">
            {collectionTitle}
          </h1>
          <p className="text-xs sm:text-sm text-cream/80 leading-relaxed max-w-xl mx-auto">
            Modelos modernos, cores incríveis, movimento natural e acabamento invisível.
          </p>
        </div>
      </div>

      <div className="container-shell py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-secondary">
            <Loader2 size={32} className="animate-spin text-copper mb-3" />
            <p className="text-sm font-medium">Carregando itens da coleção...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-warm-white rounded-3xl border border-line p-8 max-w-md mx-auto">
            <p className="font-serif text-xl font-bold text-ink-deep">Coleção em atualização</p>
            <p className="text-xs text-text-secondary mt-1">
              Novas peças serão disponibilizadas em breve nesta coleção.
            </p>
            <Link
              to="/sol-hair-closet/produtos"
              className="mt-6 inline-block rounded-full bg-ink-deep px-6 py-2.5 text-xs font-semibold text-cream hover:bg-copper transition"
            >
              VER CATÁLOGO GERAL
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-xs text-text-secondary mb-6 font-medium">
              {products.length} {products.length === 1 ? "produto disponível" : "produtos disponíveis"}
            </p>
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
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
