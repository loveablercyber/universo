export interface CmsHeroSection {
  type: "hero";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonLink?: string;
  imageUrl?: string;
}

export interface CmsTextSection {
  type: "text";
  eyebrow?: string;
  title?: string;
  content: string;
}

export interface CmsCardItem {
  icon?: string;
  title: string;
  description: string;
  link?: string;
}

export interface CmsCardsSection {
  type: "cards";
  eyebrow?: string;
  title?: string;
  items: CmsCardItem[];
}

export interface CmsGallerySection {
  type: "gallery";
  title?: string;
  images: Array<{ url: string; alt?: string; caption?: string }>;
}

export interface CmsCtaSection {
  type: "cta";
  title: string;
  subtitle?: string;
  buttonLabel: string;
  buttonLink: string;
}

export type CmsSection =
  CmsHeroSection | CmsTextSection | CmsCardsSection | CmsGallerySection | CmsCtaSection;

export interface CmsPageContent {
  sections: CmsSection[];
}

export interface CmsPageSeo {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}
