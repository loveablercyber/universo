import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Award,
  Wind,
  Users,
  Truck,
  Loader2,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product, Category } from "@/lib/sol-data";

export const Route = createFileRoute("/sol-hair-closet/")({
  component: StoreHomePage,
});

function StoreHomePage() {
  const store = useStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch("/api/store?action=categories"),
          fetch("/api/store?action=products&limit=8&sort=best_selling"),
        ]);

        const catData = await catRes.json();
        const prodData = await prodRes.json();

        if (catRes.ok && catData.ok && Array.isArray(catData.categories)) {
          setCategories(catData.categories);
        }
        if (prodRes.ok && prodData.ok && Array.isArray(prodData.products)) {
          setFeaturedProducts(prodData.products);
        }
      } catch {
        /* fallback */
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  return (
    <StoreLayout storeState={store}>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blush via-cream to-cream py-16 sm:py-24 border-b border-line">
        <div className="container-shell grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-copper/30 bg-warm-white/80 px-4 py-1.5 text-xs font-semibold tracking-widest text-copper uppercase shadow-sm">
              <Sparkles size={14} /> Fibras & Laces Premium
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl text-ink-deep font-bold leading-tight uppercase tracking-tight">
              Cabelos que <br />
              <span style={{ color: "var(--rose-gold, #C89352)" }}>Transformam</span>
            </h1>

            <p className="text-sm sm:text-base text-text-secondary max-w-lg leading-relaxed mx-auto lg:mx-0">
              A maior seleção de fibras russas, perucas, laces, apliques e acessórios selecionados pessoalmente por Carol Sol para realçar sua beleza natural.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to="/sol-hair-closet/produtos"
                className="w-full sm:w-auto rounded-full bg-ink-deep px-8 py-4 text-xs tracking-[0.25em] font-semibold text-cream hover:bg-copper transition shadow-lg shadow-ink-deep/15 flex items-center justify-center gap-2 active:scale-95"
              >
                EXPLORAR CATÁLOGO <ArrowRight size={16} />
              </Link>
              <Link
                to="/sol-hair-closet/categoria/$slug"
                params={{ slug: "fibra-russa" }}
                className="w-full sm:w-auto rounded-full border border-line bg-warm-white px-8 py-4 text-xs tracking-[0.25em] font-semibold text-ink-deep hover:bg-blush transition text-center"
              >
                FIBRA RUSSA
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] lg:aspect-square rounded-3xl overflow-hidden shadow-2xl border border-line bg-blush">
            <img
              src="/images/banner-perucas-sol.jpg"
              alt="Carol Sol Hair Closet"
              className="h-full w-full object-cover object-center"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-deep/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-warm-white">
              <p className="font-serif text-xl sm:text-2xl font-bold">Qualidade & Acabamento Invisível</p>
              <p className="text-xs text-warm-white/80 mt-1">Desenvolvido para profissionais e entusiastas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias em Destaque */}
      {categories.length > 0 && (
        <section className="container-shell py-14">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold tracking-widest text-copper uppercase">Navegue por</p>
              <h2 className="font-serif text-3xl uppercase tracking-wide text-ink-deep font-bold mt-1">
                Categorias
              </h2>
            </div>
            <Link
              to="/sol-hair-closet/produtos"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-copper hover:text-ink-deep transition tracking-wider uppercase"
            >
              Ver Todas <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/sol-hair-closet/categoria/$slug"
                params={{ slug: c.slug || c.id }}
                className="group flex flex-col items-center p-4 rounded-2xl bg-warm-white border border-line hover:border-copper/40 hover:shadow-md transition text-center"
              >
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border border-copper/30 bg-blush transition-transform group-hover:scale-105 shadow-inner">
                  <img
                    src={c.image || "/images/produto-fibra-russa.jpg"}
                    alt={c.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="mt-3 text-xs tracking-wider font-semibold text-ink-deep uppercase group-hover:text-copper transition">
                  {c.name}
                </span>
                {c.productCount !== undefined && (
                  <span className="text-[10px] text-text-secondary mt-0.5">
                    {c.productCount} {c.productCount === 1 ? "item" : "itens"}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Banner Promocional Pix + Frete */}
      <section className="container-shell py-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-ink via-ink-deep to-ink text-cream p-8 sm:p-10 border border-copper/30 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 divide-y md:divide-y-0 md:divide-x divide-copper/20">
            <div className="flex items-center gap-4">
              <Truck size={36} className="text-copper-light shrink-0" />
              <div>
                <p className="font-serif text-2xl font-bold text-copper-light">FRETE GRÁTIS</p>
                <p className="text-xs text-cream/80 mt-0.5">Nas compras a partir de R$ 299,90</p>
              </div>
            </div>

            <div className="text-center md:px-6 pt-4 md:pt-0">
              <p className="font-serif text-3xl sm:text-4xl font-bold text-copper-light">5% OFF</p>
              <p className="text-xs text-cream/80 mt-0.5 tracking-wider uppercase font-semibold">
                No Pagamento com Pix
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end justify-center pt-4 md:pt-0">
              <Link
                to="/sol-hair-closet/produtos"
                className="rounded-full bg-copper px-8 py-3 text-xs tracking-widest font-semibold text-warm-white hover:bg-copper/90 transition shadow-md"
              >
                APROVEITAR AGORA
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mais Vendidos / Destaques do PostgreSQL */}
      <section className="container-shell py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold tracking-widest text-copper uppercase">Coleção</p>
            <h2 className="font-serif text-3xl uppercase tracking-wide text-ink-deep font-bold mt-1">
              Mais Vendidos
            </h2>
          </div>
          <Link
            to="/sol-hair-closet/produtos"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-copper hover:text-ink-deep transition tracking-wider uppercase"
          >
            Ver Todos <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
            <Loader2 size={32} className="animate-spin text-copper mb-3" />
            <p className="text-xs font-medium">Carregando produtos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProducts.map((p) => (
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
      </section>

      {/* Coleção Perucas & Laces Banner */}
      <section className="container-shell py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden bg-blush border border-line shadow-sm">
          <div className="flex flex-col justify-center p-8 sm:p-14 space-y-4">
            <span className="text-xs tracking-[0.25em] text-copper uppercase font-bold">
              ✦ Coleção Especial
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-wide text-ink-deep font-bold">
              Perucas & Laces Front
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Modelos modernos com visual autêntico, repartição livre e fixação ultra segura para o seu dia a dia.
            </p>
            <div className="pt-2">
              <Link
                to="/sol-hair-closet/colecao/$slug"
                params={{ slug: "perucas" }}
                className="inline-flex items-center gap-2 rounded-full bg-ink-deep px-8 py-3.5 text-xs tracking-widest font-semibold text-cream hover:bg-copper transition shadow-md"
              >
                VER COLEÇÃO <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[300px] lg:min-h-[400px]">
            <img
              src="/images/produto-lace-morena.jpg"
              alt="Perucas Sol Hair Closet"
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Razões para Escolher */}
      <section className="container-shell py-16">
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="h-px flex-1 max-w-[100px] bg-copper/40" />
          <h2 className="font-serif text-2xl sm:text-3xl uppercase tracking-wide text-ink-deep text-center font-bold">
            Por que escolher a SOL Hair Closet?
          </h2>
          <div className="h-px flex-1 max-w-[100px] bg-copper/40" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col items-start gap-3 p-6 rounded-2xl bg-warm-white border border-line shadow-sm">
            <Shield size={28} className="text-copper" />
            <h3 className="text-xs font-bold tracking-wider text-ink-deep uppercase">QUALIDADE PREMIUM</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Fibras selecionadas com durabilidade prolongada e resistência a altas temperaturas.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 p-6 rounded-2xl bg-warm-white border border-line shadow-sm">
            <Award size={28} className="text-copper" />
            <h3 className="text-xs font-bold tracking-wider text-ink-deep uppercase">TESTADO & APROVADO</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Produtos testados nos atendimentos do salão por especialistas em mega hair.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 p-6 rounded-2xl bg-warm-white border border-line shadow-sm">
            <Wind size={28} className="text-copper" />
            <h3 className="text-xs font-bold tracking-wider text-ink-deep uppercase">EFEITO NATURAL</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Leveza, caimento perfeito e movimento que se funde harmoniosamente com os fios.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 p-6 rounded-2xl bg-warm-white border border-line shadow-sm">
            <Users size={28} className="text-copper" />
            <h3 className="text-xs font-bold tracking-wider text-ink-deep uppercase">TODOS OS ESTILOS</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Variedade de cores, texturas lisas e cacheadas para todos os tipos de beleza.
            </p>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}
