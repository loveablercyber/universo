import { createFileRoute } from "@tanstack/react-router";
import { EloContentPage } from "@/components/elo/EloContentPage";

export const Route = createFileRoute("/projeto-elo/galeria")({
  head: () => ({ meta: [{ title: "Galeria | Projeto Elo" }] }),
  component: () => <EloContentPage kind="gallery" />,
});
