import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalLayout, InstitutionalSection } from "@/components/carol/InstitutionalLayout";
import { siteLinks } from "@/lib/site-links";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços de Mega Hair | Carol Sol" },
      {
        name: "description",
        content:
          "Avaliação personalizada, aplicação, manutenção, coloração e tratamentos para mega hair.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/servicos" }],
  }),
  component: ServicosPage,
});

const services = [
  {
    title: "Avaliação personalizada",
    text: "Diagnóstico do cabelo, histórico químico, rotina e objetivo para definir a indicação mais segura.",
  },
  {
    title: "Aplicação de Mega Hair",
    text: "Planejamento de volume, comprimento, cor e distribuição para um resultado equilibrado e natural.",
  },
  {
    title: "Manutenção",
    text: "Reposicionamento, higienização, revisão dos pontos e preservação do cabelo natural.",
  },
  {
    title: "Fita adesiva",
    text: "Aplicação leve e de acabamento discreto, indicada após avaliação individual.",
  },
  {
    title: "Microlink",
    text: "Técnica versátil sem cola, aplicada com precisão e acompanhamento periódico.",
  },
  {
    title: "Entrelaçamento",
    text: "Protocolo planejado de acordo com estrutura capilar, conforto e estilo desejado.",
  },
  {
    title: "Coloração e harmonização",
    text: "Ajustes de tom para integrar cabelo natural e extensões com acabamento sofisticado.",
  },
  {
    title: "Tratamentos e cuidados",
    text: "Protocolos para manter brilho, maciez, movimento e saúde dos fios entre manutenções.",
  },
];

function ServicosPage() {
  return (
    <InstitutionalLayout
      eyebrow="Serviços"
      title="Cada cabelo pede uma escolha diferente."
      description="As técnicas são indicadas somente após avaliação. O objetivo é unir estética, segurança e conforto."
    >
      <InstitutionalSection eyebrow="Atendimento consultivo" title="Protocolos pensados para você.">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <article
              key={service.title}
              className="rounded-[1.5rem] border border-copper/15 bg-white p-6"
            >
              <span className="text-[10px] tracking-[0.2em] text-copper">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-4 font-serif text-2xl">{service.title}</h2>
              <p className="mt-3 text-sm leading-6 text-brown/70">{service.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-[2rem] bg-brown p-8 text-warm-white md:flex md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-3xl">A indicação começa pelo diagnóstico.</h2>
            <p className="mt-2 text-sm text-warm-white/70">
              Valores, tempo e método dependem da avaliação e do resultado desejado.
            </p>
          </div>
          <a
            href={siteLinks.agenda}
            className="mt-6 inline-flex rounded-md bg-copper-gradient px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-white md:mt-0"
          >
            Agendar avaliação
          </a>
        </div>
      </InstitutionalSection>
    </InstitutionalLayout>
  );
}
