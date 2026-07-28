import { createFileRoute } from "@tanstack/react-router";
import { Eye, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { InstitutionalLayout, InstitutionalSection } from "@/components/carol/InstitutionalLayout";
import { siteLinks } from "@/lib/site-links";

export const Route = createFileRoute("/salao")({
  head: () => ({
    meta: [
      { title: "Salão Carol Sol Hair Extensions" },
      {
        name: "description",
        content:
          "Um espaço especializado em transformação capilar, mega hair e atendimento premium em Bauru.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/salao" }],
  }),
  component: SalaoPage,
});

const values = [
  {
    icon: Eye,
    title: "Diagnóstico antes da indicação",
    text: "O método nasce da análise, nunca de uma solução genérica.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança e transparência",
    text: "Orientações claras sobre aplicação, manutenção e cuidados.",
  },
  {
    icon: HeartHandshake,
    title: "Acolhimento",
    text: "Uma experiência calma, respeitosa e individual do primeiro contato ao pós-atendimento.",
  },
  {
    icon: Sparkles,
    title: "Naturalidade",
    text: "Volume, comprimento e acabamento planejados para valorizar sua identidade.",
  },
];

function SalaoPage() {
  return (
    <InstitutionalLayout
      eyebrow="Carol Sol Hair Extensions"
      title="Mais do que um salão. Um centro de transformação de autoestima."
      description="Um ambiente premium onde técnica, organização e cuidado se encontram para criar resultados naturais."
    >
      <InstitutionalSection
        eyebrow="Nossa missão"
        title="Resultados naturais, seguros e personalizados."
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-5 text-sm leading-7 text-brown/75">
            <p>
              A Carol Sol Hair Extensions é o coração do Universo Carol Sol e a origem da autoridade
              construída em mega hair. Aqui, a cliente não recebe apenas um procedimento: recebe
              orientação, cuidado e acompanhamento.
            </p>
            <p>
              Nossa missão é entregar resultados personalizados por meio de técnicas modernas, fios
              selecionados e atendimento humanizado. Não competimos por preço; escolhemos qualidade,
              naturalidade, confiança e experiência.
            </p>
          </div>
          <img
            src="/images/hero-carol-sol.jpg"
            alt="Experiência Carol Sol Hair Extensions"
            className="h-80 w-full rounded-[2rem] object-cover"
          />
        </div>
      </InstitutionalSection>

      <InstitutionalSection title="A experiência Carol Sol." className="bg-white/55">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-[1.5rem] border border-copper/15 bg-white p-6">
              <Icon className="h-7 w-7 text-copper" strokeWidth={1.4} />
              <h3 className="mt-4 font-serif text-xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-brown/70">{text}</p>
            </article>
          ))}
        </div>
      </InstitutionalSection>

      <InstitutionalSection eyebrow="Sua jornada" title="Do primeiro contato ao cuidado contínuo.">
        <ol className="grid gap-5 md:grid-cols-5">
          {["Descoberta", "Triagem", "Avaliação", "Aplicação", "Pós-atendimento"].map(
            (step, index) => (
              <li key={step} className="rounded-[1.5rem] bg-brown p-6 text-warm-white">
                <span className="text-xs tracking-[0.2em] text-copper-light">0{index + 1}</span>
                <h3 className="mt-3 font-serif text-xl">{step}</h3>
              </li>
            ),
          )}
        </ol>
        <a
          href={siteLinks.agenda}
          className="mt-8 inline-flex rounded-md bg-copper-gradient px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-white"
        >
          Iniciar minha jornada
        </a>
      </InstitutionalSection>
    </InstitutionalLayout>
  );
}
