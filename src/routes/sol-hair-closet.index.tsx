import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";
import {
  BestSellersSection,
  BrandBenefits,
  FeaturedCategories,
  StoreHero,
  StoreHomeSkeleton,
} from "@/components/store/StoreHomeSections";
import type { Category, Product } from "@/lib/sol-data";
import {
  DEFAULT_STORE_HOME_CONFIG,
  resolveStoreHomeConfig,
  type StoreHomeConfig,
} from "@/lib/store-home";

export const Route = createFileRoute("/sol-hair-closet/")({
  component: StoreHomePage,
  head: () => ({
    meta: [
      { title: "Sol Hair Closet | Cabelos, fibras, apliques e beleza" },
      {
        name: "description",
        content:
          "Cabelos premium, fibras russas, apliques, perucas e laces selecionados por Carol Sol.",
      },
      { property: "og:title", content: "Sol Hair Closet | Universo Carol Sol" },
      {
        property: "og:description",
        content: "Qualidade que você vê. Beleza que você sente.",
      },
      { property: "og:image", content: "/images/hero-sol-hair-closet.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://carolsol.com.br/store" }],
  }),
});

type PublicSetting = { key: string; value: unknown };

function orderConfiguredItems<T extends { id: string; slug?: string }>(
  items: T[],
  configuredIds: string[],
) {
  if (!configuredIds.length) return items;
  const byId = new Map(
    items.flatMap((item) => [
      [item.id, item],
      [item.slug || item.id, item],
    ]),
  );
  return configuredIds.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
}

export function StoreHomePage() {
  const store = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [homeConfig, setHomeConfig] = useState<StoreHomeConfig>(DEFAULT_STORE_HOME_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHome() {
      setLoading(true);
      setError("");
      try {
        const [settingsResponse, categoriesResponse] = await Promise.all([
          fetch("/api/store?action=store_settings"),
          fetch("/api/store?action=categories"),
        ]);
        const [settingsPayload, categoriesPayload] = await Promise.all([
          settingsResponse.json(),
          categoriesResponse.json(),
        ]);
        if (!settingsResponse.ok || !settingsPayload.ok) {
          throw new Error(
            settingsPayload.message || "Não foi possível carregar a configuração da loja.",
          );
        }
        if (!categoriesResponse.ok || !categoriesPayload.ok) {
          throw new Error(categoriesPayload.message || "Não foi possível carregar as categorias.");
        }

        const settings = (settingsPayload.settings || []) as PublicSetting[];
        const config = resolveStoreHomeConfig(
          settings.find((setting) => setting.key === "store_home_config")?.value,
        );
        if (!active) return;
        setHomeConfig(config);
        setCategories((categoriesPayload.categories || []) as Category[]);

        const productQuery = config.featuredProductIds.length
          ? `&ids=${encodeURIComponent(config.featuredProductIds.join(","))}`
          : "&sort=best_selling";
        const productsResponse = await fetch(`/api/store?action=products&limit=8${productQuery}`);
        const productsPayload = await productsResponse.json();
        if (!productsResponse.ok || !productsPayload.ok) {
          throw new Error(productsPayload.message || "Não foi possível carregar os produtos.");
        }
        if (!active) return;

        setFeaturedProducts((productsPayload.products || []) as Product[]);
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof Error ? cause.message : "Não foi possível carregar a loja agora.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHome();
    return () => {
      active = false;
    };
  }, []);

  const featuredCategories = useMemo(() => {
    const parents = categories.filter((category) => !category.parentId);
    const configured = orderConfiguredItems(parents, homeConfig.featuredCategoryIds);
    if (configured.length) return configured.slice(0, 3);

    const preferredSlugs = ["apliques", "fibra-russa", "perucas"];
    const preferred = orderConfiguredItems(parents, preferredSlugs);
    return (preferred.length ? preferred : parents).slice(0, 3);
  }, [categories, homeConfig.featuredCategoryIds]);

  const products = useMemo(
    () => orderConfiguredItems(featuredProducts, homeConfig.featuredProductIds).slice(0, 8),
    [featuredProducts, homeConfig.featuredProductIds],
  );

  return (
    <StoreLayout storeState={store}>
      {loading ? (
        <StoreHomeSkeleton />
      ) : (
        <>
          {error ? (
            <div
              role="alert"
              className="store-home-shell mt-4 flex items-start gap-3 border border-copper/30 bg-blush px-4 py-3 text-xs text-ink-deep"
            >
              <AlertCircle size={18} className="shrink-0 text-copper" aria-hidden />
              <div>
                <p className="font-semibold">Parte da loja não pôde ser carregada.</p>
                <p className="mt-1 text-text-secondary">{error} Atualize a página em instantes.</p>
              </div>
            </div>
          ) : null}
          <StoreHero config={homeConfig} />
          <BrandBenefits />
          <FeaturedCategories categories={featuredCategories} />
          <BestSellersSection
            products={products}
            onAdd={(product) => store.addToCart(product)}
            onFav={store.toggleFav}
            isFaved={store.isFaved}
          />
        </>
      )}
    </StoreLayout>
  );
}
