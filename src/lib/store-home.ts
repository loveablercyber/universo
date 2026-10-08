export type StoreHomeConfig = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaUrl: string;
  heroImageUrl: string;
  featuredCategoryIds: string[];
  featuredProductIds: string[];
};

export const DEFAULT_STORE_HOME_CONFIG: StoreHomeConfig = {
  heroEyebrow: "A SUA MELHOR VERSÃO",
  heroTitle: "CABELOS QUE TRANSFORMAM",
  heroSubtitle: "Qualidade premium para realçar sua beleza todos os dias.",
  heroCtaLabel: "COMPRE AGORA",
  heroCtaUrl: "/sol-hair-closet/produtos",
  heroImageUrl: "/images/hero-sol-hair-closet.jpg",
  featuredCategoryIds: ["apliques", "fibra-russa", "perucas"],
  featuredProductIds: [],
};

export function resolveStoreHomeConfig(value: unknown): StoreHomeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_STORE_HOME_CONFIG;
  }

  const candidate = value as Partial<StoreHomeConfig>;
  return {
    heroEyebrow:
      typeof candidate.heroEyebrow === "string" && candidate.heroEyebrow.trim()
        ? candidate.heroEyebrow.trim()
        : DEFAULT_STORE_HOME_CONFIG.heroEyebrow,
    heroTitle:
      typeof candidate.heroTitle === "string" && candidate.heroTitle.trim()
        ? candidate.heroTitle.trim()
        : DEFAULT_STORE_HOME_CONFIG.heroTitle,
    heroSubtitle:
      typeof candidate.heroSubtitle === "string" && candidate.heroSubtitle.trim()
        ? candidate.heroSubtitle.trim()
        : DEFAULT_STORE_HOME_CONFIG.heroSubtitle,
    heroCtaLabel:
      typeof candidate.heroCtaLabel === "string" && candidate.heroCtaLabel.trim()
        ? candidate.heroCtaLabel.trim()
        : DEFAULT_STORE_HOME_CONFIG.heroCtaLabel,
    heroCtaUrl:
      typeof candidate.heroCtaUrl === "string" && candidate.heroCtaUrl.startsWith("/")
        ? candidate.heroCtaUrl
        : DEFAULT_STORE_HOME_CONFIG.heroCtaUrl,
    heroImageUrl:
      typeof candidate.heroImageUrl === "string" && candidate.heroImageUrl.trim()
        ? candidate.heroImageUrl.trim()
        : DEFAULT_STORE_HOME_CONFIG.heroImageUrl,
    featuredCategoryIds: Array.isArray(candidate.featuredCategoryIds)
      ? candidate.featuredCategoryIds.filter(
          (id): id is string => typeof id === "string" && Boolean(id.trim()),
        )
      : DEFAULT_STORE_HOME_CONFIG.featuredCategoryIds,
    featuredProductIds: Array.isArray(candidate.featuredProductIds)
      ? candidate.featuredProductIds
          .filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
          .slice(0, 8)
      : DEFAULT_STORE_HOME_CONFIG.featuredProductIds,
  };
}
