import React, { useState, useEffect } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Filter, SlidersHorizontal, Loader2, ArrowRight, Grid, Sparkles } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product, Category } from "@/lib/sol-data";

export const Route = createFileRoute("/sol-hair-closet/produtos")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === "string" ? search.category : undefined,
    sort: typeof search.sort === "string" ? search.sort : "best_selling",
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const searchParams = useSearch({ from: "/sol-hair-closet/produtos" });
  const store = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.category || "");
  const [selectedSort, setSelectedSort] = useState<string>(searchParams.sort || "best_selling");
  const [priceRange, setPriceRange] = useState<number>(1000);

  // Carregar categorias
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/store?action=categories");
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      } catch {
        /* ignore */
      }
    }
    void loadCategories();
  }, []);

  // Carregar produtos conforme filtros
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ action: "products" });
        if (selectedCategory) params.append("category", selectedCategory);
        if (selectedSort) params.append("sort", selectedSort);

        const res = await fetch(`/api/store?${params.toString()}`);
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
    void loadProducts();
  }, [selectedCategory, selectedSort]);

  const filteredProducts = products.filter((p) => {
    const price = Number(p.promotionalPrice ?? p.price);
    return price <= priceRange;
  });

  return (
    <StoreLayout storeState={store}>
      <div className="container-shell py-8">
        {/* Breadcrumb e Título */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
              <Link to="/sol-hair-closet" className="hover:text-copper transition">
                Início
              </Link>
              <span>/</span>
              <span className="text-ink-deep font-medium">Catálogo de Produtos</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide text-ink-deep font-bold">
              Todos os Produtos
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-xl">
              Fibras russas, perucas, laces, apliques e acessórios profissionais de alta durabilidade e acabamento natural.
            </p>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">Ordenar por:</span>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="rounded-full border border-line bg-warm-white px-4 py-2 text-xs font-medium text-ink-deep outline-none focus:border-copper shadow-sm cursor-pointer"
            >
              <option value="best_selling">Mais Vendidos</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
              <option value="newest">Lançamentos / Recentes</option>
              <option value="rating">Melhor Avaliados</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar de Filtros */}
          <aside className="space-y-6">
            {/* Categorias Filter */}
            <div className="rounded-2xl border border-line bg-warm-white p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold tracking-wider uppercase text-ink-deep flex items-center gap-2 pb-3 border-b border-line">
                <Grid size={14} className="text-copper" /> Categorias
              </h3>
              <div className="space-y-1.5 text-xs">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`w-full text-left px-3 py-2 rounded-xl transition font-medium flex items-center justify-between ${
                    selectedCategory === ""
                      ? "bg-copper text-warm-white font-bold"
                      : "text-ink-deep hover:bg-blush"
                  }`}
                >
                  <span>Todas as Categorias</span>
                  <span>{products.length}</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug || cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition font-medium flex items-center justify-between ${
                      selectedCategory === cat.slug || selectedCategory === cat.id
                        ? "bg-copper text-warm-white font-bold"
                        : "text-ink-deep hover:bg-blush"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.productCount !== undefined && (
                      <span className="text-[10px] opacity-80">({cat.productCount})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Faixa de Preço */}
            <div className="rounded-2xl border border-line bg-warm-white p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold tracking-wider uppercase text-ink-deep flex items-center gap-2 pb-3 border-b border-line">
                <SlidersHorizontal size={14} className="text-copper" /> Faixa de Preço
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-mono font-semibold text-ink-deep">
                  <span>Até R$ {priceRange}</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={1000}
                  step={10}
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full accent-copper cursor-pointer"
                />
              </div>
            </div>

            {/* Banner de Frete Grátis */}
            <div className="rounded-2xl bg-gradient-to-br from-ink-deep to-ink text-cream p-5 text-center space-y-2 border border-copper/30">
              <Sparkles size={22} className="text-copper-light mx-auto" />
              <p className="font-serif text-lg font-bold text-copper-light">Frete Grátis</p>
              <p className="text-[11px] text-cream/80">Em compras a partir de R$ 299,90 para todo o Brasil.</p>
            </div>
          </aside>

          {/* Grid de Produtos */}
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-28 text-text-secondary">
                <Loader2 size={32} className="animate-spin text-copper mb-3" />
                <p className="text-sm font-medium">Carregando produtos da Sol Hair Closet...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-line bg-warm-white p-8">
                <p className="font-serif text-xl text-ink-deep font-semibold">Nenhum produto encontrado</p>
                <p className="text-xs text-text-secondary mt-1 max-w-sm">
                  Não encontramos produtos correspondentes aos filtros selecionados. Tente limpar os filtros.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory("");
                    setPriceRange(1000);
                  }}
                  className="mt-6 rounded-full bg-ink-deep px-6 py-2.5 text-xs font-semibold text-cream hover:bg-copper transition"
                >
                  LIMPAR FILTROS
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-text-secondary mb-4 font-medium">
                  Exibindo <b>{filteredProducts.length}</b> {filteredProducts.length === 1 ? "produto" : "produtos"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredProducts.map((p) => (
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
        </div>
      </div>
    </StoreLayout>
  );
}
