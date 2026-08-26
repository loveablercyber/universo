import { createFileRoute } from "@tanstack/react-router";
import { EloContentPage } from "@/components/elo/EloContentPage";

export const Route = createFileRoute("/projeto-elo/historias")({
  head: () => ({ meta: [{ title: "Histórias | Projeto Elo" }] }),
  component: () => <EloContentPage kind="stories" />,
});
