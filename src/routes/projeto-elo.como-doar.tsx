import { createFileRoute } from "@tanstack/react-router";
import { EloContentPage } from "@/components/elo/EloContentPage";

export const Route = createFileRoute("/projeto-elo/como-doar")({
  head: () => ({ meta: [{ title: "Como Doar | Projeto Elo" }] }),
  component: () => <EloContentPage kind="howToDonate" />,
});
