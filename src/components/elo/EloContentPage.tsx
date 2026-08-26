import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Heart, ShieldCheck } from "lucide-react";
import { processSteps, socialImages, stories } from "@/data/elo-site";

type PageKind = "howToDonate" | "stories" | "gallery";

const pageCopy = {
  howToDonate: {
    eyebrow: "COMO DOAR",
    title: "Cada gesto inicia um novo começo",
    description:
      "Escolha como deseja apoiar o Projeto Elo. A equipe acolhe, organiza e acompanha cada etapa com cuidado.",
  },
  stories: {
    eyebrow: "HISTÓRIAS",
    title: "Histórias que inspiram nossa rede",
    description:
      "Conheça o propósito por trás de cada doação e faça parte de uma rede de acolhimento e autoestima.",
  },
  gallery: {
    eyebrow: "GALERIA",
    title: "Acompanhe o Projeto Elo",
    description:
      "Registros do nosso universo de cuidado, voluntariado e transformação. Siga também o Instagram para acompanhar as novidades.",
  },
} as const;

export function EloContentPage({ kind }: { kind: PageKind }) {
  const copy = pageCopy[kind];
  return (
    <main className="theme-elo min-h-screen bg-cream text-brown-dark">
      <header className="border-b border-border-soft bg-warm-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            to="/projeto-elo"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-copper"
          >
            <ArrowLeft size={15} /> PROJETO ELO
          </Link>
          <Link
            to="/doacao"
            className="text-xs font-semibold tracking-[0.16em] text-brown-mid hover:text-copper"
          >
            DOAR ONLINE
          </Link>
        </div>
      </header>

      <section className="bg-gradient-copper px-5 py-14 text-center text-white sm:px-8 sm:py-20">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-white/85">{copy.eyebrow}</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
          {copy.description}
        </p>
      </section>

      {kind === "howToDonate" && <HowToDonate />}
      {kind === "stories" && <Stories />}
      {kind === "gallery" && <Gallery />}
    </main>
  );
}

function HowToDonate() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {processSteps.map((step) => (
          <article
            key={step.title}
            className="rounded-2xl border border-border-soft bg-warm-white p-6 text-center shadow-sm"
          >
            <step.icon className="mx-auto h-9 w-9 text-copper" strokeWidth={1.25} />
            <h2 className="mt-4 text-xs font-semibold tracking-[0.15em]">{step.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-soft">{step.text}</p>
          </article>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          to="/projeto-elo/participar"
          search={{ tipo: "hair_donation" }}
          className="inline-flex items-center gap-2 rounded-full bg-copper px-7 py-3.5 text-xs font-semibold tracking-[0.16em] text-white"
        >
          DOAR CABELO OU MATERIAL <Heart size={15} fill="currentColor" />
        </Link>
        <Link
          to="/doacao"
          className="inline-flex items-center gap-2 rounded-full border border-copper/35 px-7 py-3.5 text-xs font-semibold tracking-[0.16em] text-copper"
        >
          FAZER DOAÇÃO ONLINE <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}

function Stories() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-5 py-14 sm:grid-cols-3 sm:px-8 sm:py-20">
      {stories.map((story) => (
        <article
          key={story.image}
          className="overflow-hidden rounded-2xl border border-border-soft bg-warm-white shadow-sm"
        >
          <img
            src={story.image}
            alt="Registro do Projeto Elo"
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
          <p className="p-6 font-serif text-xl italic leading-relaxed text-brown-mid">
            {story.text}
          </p>
        </article>
      ))}
    </section>
  );
}

function Gallery() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {socialImages.map((image, index) => (
          <img
            key={image}
            src={image}
            alt={`Registro ${index + 1} do Projeto Elo`}
            loading="lazy"
            className="aspect-square w-full rounded-xl object-cover shadow-sm"
          />
        ))}
      </div>
      <a
        href="https://www.instagram.com/carolsolhair/"
        className="mx-auto mt-10 flex w-fit items-center gap-2 rounded-full bg-copper px-7 py-3.5 text-xs font-semibold tracking-[0.16em] text-white"
      >
        ACOMPANHAR NO INSTAGRAM <ArrowRight size={15} />
      </a>
      <p className="mt-5 flex justify-center gap-2 text-center text-xs text-text-soft">
        <ShieldCheck size={15} /> Imagens e informações são atualizadas pela equipe do Projeto Elo.
      </p>
    </section>
  );
}
