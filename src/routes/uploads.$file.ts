import { createFileRoute } from "@tanstack/react-router";
import { storage } from "@/lib/storage.server";

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

export const Route = createFileRoute("/uploads/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const data = await storage.get(params.file);
          const ext = params.file.split(".").pop()?.toLowerCase() || "";
          return new Response(new Uint8Array(data), { headers: { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
        } catch {
          return new Response("Imagem não encontrada", { status: 404 });
        }
      },
    },
  },
});
