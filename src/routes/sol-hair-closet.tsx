import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UniverseSwitcher } from "@/components/UniverseSwitcher";
import {
  Truck,
  CreditCard,
  MessageCircle,
  Menu,
  Search,
  Heart,
  ShoppingBag,
  Shield,
  Diamond,
  Sparkles,
  X,
  Star,
  ArrowRight,
  Plus,
  Minus,
  Instagram,
  Youtube,
  Wallet,
  RefreshCw,
  Users,
  Award,
  Wind,
  User,
  type LucideIcon,
} from "lucide-react";
import { products, categories, drawerCategories, type Product } from "@/lib/sol-data";

export const Route = createFileRoute("/sol-hair-closet")({
  head: () => ({
    meta: [
      { title: "Sol Hair Closet | Universo Carol Sol" },
      {
        name: "description",
        content:
          "Conheça a experiência Sol Hair Closet: cabelos, fibras, acessórios e produtos selecionados.",
      },
      { property: "og:title", content: "Sol Hair Closet | Universo Carol Sol" },
      {
        property: "og:description",
        content: "Cabelos, fibras, acessórios e produtos no Universo Carol Sol.",
      },
    ],
    links: [{ rel: "canonical", href: "https://loja.carolsol.com.br/" }],
  }),
  component: HomePage,
});

const FREE_SHIPPING = 299.9;
const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type CartItem = { product: Product; qty: number };

function HomePage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [openDrawer, setOpenDrawer] = useState<null | "cat" | "search" | "cart" | "fav">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [storeProducts, setStoreProducts] = useState<Product[]>(products);

  useEffect(() => {
    async function loadStoreProducts() {
      try {
        const res = await fetch("/api/store?action=products");
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.products) && data.products.length > 0) {
          setStoreProducts(data.products);
        }
      } catch (e) {
        /* fallback to static products */
      }
    }
    void loadStoreProducts();
  }, []);

  useEffect(() => {
    try {
      const c = localStorage.getItem("sol-cart");
      const f = localStorage.getItem("sol-fav");
      if (c) setCart(JSON.parse(c));
      if (f) setFavs(JSON.parse(f));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("sol-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem("sol-fav", JSON.stringify(favs));
  }, [favs]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDrawer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cartCount = cart.reduce((a, i) => a + i.qty, 0) || 2;
  const subtotal = cart.reduce((a, i) => a + i.qty * i.product.price, 0);
  const pixTotal = subtotal * 0.95;

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === p.id);
      if (idx >= 0) {
        const n = [...prev];
        n[idx] = { ...n[idx], qty: n[idx].qty + 1 };
        return n;
      }
      return [...prev, { product: p, qty: 1 }];
    });
    setToast(`${p.name} adicionado à sacola`);
  };
  const setQty = (id: string, qty: number) =>
    setCart((prev) =>
      prev.flatMap((i) => (i.product.id === id ? (qty <= 0 ? [] : [{ ...i, qty }]) : [i])),
    );
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.product.id !== id));
  const toggleFav = (id: string) =>
    setFavs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const favProducts = useMemo(() => products.filter((p) => favs.includes(p.id)), [favs]);

  return (
    <div className="theme-sol min-h-dvh bg-cream text-text-primary">
      <UniverseSwitcher />
      <TopBar />
      <MainHeader
        cartCount={cartCount}
        onCat={() => setOpenDrawer("cat")}
        onSearch={() => setOpenDrawer("search")}
        onFav={() => setOpenDrawer("fav")}
        onCart={() => setOpenDrawer("cart")}
      />
      <main>
        <Hero />
        <TrustBar />
        <CategoriesSection />
        <PromoBanner />
        <ProductsSection onAdd={addToCart} onFav={toggleFav} favs={favs} />
        <WigsBanner />
        <ReasonsSection />
      </main>
      <FooterBenefits />
      <Footer />

      <CategoryDrawer open={openDrawer === "cat"} onClose={() => setOpenDrawer(null)} />
      <SearchDrawer open={openDrawer === "search"} onClose={() => setOpenDrawer(null)} />
      <CartDrawer
        open={openDrawer === "cart"}
        onClose={() => setOpenDrawer(null)}
        cart={cart}
        onSetQty={setQty}
        onRemove={removeFromCart}
        onCheckout={() => {
          setOpenDrawer(null);
          setShowCheckoutModal(true);
        }}
      />
      {showCheckoutModal && (
        <CheckoutModal cart={cart} onClose={() => setShowCheckoutModal(false)} />
      )}
      <FavDrawer
        open={openDrawer === "fav"}
        onClose={() => setOpenDrawer(null)}
        items={favProducts}
        onAdd={(p) => {
          addToCart(p);
        }}
        onRemove={toggleFav}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-ink-deep px-6 py-3 text-sm text-cream shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- Top Bar ---------- */
function TopBar() {
  const items = [
    { icon: Truck, text: "ENVIO RÁPIDO PARA TODO O BRASIL" },
    { icon: CreditCard, text: "PARCELE EM ATÉ 12X SEM JUROS" },
    { icon: MessageCircle, text: "ATENDIMENTO PERSONALIZADO" },
  ];
  return (
    <div className="bg-ink text-copper-light">
      <div className="container-shell grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-copper/20 text-[10px] sm:text-[11px] tracking-[0.15em]">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-center gap-2 py-2.5">
            <it.icon size={14} strokeWidth={1.5} />
            <span>{it.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Header ---------- */
function MainHeader({
  cartCount,
  onCat,
  onSearch,
  onFav,
  onCart,
}: {
  cartCount: number;
  onCat: () => void;
  onSearch: () => void;
  onFav: () => void;
  onCart: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 bg-warm-white/95 backdrop-blur border-b border-line">
      <div className="container-shell grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4 lg:py-5">
        <div className="flex items-center">
          <button
            onClick={onCat}
            className="flex items-center gap-2 text-ink-deep hover:text-copper transition-colors"
            aria-label="Abrir menu de categorias"
          >
            <Menu size={22} strokeWidth={1.5} />
            <span className="hidden sm:inline text-[11px] tracking-[0.2em] font-medium">
              CATEGORIAS
            </span>
          </button>
        </div>
        <Logo />
        <div className="flex items-center justify-end gap-4 sm:gap-6 text-ink-deep">
          <button onClick={onSearch} className="hover:text-copper" aria-label="Buscar">
            <Search size={20} strokeWidth={1.5} />
          </button>
          <button onClick={onFav} className="hover:text-copper" aria-label="Favoritos">
            <Heart size={20} strokeWidth={1.5} />
          </button>
          <button onClick={onCart} className="relative hover:text-copper" aria-label="Sacola">
            <ShoppingBag size={20} strokeWidth={1.5} />
            <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper px-1 text-[10px] font-semibold text-warm-white">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center leading-none select-none">
      <div
        className={`font-serif tracking-[0.15em] ${compact ? "text-2xl" : "text-3xl sm:text-4xl"}`}
        style={{ color: "var(--rose-gold)" }}
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
      <div className="mt-1 flex items-center gap-2 text-[9px] sm:text-[10px] tracking-[0.35em] text-copper">
        <span>✦</span>
        <span>HAIR CLOSET</span>
        <span>✦</span>
      </div>
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-blush">
      <div className="grid min-w-0 items-stretch lg:grid-cols-2">
        <div className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-12 sm:py-12 lg:px-20 lg:py-16">
          <p className="mb-6 flex min-w-0 items-center gap-2 text-[10px] tracking-[0.2em] text-ink-mid sm:text-[11px] sm:tracking-[0.3em]">
            A SUA MELHOR VERSÃO <span className="text-copper">✦</span>
          </p>
          <h1 className="font-serif text-[42px] font-light uppercase leading-[0.95] tracking-tight text-ink-deep min-[360px]:text-[48px] sm:text-[68px] lg:text-[76px]">
            Cabelos que
            <br />
            transformam
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-text-secondary">
            Qualidade premium para realçar
            <br className="hidden sm:block" />
            sua beleza todos os dias.
          </p>
          <div className="mt-8">
            <button className="group inline-flex items-center gap-3 rounded-full bg-ink-deep px-7 py-3.5 text-[11px] tracking-[0.25em] font-medium text-cream hover:bg-copper transition-colors">
              COMPRE AGORA
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          <div className="mt-10 grid max-w-lg grid-cols-1 gap-5 sm:mt-12 sm:grid-cols-3 sm:gap-4 lg:gap-6">
            <HeroBenefit icon={User} title="FIBRAS PREMIUM" text="Qualidade que impressiona" />
            <HeroBenefit icon={Diamond} title="CORES EXCLUSIVAS" text="Para todos os estilos" />
            <HeroBenefit icon={Wind} title="EFEITO NATURAL" text="Leveza e movimento" />
          </div>
        </div>
        <div className="relative min-h-[380px] lg:min-h-0">
          <img
            src="/images/hero-sol-hair-closet.jpg"
            alt="Modelo com cabelos longos e ondulados premium"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-blush to-transparent hidden lg:block" />
        </div>
      </div>
    </section>
  );
}

function HeroBenefit({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-copper/40 text-copper">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[10px] tracking-[0.2em] font-semibold text-ink-deep">{title}</p>
        <p className="text-[11px] text-text-secondary mt-0.5">{text}</p>
      </div>
    </div>
  );
}

/* ---------- Trust Bar ---------- */
function TrustBar() {
  const items = [
    { icon: Shield, title: "COMPRA 100% SEGURA", text: "Seus dados protegidos" },
    { icon: Truck, title: "ENVIO RÁPIDO", text: "Para todo o Brasil" },
    { icon: CreditCard, title: "PARCELE EM ATÉ 12X", text: "Sem juros" },
    { icon: MessageCircle, title: "ATENDIMENTO", text: "Personalizado" },
  ];
  return (
    <div className="container-shell py-8">
      <div className="rounded-2xl bg-blush/60 border border-line grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-5">
            <it.icon size={26} strokeWidth={1.3} className="text-copper shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.15em] font-semibold text-ink-deep">
                {it.title}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5 truncate">{it.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Categories ---------- */
function CategoriesSection() {
  return (
    <section className="container-shell py-10">
      <div className="flex items-end justify-between mb-8">
        <h2 className="font-serif text-3xl sm:text-4xl tracking-wide uppercase text-ink-deep">
          Categorias
        </h2>
        <a
          href="https://loja.carolsol.com.br"
          className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-ink-mid hover:text-copper"
        >
          VER TODAS <ArrowRight size={14} />
        </a>
      </div>
      <div className="flex gap-6 lg:gap-10 overflow-x-auto lg:justify-between pb-4 lg:pb-0 -mx-5 px-5 lg:mx-0 lg:px-0 snap-x">
        {categories.map((c) => (
          <a
            key={c.id}
            href="https://loja.carolsol.com.br"
            className="group flex flex-col items-center shrink-0 snap-start"
          >
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border border-copper/30 bg-blush transition-transform group-hover:scale-105">
              <img
                src={c.image}
                alt={c.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <span className="mt-3 text-[11px] tracking-[0.2em] font-medium text-ink-deep text-center max-w-[110px]">
              {c.name}
            </span>
          </a>
        ))}
        <a
          href="https://loja.carolsol.com.br"
          className="hidden lg:flex flex-col justify-center shrink-0 text-[11px] tracking-[0.2em] text-ink-mid hover:text-copper"
        >
          <span className="inline-flex items-center gap-2">
            VER TODAS <ArrowRight size={14} />
          </span>
        </a>
      </div>
    </section>
  );
}

/* ---------- Promo Banner ---------- */
function PromoBanner() {
  return (
    <div className="container-shell">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ink via-ink-deep to-ink text-cream">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 50%, rgba(200,147,82,.25), transparent 30%), radial-gradient(circle at 85% 50%, rgba(200,147,82,.20), transparent 35%)",
          }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-3 items-center divide-y lg:divide-y-0 lg:divide-x divide-copper/20 px-6 lg:px-10 py-6 lg:py-5 gap-4 lg:gap-0">
          <div className="flex items-center gap-4 lg:pr-6">
            <Truck size={34} strokeWidth={1.3} className="text-copper-light shrink-0" />
            <div>
              <p className="font-serif text-2xl sm:text-3xl tracking-widest text-copper-light">
                FRETE GRÁTIS
              </p>
              <p className="text-[11px] tracking-[0.15em] text-cream/80 mt-1">
                NAS COMPRAS ACIMA DE R$ 299,90
              </p>
            </div>
          </div>
          <div className="text-center lg:px-6">
            <p className="font-serif text-3xl sm:text-4xl tracking-widest text-copper-light">
              5% OFF
            </p>
            <p className="text-[11px] tracking-[0.2em] text-cream/80 mt-1">NO PIX</p>
          </div>
          <div className="flex flex-col items-center lg:items-end lg:pl-6 gap-2">
            <button className="rounded-full bg-copper-light px-8 py-2.5 text-[11px] tracking-[0.25em] font-semibold text-ink-deep hover:bg-copper hover:text-cream transition-colors">
              APROVEITE
            </button>
            <p className="text-[10px] tracking-[0.1em] text-copper-light italic">
              Condições apresentadas nesta vitrine demonstrativa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Products ---------- */
function ProductsSection({
  onAdd,
  onFav,
  favs,
}: {
  onAdd: (p: Product) => void;
  onFav: (id: string) => void;
  favs: string[];
}) {
  return (
    <section className="container-shell py-12">
      <div className="flex items-end justify-between mb-8">
        <h2 className="font-serif text-3xl sm:text-4xl tracking-wide uppercase text-ink-deep">
          Mais Vendidos
        </h2>
        <a
          href="https://loja.carolsol.com.br"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-ink-mid hover:text-copper"
        >
          VER TODOS <ArrowRight size={14} />
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onAdd={onAdd}
            onFav={onFav}
            faved={favs.includes(p.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  onAdd,
  onFav,
  faved,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  onFav: (id: string) => void;
  faved: boolean;
}) {
  const badgeTone = {
    gold: "bg-gold-soft text-ink-deep",
    cream: "bg-cream text-ink-deep border border-copper/30",
    copper: "bg-copper text-warm-white",
    rose: "bg-[#B7476A] text-warm-white",
  }[product.badge.tone];
  return (
    <article className="group flex flex-col rounded-xl bg-warm-white border border-line overflow-hidden shadow-[0_2px_18px_-8px_rgba(87,48,29,0.15)]">
      <div className="relative aspect-square bg-blush overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <span
          className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[9px] tracking-[0.15em] font-semibold ${badgeTone}`}
        >
          {product.badge.label}
        </span>
        <button
          onClick={() => onFav(product.id)}
          aria-label={faved ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-warm-white/90 text-ink-deep hover:text-copper"
        >
          <Heart size={16} strokeWidth={1.5} fill={faved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-[15px] font-medium text-ink-deep leading-snug">{product.name}</h3>
        <p className="mt-1 text-[11px] text-text-secondary">{product.info}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex text-copper">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                size={12}
                fill="currentColor"
                strokeWidth={0}
                className={i < Math.floor(product.rating) ? "" : "opacity-30"}
              />
            ))}
          </div>
          <span className="text-[11px] text-text-secondary">({product.reviews})</span>
        </div>
        <p className="mt-1 text-[11px] text-text-secondary">{product.sold}</p>
        <p className="mt-3 font-serif text-2xl text-ink-deep">{fmt(product.price)}</p>
        <button
          onClick={() => onAdd(product)}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink-deep px-4 py-2.5 text-[11px] tracking-[0.25em] font-semibold text-cream hover:bg-copper transition-colors"
        >
          COMPRAR <ShoppingBag size={14} strokeWidth={1.5} />
        </button>
      </div>
    </article>
  );
}

/* ---------- Wigs Banner ---------- */
function WigsBanner() {
  return (
    <section className="container-shell py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] rounded-2xl overflow-hidden bg-blush">
        <div className="flex flex-col justify-center px-8 lg:px-12 py-12">
          <p className="text-[11px] tracking-[0.3em] text-ink-mid">CONHEÇA NOSSAS</p>
          <h2 className="mt-2 font-serif text-4xl lg:text-5xl uppercase tracking-wide text-ink-deep">
            Perucas <span className="text-copper">✦</span>
          </h2>
          <p className="mt-4 text-[14px] text-text-secondary leading-relaxed">
            Modelos modernos, cores incríveis
            <br />e acabamento impecável.
          </p>
          <div className="mt-6">
            <button className="inline-flex items-center gap-2 rounded-full bg-ink-deep px-6 py-3 text-[11px] tracking-[0.25em] font-semibold text-cream hover:bg-copper transition-colors">
              VER COLEÇÃO <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="relative min-h-[280px]">
          <img
            src="/images/banner-perucas-sol.jpg"
            alt="Coleção de perucas SOL Hair Closet"
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- Reasons ---------- */
function ReasonsSection() {
  const items = [
    { icon: Shield, title: "QUALIDADE PREMIUM", text: "Fibras selecionadas\ne durabilidade" },
    { icon: Award, title: "AS MELHORES MARCAS", text: "Produtos testados\ne aprovados" },
    { icon: Wind, title: "EFEITO NATURAL", text: "Leveza, movimento\ne conforto" },
    {
      icon: Users,
      title: "PARA TODOS OS ESTILOS",
      text: "Cores, texturas e tamanhos\nque combinam com você",
    },
  ];
  return (
    <section className="container-shell py-14">
      <div className="flex items-center justify-center gap-4 mb-10">
        <div className="h-px flex-1 max-w-[120px] bg-copper/40" />
        <h2 className="font-serif text-2xl sm:text-3xl uppercase tracking-wide text-ink-deep text-center">
          Por que escolher a SOL Hair Closet?
        </h2>
        <div className="h-px flex-1 max-w-[120px] bg-copper/40" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col items-start gap-3 px-6 py-6">
            <it.icon size={30} strokeWidth={1.3} className="text-copper" />
            <p className="text-[11px] tracking-[0.2em] font-semibold text-ink-deep">{it.title}</p>
            <p className="text-[11px] text-text-secondary whitespace-pre-line leading-relaxed">
              {it.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Footer Benefits ---------- */
function FooterBenefits() {
  const items = [
    { icon: Wallet, title: "PAGAMENTO SEGURO", text: "Ambiente protegido\ne confiável" },
    { icon: RefreshCw, title: "TROCA FACILITADA", text: "Até 7 dias após\no recebimento" },
    {
      icon: MessageCircle,
      title: "ATENDIMENTO HUMANIZADO",
      text: "Especialistas prontas\npara te ajudar",
    },
    { icon: Users, title: "COMUNIDADE SOL", text: "Dicas, conteúdos e benefícios\nexclusivos" },
  ];
  return (
    <section className="bg-ink text-cream">
      <div className="container-shell grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-copper/20">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-6">
            <it.icon size={26} strokeWidth={1.3} className="text-copper-light shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.2em] font-semibold text-copper-light">
                {it.title}
              </p>
              <p className="text-[11px] text-cream/70 mt-1 whitespace-pre-line leading-relaxed">
                {it.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  const links = ["INÍCIO", "CATEGORIAS", "FAVORITOS", "MEUS PEDIDOS", "SOBRE NÓS", "CONTATO"];
  return (
    <footer className="bg-ink-deep text-copper-light">
      <div className="container-shell grid grid-cols-1 md:grid-cols-3 items-center gap-6 py-6 divide-y md:divide-y-0 md:divide-x divide-copper/20">
        <div className="flex md:justify-start justify-center">
          <Logo compact />
        </div>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] tracking-[0.25em] py-4 md:py-0">
          {links.map((l) => (
            <a
              key={l}
              href="https://loja.carolsol.com.br"
              className="hover:text-warm-white transition-colors"
            >
              {l}
            </a>
          ))}
        </nav>
        <div className="flex md:justify-end justify-center gap-5 text-copper-light">
          <a
            href="https://www.instagram.com/carolsolhair/"
            aria-label="Instagram"
            className="hover:text-warm-white"
          >
            <Instagram size={18} strokeWidth={1.4} />
          </a>
          <a
            href="https://loja.carolsol.com.br"
            aria-label="Loja Carol Sol"
            className="hover:text-warm-white"
          >
            <Youtube size={18} strokeWidth={1.4} />
          </a>
          <a
            href="https://loja.carolsol.com.br"
            aria-label="Loja Carol Sol"
            className="hover:text-warm-white"
          >
            <Sparkles size={18} strokeWidth={1.4} />
          </a>
          <a
            href="https://wa.me/5514998373935"
            aria-label="WhatsApp"
            className="hover:text-warm-white"
          >
            <MessageCircle size={18} strokeWidth={1.4} />
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Drawers ---------- */
function DrawerShell({
  open,
  onClose,
  side = "left",
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  children: React.ReactNode;
  title: string;
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink-deep/50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-label={title}
        className={`fixed top-0 z-50 h-dvh w-[92vw] sm:w-[380px] bg-cream shadow-2xl transition-transform duration-300 flex flex-col
          ${side === "left" ? "left-0" : "right-0"}
          ${open ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-serif text-2xl text-ink-deep">{title}</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-ink-deep hover:text-copper">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}

function CategoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DrawerShell open={open} onClose={onClose} title="Categorias" side="left">
      <ul className="py-2">
        {drawerCategories.map((c) => (
          <li key={c}>
            <a
              href="https://loja.carolsol.com.br"
              className="block px-5 py-3 text-[13px] text-ink-deep hover:bg-blush hover:text-copper transition-colors border-b border-line"
            >
              {c}
            </a>
          </li>
        ))}
      </ul>
      <div className="p-5">
        <button className="w-full rounded-full bg-ink-deep py-3 text-[11px] tracking-[0.25em] font-semibold text-cream hover:bg-copper">
          VER TODOS OS PRODUTOS
        </button>
      </div>
    </DrawerShell>
  );
}

function SearchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const results = q ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <DrawerShell open={open} onClose={onClose} title="Buscar" side="right">
      <div className="p-5">
        <div className="flex items-center gap-2 rounded-full border border-line bg-warm-white px-4 py-3">
          <Search size={16} className="text-copper" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            placeholder="Busque por cabelos, perucas, fibras ou acessórios"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-text-secondary"
          />
        </div>
        <div className="mt-4 space-y-2">
          {results.map((r) => (
            <a
              key={r.id}
              href="https://loja.carolsol.com.br"
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-blush"
            >
              <img src={r.image} alt="" className="h-12 w-12 rounded-md object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-ink-deep truncate">{r.name}</p>
                <p className="text-[11px] text-text-secondary">{fmt(r.price)}</p>
              </div>
            </a>
          ))}
          {!q && <p className="text-[12px] text-text-secondary">Digite para ver sugestões...</p>}
        </div>
      </div>
    </DrawerShell>
  );
}

function CartDrawer({
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
  onSetQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}) {
  const subtotal = cart.reduce((a, i) => a + i.qty * i.product.price, 0);
  const pixTotal = subtotal * 0.95;
  const missing = Math.max(0, FREE_SHIPPING - subtotal);
  return (
    <DrawerShell open={open} onClose={onClose} title="Sua Sacola" side="right">
      <div className="flex flex-col h-full">
        <div className="flex-1 p-5 space-y-4">
          {cart.length === 0 && (
            <p className="text-[13px] text-text-secondary text-center py-12">
              Sua sacola está vazia.
            </p>
          )}
          {cart.map((i) => (
            <div key={i.product.id} className="flex gap-3 border-b border-line pb-4">
              <img src={i.product.image} alt="" className="h-20 w-20 rounded-md object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-ink-deep">{i.product.name}</p>
                <p className="text-[11px] text-text-secondary">{i.product.info}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center border border-line rounded-full">
                    <button
                      onClick={() => onSetQty(i.product.id, i.qty - 1)}
                      aria-label="Diminuir"
                      className="px-2 py-1 text-ink-deep hover:text-copper"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-2 text-[12px]">{i.qty}</span>
                    <button
                      onClick={() => onSetQty(i.product.id, i.qty + 1)}
                      aria-label="Aumentar"
                      className="px-2 py-1 text-ink-deep hover:text-copper"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-[13px] font-medium text-ink-deep">
                    {fmt(i.product.price * i.qty)}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(i.product.id)}
                  className="mt-1 text-[10px] tracking-[0.15em] text-text-secondary hover:text-copper"
                >
                  REMOVER
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line p-5 bg-blush/40 space-y-2">
          {missing > 0 ? (
            <p className="text-[11px] text-ink-mid">
              Faltam <b>{fmt(missing)}</b> para frete grátis
            </p>
          ) : (
            <p className="text-[11px] text-whatsapp font-semibold">🎉 Você ganhou frete grátis!</p>
          )}
          <div className="flex justify-between text-[13px]">
            <span className="text-text-secondary">Subtotal</span>
            <span className="font-medium">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-text-secondary">No Pix (5% off)</span>
            <span className="font-semibold text-copper">{fmt(pixTotal)}</span>
          </div>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="w-full mt-3 rounded-full bg-ink-deep py-3 text-[11px] tracking-[0.25em] font-semibold text-cream hover:bg-copper transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            FINALIZAR COMPRA
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-full border border-line py-3 text-[11px] tracking-[0.25em] font-medium text-ink-deep hover:bg-warm-white transition"
          >
            CONTINUAR COMPRANDO
          </button>
        </div>
      </div>
    </DrawerShell>
  );
}

function CheckoutModal({ cart, onClose }: { cart: CartItem[]; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = cart.reduce((a, i) => a + i.qty * i.product.price, 0);
  const shippingCost = subtotal >= FREE_SHIPPING ? 0 : 20.0;
  const totalAmount = subtotal + shippingCost;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    try {
      const payload = {
        customerName: form.get("customerName"),
        customerEmail: form.get("customerEmail"),
        customerPhone: form.get("customerPhone"),
        customerDocument: form.get("customerDocument"),
        shippingAddress: {
          zipCode: form.get("zipCode"),
          street: form.get("street"),
          number: form.get("number"),
          complement: form.get("complement") || "",
          neighborhood: form.get("neighborhood"),
          city: form.get("city"),
          state: form.get("state"),
        },
        items: cart.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          price: i.product.price,
          qty: i.qty,
        })),
      };

      const res = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Não foi possível criar o pedido.");
      }

      /* Redirect to SumUp Hosted Checkout */
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar checkout.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink-deep/60 backdrop-blur-sm overflow-y-auto">
      <div className="my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-warm-white shadow-2xl ring-1 ring-line">
        <header className="flex items-center justify-between border-b border-line bg-cream/40 px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-ink-deep font-bold">Finalizar Compra</h2>
            <p className="text-xs text-text-secondary">Preencha seus dados de entrega</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink-mid hover:bg-cream hover:text-ink-deep transition"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}

          <div className="space-y-3">
            <h3 className="font-serif text-lg font-semibold text-copper border-b border-line pb-1">
              Seus Dados
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-deep">Nome Completo *</label>
              <input
                name="customerName"
                required
                placeholder="Seu nome completo"
                className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-deep">E-mail *</label>
                <input
                  name="customerEmail"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-deep">Telefone / WhatsApp *</label>
                <input
                  name="customerPhone"
                  required
                  placeholder="(14) 99999-9999"
                  className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-deep">
                CPF (para envio e rastreio) *
              </label>
              <input
                name="customerDocument"
                required
                placeholder="000.000.000-00"
                className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="font-serif text-lg font-semibold text-copper border-b border-line pb-1">
              Endereço de Entrega
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1">
                <label className="text-xs font-medium text-ink-deep">CEP *</label>
                <input
                  name="zipCode"
                  required
                  placeholder="17000-000"
                  className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-ink-deep">Rua / Logradouro *</label>
                <input
                  name="street"
                  required
                  placeholder="Rua, Avenida..."
                  className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-deep">Número *</label>
                <input
                  name="number"
                  required
                  placeholder="123"
                  className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-ink-deep">Complemento</label>
                <input
                  name="complement"
                  placeholder="Apto, Bloco (opcional)"
                  className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-deep">Bairro *</label>
                <input
                  name="neighborhood"
                  required
                  placeholder="Bairro"
                  className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-deep">Cidade *</label>
                <input
                  name="city"
                  required
                  placeholder="Cidade"
                  className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs outline-none focus:border-copper"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-deep">Estado (UF) *</label>
                <input
                  name="state"
                  required
                  placeholder="SP"
                  maxLength={2}
                  className="w-full h-10 rounded-xl border border-line bg-cream/20 px-3 text-xs uppercase outline-none focus:border-copper"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-cream/50 p-4 space-y-1 text-xs border border-line">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal ({cart.reduce((a, i) => a + i.qty, 0)} itens)</span>
              <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Frete</span>
              <span>
                {shippingCost === 0 ? "GRÁTIS" : `R$ ${shippingCost.toFixed(2).replace(".", ",")}`}
              </span>
            </div>
            <div className="flex justify-between font-serif text-base font-bold text-ink-deep pt-1 border-t border-line">
              <span>Total</span>
              <span className="text-copper">R$ {totalAmount.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-ink-deep font-sans-brand text-xs font-semibold tracking-widest text-cream hover:bg-copper transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                GERANDO CHECKOUT...
              </>
            ) : (
              <>PAGAR COM SUMUP (CARTÃO OU PIX)</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function FavDrawer({
  open,
  onClose,
  items,
  onAdd,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  items: Product[];
  onAdd: (p: Product) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <DrawerShell open={open} onClose={onClose} title="Favoritos" side="right">
      <div className="p-5 space-y-3">
        {items.length === 0 && (
          <p className="text-[13px] text-text-secondary text-center py-12">
            Nenhum favorito ainda.
          </p>
        )}
        {items.map((p) => (
          <div key={p.id} className="flex gap-3 border-b border-line pb-3">
            <img src={p.image} alt="" className="h-20 w-20 rounded-md object-cover" />
            <div className="flex-1">
              <p className="text-[13px] text-ink-deep">{p.name}</p>
              <p className="text-[12px] text-copper font-medium">{fmt(p.price)}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onAdd(p)}
                  className="rounded-full bg-ink-deep px-3 py-1.5 text-[10px] tracking-[0.2em] text-cream hover:bg-copper"
                >
                  ADICIONAR
                </button>
                <button
                  onClick={() => onRemove(p.id)}
                  className="rounded-full border border-line px-3 py-1.5 text-[10px] tracking-[0.2em] text-ink-deep hover:text-copper"
                >
                  REMOVER
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DrawerShell>
  );
}
