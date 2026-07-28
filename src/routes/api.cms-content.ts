import { createFileRoute } from "@tanstack/react-router";
import { getCmsPage } from "@/lib/cms.server";

export const Route = createFileRoute("/api/cms-content")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const slug = url.searchParams.get("slug") || "inicio";

        try {
          const pageData = await getCmsPage(slug);
          return Response.json({ ok: true, data: pageData });
        } catch (error) {
          console.error(`Erro ao carregar conteúdo CMS para slug: ${slug}`, error);
          return Response.json(
            { ok: false, message: "Não foi possível carregar o conteúdo." },
            { status: 500 },
          );
        }
      },
    },
  },
});
