import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/carol/Header";
import { HeroSection } from "@/components/carol/HeroSection";
import { PossibilitiesSection } from "@/components/carol/PossibilitiesSection";
import { PurposeSection } from "@/components/carol/PurposeSection";
import { StatisticsSection } from "@/components/carol/StatisticsSection";
import { FinalCTA } from "@/components/carol/FinalCTA";
import { Footer } from "@/components/carol/Footer";
import { UniverseSwitcher } from "@/components/UniverseSwitcher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carol Sol · Luxury Hair & Beauty Universe" },
      {
        name: "description",
        content:
          "Universo Carol Sol: salão premium, aplicativo, loja de mega hair e Projeto Elo. Beleza que transforma, confiança que empodera.",
      },
      { property: "og:title", content: "Carol Sol · Luxury Hair & Beauty Universe" },
      {
        property: "og:description",
        content: "Salão premium, aplicativo, loja e Projeto Elo em um só universo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/" }],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    if (window.location.hostname !== "loja.carolsol.com.br") return;

    window.location.replace(`/sol-hair-closet${window.location.search}${window.location.hash}`);
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <UniverseSwitcher />
      <Header />
      <main>
        <HeroSection />
        <PossibilitiesSection />
        <PurposeSection />
        <StatisticsSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
