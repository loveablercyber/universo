import React, { useState, useEffect } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Loader2, ArrowRight, Grid, Sparkles } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product, Category } from "@/lib/sol-data";

export const Route = createFileRoute("/sol-hair-closet/categoria/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = useParams({ from: "/sol-hair-closet/categoria/$slug" });
  const store = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategoryData() {
      setLoading(true);
      try {
        // Carregar categorias para pegar o título correto
        const catRes = await fetch("/api/store?action=categories");
        const catData = await catRes.json();
        if (catRes.ok && catData.ok && Array.isArray(catData.categories)) {
          const found = catData.categories.find(
            (c: Category) => c.slug === slug || c.id === slug,
          );
          if (found) setCategory(found);
        }

        // Carregar produtos da categoria
        const prodRes = await fetch(`/api/store?action=products&category=${encodeURIComponent(slug)}`);
        const prodData = await prodRes.json();
        if (prodRes.ok && prodData.ok && Array.isArray(prodData.products)) {
          setProducts(prodData.products);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    void loadCategoryData();
  }, [slug]);

  const title = category?.name || slug.replace(/-/g, " ").toUpperCase();

  return (
    <StoreLayout storeState={store}>
      {/* Banner da Categoria */}
      <div className="bg-ink-deep text-copper-light py-12 border-b border-copper/30">
        <div className="container-shell">
          <div className="flex items-center gap-2 text-xs text-cream/70 mb-3">
            <Link to="/sol-hair-closet" className="hover:text-warm-white transition">
              Início
            </Link>
            <span>/</span>
            <Link to="/sol-hair-closet/produtos" className="hover:text-warm-white transition">
              Categorias
            </Link>
            <span>/</span>
            <span className="text-copper font-medium">{title}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl uppercase tracking-wide text-cream font-bold">
            {title}
          </h1>
          {category?.description && (
            <p className="text-xs sm:text-sm text-cream/80 mt-2 max-w-2xl leading-relaxed">
              {category.description}
            </p>
          )}
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="container-shell py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-text-secondary">
            <Loader2 size={32} className="animate-spin text-copper mb-3" />
            <p className="text-sm font-medium">Carregando produtos de {title}...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-line bg-warm-white p-8">
            <p className="font-serif text-xl text-ink-deep font-semibold">
              Nenhum produto cadastrado nesta categoria
            </p>
            <p className="text-xs text-text-secondary mt-1 max-w-sm">
              Em breve novos lançamentos exclusivos serão adicionados aqui.
            </p>
            <Link
              to="/sol-hair-closet/produtos"
              className="mt-6 rounded-full bg-ink-deep px-6 py-2.5 text-xs font-semibold text-cream hover:bg-copper transition"
            >
              VER TODOS OS PRODUTOS
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-line">
              <p className="text-xs text-text-secondary font-medium">
                Exibindo <b>{products.length}</b> {products.length === 1 ? "produto" : "produtos"}
              </p>
              <Link
                to="/sol-hair-closet/produtos"
                className="text-xs font-semibold text-copper hover:text-ink-deep transition flex items-center gap-1"
              >
                Ver todas as categorias <ArrowRight size={14} />
              </Link>
            </div>

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
