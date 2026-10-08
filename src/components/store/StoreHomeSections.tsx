import { Link } from "@tanstack/react-router";
import { ArrowRight, Crown, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import type { Category, Product } from "@/lib/sol-data";
import type { StoreHomeConfig } from "@/lib/store-home";
import { ProductCard } from "./ProductCard";

export function StoreHero({ config }: { config: StoreHomeConfig }) {
  return (
    <section className="store-home-shell pt-3 sm:pt-5">
      <div className="relative isolate min-h-[330px] overflow-hidden border border-line bg-[#4B3628] sm:min-h-[420px] lg:min-h-[500px]">
        <img
          src={config.heroImageUrl}
          alt="Modelo com cabelos longos apresentando a coleção Sol Hair Closet"
          className="absolute inset-0 h-full w-full object-cover object-[42%_center] sm:object-center"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#24170f]/90 via-[#3b281b]/48 to-transparent" />
        <div className="relative flex min-h-[330px] max-w-xl flex-col justify-end px-5 py-7 text-[#FAF7F2] sm:min-h-[420px] sm:justify-center sm:px-10 sm:py-10 lg:min-h-[500px] lg:px-16">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#e5bca3] sm:text-xs">
            {config.heroEyebrow}
          </p>
          <h1 className="max-w-[12ch] font-serif text-[2rem] leading-[1.05] tracking-[0.04em] sm:text-5xl lg:text-6xl">
            {config.heroTitle}
          </h1>
          <p className="mt-4 max-w-md text-xs leading-6 text-[#FAF7F2]/85 sm:text-sm">
            {config.heroSubtitle}
          </p>
          <a
            href={config.heroCtaUrl}
            className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 border border-[#CB9A7B] bg-[#CB9A7B] px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4B3628] transition hover:bg-[#FAF7F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF7F2] sm:mt-7"
          >
            {config.heroCtaLabel} <ArrowRight size={15} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}

const benefits = [
  {
    title: "Qualidade",
    text: "Qualidade que você vê.",
    icon: Sparkles,
  },
  {
    title: "Beleza",
    text: "Beleza que você sente.",
    icon: Crown,
  },
  {
    title: "Confiança",
    text: "Compra segura e atendimento especial.",
    icon: HeartHandshake,
  },
] as const;

export function BrandBenefits() {
  return (
    <section aria-label="Diferenciais Sol Hair Closet" className="store-home-shell py-5 sm:py-7">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-3 sm:overflow-visible">
        {benefits.map(({ title, text, icon: Icon }) => (
          <article
            key={title}
            className="flex min-w-[76%] snap-start items-center gap-3 border border-line bg-[#FAF7F2] px-4 py-4 sm:min-w-0 sm:justify-center sm:px-5"
          >
            <Icon size={22} strokeWidth={1.35} className="shrink-0 text-copper" aria-hidden />
            <div>
              <h2 className="font-serif text-base uppercase tracking-[0.1em] text-ink-deep">
                {title}
              </h2>
              <p className="mt-0.5 text-[11px] leading-4 text-text-secondary">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FeaturedCategories({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section id="categorias" className="store-home-shell scroll-mt-36 py-5 sm:py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-copper">
            Navegue por
          </p>
          <h2 className="mt-1 font-serif text-2xl uppercase tracking-[0.08em] text-ink-deep sm:text-3xl">
            Escolha seu estilo
          </h2>
        </div>
        <Link
          to="/sol-hair-closet/produtos"
          search={{ category: undefined, sort: "best_selling" }}
          className="hidden items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-copper hover:text-ink-deep sm:inline-flex"
        >
          Ver catálogo <ArrowRight size={13} aria-hidden />
        </Link>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 scrollbar-none sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
        {categories.map((category) => (
          <Link
            key={category.id}
            to="/sol-hair-closet/categoria/$slug"
            params={{ slug: category.slug || category.id }}
            className="group min-w-[72%] snap-start sm:min-w-0"
          >
            <div className="relative aspect-[5/4] overflow-hidden border border-line bg-blush">
              <img
                src={category.image || "/images/produto-fibra-russa.jpg"}
                alt={category.name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#4B3628]/85 to-transparent px-4 pb-4 pt-12 text-[#FAF7F2]">
                <h3 className="font-serif text-xl uppercase tracking-[0.08em]">{category.name}</h3>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#FAF7F2]/80">
                  {category.productCount ?? 0}{" "}
                  {(category.productCount ?? 0) === 1 ? "produto" : "produtos"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function BestSellersSection({
  products,
  onAdd,
  onFav,
  isFaved,
}: {
  products: Product[];
  onAdd: (product: Product) => void;
  onFav: (id: string) => void;
  isFaved: (id: string) => boolean;
}) {
  return (
    <section id="mais-vendidos" className="store-home-shell scroll-mt-36 py-6 sm:py-10">
      <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-copper">
            Seleção Carol Sol
          </p>
          <h2 className="mt-1 font-serif text-2xl uppercase tracking-[0.08em] text-ink-deep sm:text-3xl">
            Mais vendidos
          </h2>
        </div>
        <Link
          to="/sol-hair-closet/produtos"
          search={{ category: undefined, sort: "best_selling" }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-copper hover:text-ink-deep"
        >
          Ver todos <ArrowRight size={13} aria-hidden />
        </Link>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAdd}
              onFav={onFav}
              faved={isFaved(product.id)}
            />
          ))}
        </div>
      ) : (
        <div className="border border-line bg-[#FAF7F2] px-5 py-10 text-center">
          <ShieldCheck className="mx-auto text-copper" size={26} strokeWidth={1.4} />
          <p className="mt-3 text-sm text-ink-deep">Novidades estão sendo preparadas.</p>
          <p className="mt-1 text-xs text-text-secondary">
            Volte em breve para conhecer a coleção.
          </p>
        </div>
      )}
    </section>
  );
}

export function StoreHomeSkeleton() {
  return (
    <div aria-label="Carregando loja" aria-busy="true" className="store-home-shell space-y-5 py-4">
      <div className="h-[330px] animate-pulse bg-blush sm:h-[420px]" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse border border-line bg-[#FAF7F2]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="aspect-[3/5] animate-pulse bg-blush" />
        ))}
      </div>
    </div>
  );
}
