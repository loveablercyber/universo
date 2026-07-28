import { query } from "./db.server";
import { defaultCmsPages } from "@/data/cms-defaults";
import { CmsPageContent, CmsPageSeo } from "./cms.types";

export interface CmsPageData {
  id?: string;
  slug: string;
  title: string;
  status: string;
  content: CmsPageContent;
  seo: CmsPageSeo;
  updatedAt?: string;
}

export async function getCmsPage(slug: string): Promise<CmsPageData> {
  const fallback = defaultCmsPages[slug] || {
    title: slug,
    seo: { title: "Universo Carol Sol" },
    content: { sections: [] },
  };

  try {
    const { rows } = await query<CmsPageData>(
      `select id, slug, title, status, content, seo, updated_at as "updatedAt"
         from universe.cms_pages
        where slug = $1 and status = 'published'
        limit 1`,
      [slug],
    );

    if (rows.length > 0 && rows[0].content?.sections?.length) {
      return {
        ...rows[0],
        seo: { ...fallback.seo, ...rows[0].seo },
      };
    }
  } catch (error) {
    console.warn(
      `[CMS Server] Falha ao ler banco para slug '${slug}'. Usando fallback estático.`,
      error,
    );
  }

  return {
    slug,
    title: fallback.title,
    status: "published",
    content: fallback.content,
    seo: fallback.seo,
  };
}
