import { createFileRoute } from "@tanstack/react-router";
import { Award, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { InstitutionalLayout, InstitutionalSection } from "@/components/carol/InstitutionalLayout";
import { siteLinks } from "@/lib/site-links";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Carol Sol | Perfil profissional" },
      {
        name: "description",
        content:
          "Conheça Carol Sol, especialista em mega hair há 15 anos, com atendimento humanizado e protocolos personalizados.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/sobre" }],
  }),
  component: SobrePage,
});

const highlights = [
  {
    icon: Award,
    title: "15 anos de experiência",
    text: "Uma trajetória construída com prática, atualização constante e compromisso com cada resultado.",
  },
  {
    icon: Heart,
    title: "Atendimento humanizado",
    text: "Escuta, acolhimento e transparência para compreender a história e o desejo de cada cliente.",
  },
  {
    icon: ShieldCheck,
    title: "Protocolos personalizados",
    text: "Cada indicação considera cabelo natural, rotina, histórico químico, conforto e objetivo estético.",
  },
];

const specialties = [
  {
    title: "Especialista em Mega Hair",
    text: "Técnicas modernas, aplicação segura e manutenção cuidadosa para resultados naturais e duradouros.",
  },
  {
    title: "Bio Orgânico & Fibra Russa",
    text: "Seleção de fios premium para oferecer naturalidade, movimento, leveza e acabamento elegante.",
  },
  {
    title: "Fita Adesiva, Microlink e Entrelaçamento",
    text: "Protocolos personalizados para diferentes fios, necessidades e estilos de vida.",
  },
];

function SobrePage() {
  return (
    <InstitutionalLayout
      eyebrow="Perfil profissional"
      title="Técnica, cuidado e transformação em cada atendimento."
      description="Carol Sol é especialista em mega hair, com foco em resultados naturais, seguros e duradouros."
    >
      <InstitutionalSection
        eyebrow="Carol Sol"
        title="Uma profissional dedicada à identidade de cada cliente."
      >
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <img
            src="/images/salao-carol-sol.jpg"
            alt="Carol Sol em ambiente de atendimento premium"
            className="h-[420px] w-full rounded-[2rem] object-cover shadow-xl shadow-brown/10"
          />
          <div>
            <p className="text-sm leading-7 text-brown/75">
              Carol Sol é uma profissional especializada em mega hair, com foco em resultados
              naturais e duradouros. O atendimento é feito de forma individual, combinando
              diagnóstico capilar, seleção de fios premium e técnicas de aplicação seguras.
            </p>
            <p className="mt-5 text-sm leading-7 text-brown/75">
              Cada procedimento é pensado para valorizar a identidade da cliente, respeitar o cabelo
              natural e garantir conforto durante o uso. Antes de indicar um método, Carol considera
              rotina, estilo de vida, histórico químico, saúde capilar e expectativa.
            </p>
            <a
              href={siteLinks.agenda}
              className="mt-7 inline-flex rounded-md bg-copper-gradient px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white"
            >
              Agendar uma avaliação
            </a>
          </div>
        </div>
      </InstitutionalSection>

      <InstitutionalSection
        title="Experiência que acolhe. Método que protege."
        className="bg-white/55"
      >
        <div className="grid gap-5 md:grid-cols-3">
          {highlights.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-[1.5rem] border border-copper/15 bg-white p-7">
              <Icon className="h-7 w-7 text-copper" strokeWidth={1.4} />
              <h3 className="mt-5 font-serif text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-brown/70">{text}</p>
            </article>
          ))}
        </div>
      </InstitutionalSection>

      <InstitutionalSection eyebrow="Especialidades" title="Soluções escolhidas com propósito.">
        <div className="grid gap-5 md:grid-cols-3">
          {specialties.map(({ title, text }) => (
            <article key={title} className="rounded-[1.5rem] bg-brown p-7 text-warm-white">
              <Sparkles className="h-6 w-6 text-copper-light" strokeWidth={1.4} />
              <h3 className="mt-5 font-serif text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-warm-white/70">{text}</p>
            </article>
          ))}
        </div>
      </InstitutionalSection>
    </InstitutionalLayout>
  );
}
