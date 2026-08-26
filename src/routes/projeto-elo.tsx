import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { UniverseSwitcher } from "@/components/UniverseSwitcher";
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Menu,
  X,
  Instagram,
  MessageCircle,
  Mail,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  navigation,
  helpCards,
  impactStats,
  stories,
  processSteps,
  socialImages,
  footerLinks,
  universoNav,
} from "../data/elo-site";

export const Route = createFileRoute("/projeto-elo")({
  head: () => ({
    meta: [
      { title: "Projeto Elo | Universo Carol Sol" },
      {
        name: "description",
        content:
          "Projeto social que transforma doações de cabelo e cuidado em autoestima e novas histórias.",
      },
      { property: "og:title", content: "Projeto Elo | Universo Carol Sol" },
      {
        property: "og:description",
        content: "Transformando doações em autoestima, acolhimento e novas histórias.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/projeto-elo" }],
  }),
  component: ProjetoEloRoute,
});

function ProjetoEloRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Esta rota também é o layout das páginas internas. Sem o Outlet, o TanStack
  // sempre mantinha a home visível em /participar e /transparencia.
  return pathname === "/projeto-elo" ? <Home /> : <Outlet />;
}

/* ---------------- Logo ---------------- */
function Logo({ dark = false }: { dark?: boolean }) {
  const colorClass = dark ? "text-copper" : "text-copper";
  return (
    <div className={`flex flex-col items-center leading-none ${colorClass}`}>
      <div className="relative flex items-center">
        <span className="font-script text-5xl -mb-1">Elo</span>
        <Heart className="ml-1 h-4 w-4 fill-current" strokeWidth={1.2} />
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-copper/60">✦</span>
        <span className="font-sans-brand text-[11px] tracking-[0.25em]">PROJETO ELO</span>
        <span className="text-copper/60">✦</span>
      </div>
    </div>
  );
}

/* ---------------- Heart divider ---------------- */
function HeartDivider() {
  return (
    <div className="mx-auto mt-3 flex items-center justify-center gap-2">
      <span className="block h-px w-10 bg-line-soft" />
      <Heart className="h-3 w-3 text-copper" strokeWidth={1.5} />
      <span className="block h-px w-10 bg-line-soft" />
    </div>
  );
}

function EloInternalLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to as never} className={className}>
      {children}
    </Link>
  );
}

/* ---------------- Top bar ---------------- */
function TopUniverseBar() {
  return (
    <div className="w-full bg-beige">
      <div className="mx-auto flex h-10 max-w-[1440px] items-center justify-center gap-4 px-4">
        <span className="h-px w-10 bg-copper/40" />
        <p className="font-sans-brand text-[11px] tracking-[0.3em] text-copper">
          UNIVERSO <span className="text-copper/70">✦</span> CAROL SOL
        </p>
        <span className="h-px w-10 bg-copper/40" />
      </div>
    </div>
  );
}

/* ---------------- Header ---------------- */
function MainHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-warm-white/95 backdrop-blur">
      <div className="mx-auto flex h-[92px] max-w-[1440px] items-center justify-between px-6 lg:px-10">
        <a href="#inicio" aria-label="Projeto Elo">
          <Logo />
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {navigation.map((n) =>
            n.href.startsWith("/") ? (
              <EloInternalLink
                key={n.label}
                to={n.href}
                className={`font-sans-brand text-[11px] tracking-[0.25em] transition-colors hover:text-copper ${n.active ? "text-copper" : "text-brown-mid"}`}
              >
                {n.label}
                {n.active && <span className="mx-auto mt-1 block h-px w-6 bg-copper" />}
              </EloInternalLink>
            ) : (
              <a
                key={n.label}
                href={n.href}
                className={`font-sans-brand text-[11px] tracking-[0.25em] transition-colors hover:text-copper ${n.active ? "text-copper" : "text-brown-mid"}`}
              >
                {n.label}
                {n.active && <span className="mx-auto mt-1 block h-px w-6 bg-copper" />}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#apoiar"
            className="hidden md:inline-flex items-center gap-2 rounded-full bg-gradient-copper px-6 py-3 font-sans-brand text-[11px] tracking-[0.2em] text-white shadow-sm transition hover:brightness-105"
          >
            QUERO APOIAR <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
          <button
            className="lg:hidden text-brown-dark"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-cream lg:hidden">
          <div className="flex h-[92px] items-center justify-between px-6">
            <Logo />
            <button onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X className="h-6 w-6 text-brown-dark" />
            </button>
          </div>
          <nav className="mt-6 flex flex-col items-center gap-6">
            {navigation.map((n) =>
              n.href.startsWith("/") ? (
                <EloInternalLink
                  key={n.label}
                  to={n.href}
                  className="font-sans-brand text-sm tracking-[0.25em] text-brown-mid"
                >
                  {n.label}
                </EloInternalLink>
              ) : (
                <a
                  key={n.label}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="font-sans-brand text-sm tracking-[0.25em] text-brown-mid"
                >
                  {n.label}
                </a>
              ),
            )}
            <a
              href="#apoiar"
              onClick={() => setOpen(false)}
              className="mt-4 rounded-full bg-gradient-copper px-6 py-3 font-sans-brand text-xs tracking-[0.2em] text-white"
            >
              QUERO APOIAR ♡
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ---------------- Hero ---------------- */
function HeroSection() {
  return (
    <section id="inicio" className="bg-cream">
      <div className="mx-auto max-w-[1440px] px-6 py-12 lg:px-10 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left text */}
          <div className="relative z-10 flex min-w-0 flex-col justify-center lg:col-span-4">
            <p className="font-sans-brand text-[10px] tracking-[0.18em] text-brown-mid sm:text-[11px] sm:tracking-[0.28em]">
              CABELOS QUE CONECTAM HISTÓRIAS
            </p>
            <h1 className="mt-6 font-serif text-[2rem] leading-[1.05] text-brown-dark min-[360px]:text-[2.35rem] sm:text-5xl lg:text-[3.5rem]">
              TRANSFORMAMOS
              <br />
              DOAÇÕES EM
              <br />
              <span className="font-script text-[3.25rem] font-normal text-copper min-[360px]:text-6xl lg:text-7xl">
                novos começos
              </span>
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px w-24 bg-line-soft" />
              <Heart className="h-3.5 w-3.5 text-copper" strokeWidth={1.5} />
              <span className="h-px w-6 bg-line-soft" />
            </div>
            <p className="mt-6 max-w-md font-sans-brand text-sm leading-relaxed text-text-soft">
              Recebemos doações de cabelos e levamos autoestima,
              <br />
              acolhimento e esperança para quem mais precisa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/doacao"
                className="inline-flex items-center gap-3 rounded-full bg-copper px-7 py-3.5 font-sans-brand text-[11px] font-semibold tracking-[0.25em] text-white shadow-lg transition hover:bg-copper/90"
              >
                FAZER DOAÇÃO ONLINE <Heart className="h-3.5 w-3.5 fill-current" strokeWidth={1.5} />
              </Link>
              <a
                href="#como-doar"
                className="inline-flex items-center gap-3 rounded-full border border-copper/30 bg-warm-white px-7 py-3.5 font-sans-brand text-[11px] tracking-[0.25em] text-brown-dark transition hover:bg-cream"
              >
                SAIBA MAIS <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Image */}
          <div className="relative z-0 min-w-0 lg:col-span-6">
            <div className="aspect-[6/5] overflow-hidden rounded-2xl bg-beige shadow-sm">
              <img
                src="/images/hero-projeto-elo.jpg"
                alt="Abraço acolhedor entre duas mulheres"
                width={1200}
                height={1000}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <Heart
              className="pointer-events-none absolute bottom-4 left-5 h-5 w-5 text-copper/80"
              strokeWidth={1.2}
            />
          </div>

          {/* Quote */}
          <div className="lg:col-span-2 flex flex-col justify-center relative">
            <span className="font-serif text-6xl leading-none text-copper">"</span>
            <p className="mt-2 font-sans-brand text-sm leading-[1.9] text-brown-mid">
              Um gesto
              <br />
              pode ser
              <br />
              pequeno
              <br />
              para você,
              <br />
              mas gigante
              <br />
              para quem
              <br />
              recebe.
            </p>
            <svg className="mt-6 h-10 w-full text-copper/50" viewBox="0 0 120 40" fill="none">
              <path
                d="M2 20 C 30 5, 60 35, 90 15"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path
                d="M100 18 c 2 -6, 12 -6, 10 2 c 0 6 -10 10 -10 10 c 0 0 -10 -4 -10 -10 c -2 -8, 8 -8, 10 -2z"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Help section ---------------- */
function HelpSection() {
  return (
    <section id="como-doar" className="bg-cream py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <p className="text-center font-sans-brand text-[11px] tracking-[0.3em] text-copper">
          COMO VOCÊ PODE AJUDAR
        </p>
        <h2 className="mt-3 text-center font-serif text-2xl uppercase tracking-wide text-brown-dark sm:text-3xl lg:text-4xl">
          Pequenas Ações, Grandes Transformações
        </h2>
        <HeartDivider />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {helpCards.map((c) => (
            <article
              key={c.title}
              className="flex flex-col items-center rounded-2xl border border-border-soft bg-warm-white p-8 text-center transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-copper text-white">
                <c.icon className="h-7 w-7" strokeWidth={1.3} />
              </div>
              <h3 className="mt-5 font-serif text-2xl text-brown-dark">
                {c.title}{" "}
                <span className="font-script text-3xl text-copper font-normal">{c.script}</span>
              </h3>
              <p className="mt-4 min-h-[72px] font-sans-brand text-sm leading-relaxed text-text-soft">
                {c.text}
              </p>
              <EloInternalLink
                to={c.href}
                className="mt-6 w-full rounded-full bg-gradient-copper px-6 py-3 font-sans-brand text-[11px] tracking-[0.2em] text-white transition hover:brightness-105"
              >
                {c.cta}
              </EloInternalLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Impact ---------------- */
function ImpactSection() {
  return (
    <section className="bg-beige py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <h2 className="text-center font-serif text-3xl uppercase tracking-wide text-brown-dark lg:text-4xl">
          Nosso Impacto
        </h2>
        <p className="mt-3 text-center font-sans-brand text-sm text-text-soft">
          Cada doação gera um recomeço. Cada gesto transforma histórias.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-8 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {impactStats.map((s, i) => (
            <div key={i} className="relative flex flex-col items-center text-center">
              <s.icon className="h-9 w-9 text-copper" strokeWidth={1.2} />
              <p className="mt-4 font-serif text-4xl text-copper">{s.value}</p>
              <p className="mt-2 font-sans-brand text-[11px] tracking-[0.22em] text-brown-mid">
                {s.label[0]}
                <br />
                {s.label[1]}
              </p>
              {i < impactStats.length - 1 && (
                <span className="absolute right-0 top-6 hidden h-16 w-px bg-line-soft lg:block" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <EloInternalLink
            to="/projeto-elo/transparencia"
            className="inline-flex items-center gap-3 rounded-full bg-gradient-copper px-7 py-3.5 font-sans-brand text-[11px] tracking-[0.25em] text-white"
          >
            ACOMPANHAR RESULTADOS <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </EloInternalLink>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Stories carousel ---------------- */
function StoriesSection() {
  const [start, setStart] = useState(0);
  const visible = 3;
  const total = stories.length;
  const prev = () => setStart((s) => (s - 1 + total) % total);
  const next = () => setStart((s) => (s + 1) % total);
  const shown = Array.from({ length: visible }, (_, i) => stories[(start + i) % total]);

  return (
    <section id="historias" className="bg-cream py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <h2 className="text-center font-serif text-3xl uppercase tracking-wide text-brown-dark lg:text-4xl">
          Histórias que Inspiram
        </h2>
        <HeartDivider />

        <div className="relative mt-12">
          <button
            onClick={prev}
            aria-label="Anterior"
            className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border-soft bg-warm-white p-3 shadow-md hover:bg-beige md:flex"
          >
            <ChevronLeft className="h-5 w-5 text-copper" strokeWidth={1.5} />
          </button>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((s, i) => (
              <article
                key={i}
                className="overflow-hidden rounded-2xl border border-border-soft bg-warm-white"
              >
                <div className="relative">
                  <img
                    src={s.image}
                    alt=""
                    width={800}
                    height={800}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {i === 0 && (
                    <div className="absolute -bottom-6 right-6 h-24 w-24 overflow-hidden rounded-full border-4 border-warm-white shadow-md">
                      <img
                        src="/images/social-3.jpg"
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <div className="p-6 pt-8">
                  <p className="font-serif text-lg italic text-brown-mid">{s.text}</p>
                  <EloInternalLink
                    to="/projeto-elo/participar"
                    className="mt-4 inline-flex items-center gap-2 font-sans-brand text-[11px] tracking-[0.25em] text-copper"
                  >
                    VER HISTÓRIA <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                  </EloInternalLink>
                </div>
              </article>
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Próximo"
            className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border-soft bg-warm-white p-3 shadow-md hover:bg-beige md:flex"
          >
            <ChevronRight className="h-5 w-5 text-copper" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Process ---------------- */
function ProcessSection() {
  return (
    <section className="bg-beige py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <h2 className="text-center font-serif text-2xl uppercase tracking-wide text-brown-dark lg:text-3xl">
          Como as Doações Viram Esperança
        </h2>
        <HeartDivider />

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:flex lg:items-start lg:justify-between lg:gap-2">
          {processSteps.map((step, i) => (
            <div key={step.title} className="flex items-start lg:flex-1">
              <div className="flex flex-1 flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line-soft bg-cream">
                  <step.icon className="h-8 w-8 text-copper" strokeWidth={1.2} />
                </div>
                <h3 className="mt-4 font-sans-brand text-xs tracking-[0.22em] text-brown-dark">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[160px] font-sans-brand text-xs leading-relaxed text-text-soft">
                  {step.text}
                </p>
              </div>
              {i < processSteps.length - 1 && (
                <ArrowRight
                  className="hidden lg:block mt-8 h-4 w-4 shrink-0 text-copper/60"
                  strokeWidth={1.2}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA banner ---------------- */
function CommunityCTA() {
  return (
    <section id="apoiar" className="relative overflow-hidden bg-gradient-copper py-10">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-6 md:flex-row lg:px-10">
        <div className="text-white">
          <p className="font-sans-brand text-[11px] tracking-[0.3em]">
            FAÇA PARTE DESTA CORRENTE DO BEM
          </p>
          <p className="mt-2 font-script text-5xl leading-none">
            Doe, solicite, apoie, compartilhe.
          </p>
          <p className="mt-3 font-sans-brand text-sm text-white/90">
            Juntos, criamos elos que devolvem autoestima e esperança.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/doacao"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white bg-white px-7 py-3.5 font-sans-brand text-[11px] font-semibold tracking-[0.25em] text-copper shadow-lg transition hover:bg-cream"
          >
            DOAR AGORA (ONLINE) <Heart className="h-3.5 w-3.5 fill-current" strokeWidth={1.5} />
          </Link>
          <a
            href="https://wa.me/5514998373935?text=Ol%C3%A1%2C%20quero%20conhecer%20e%20apoiar%20o%20Projeto%20Elo."
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/70 bg-white/10 px-7 py-3.5 font-sans-brand text-[11px] tracking-[0.25em] text-white backdrop-blur hover:bg-white/20"
          >
            FALAR NO WHATSAPP <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
        </div>
        <Heart
          className="pointer-events-none absolute -right-6 top-1/2 h-40 w-40 -translate-y-1/2 text-white/15"
          strokeWidth={0.8}
        />
      </div>
    </section>
  );
}

/* ---------------- Social & Gallery ---------------- */
function SocialGallerySection() {
  const socials = [{ icon: Instagram, label: "Instagram" }];
  return (
    <section id="galeria" className="bg-cream py-12">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-6 md:grid-cols-2 lg:grid-cols-[1fr_2fr] lg:px-10">
        <div>
          <p className="font-sans-brand text-[11px] tracking-[0.3em] text-brown-mid">
            SIGA E ACOMPANHE NOSSO TRABALHO
          </p>
          <div className="mt-4 flex gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href="https://www.instagram.com/carolsolhair/"
                aria-label={s.label}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-copper/40 bg-warm-white text-copper transition hover:bg-copper hover:text-white"
              >
                <s.icon className="h-4 w-4" strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {socialImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              width={600}
              height={600}
              className="aspect-square w-full rounded-lg object-cover"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer
      id="transparencia"
      className="bg-gradient-to-b from-brown-mid to-brown-dark text-white/85"
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <div>
          <Logo />
          <p className="mt-6 font-sans-brand text-[10px] leading-relaxed tracking-[0.2em] text-white/70">
            TRANSFORMANDO DOAÇÕES
            <br />
            EM AUTOESTIMA.
            <br />
            UMA INICIATIVA DO
            <br />
            UNIVERSO CAROL SOL.
          </p>
        </div>

        <div>
          <h4 className="font-sans-brand text-[11px] tracking-[0.3em]">NAVEGAÇÃO</h4>
          <ul className="mt-5 space-y-2 font-sans-brand text-sm">
            {footerLinks.navigation.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="text-white/75 hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-sans-brand text-[11px] tracking-[0.3em]">CONTATO</h4>
          <ul className="mt-5 space-y-3 font-sans-brand text-sm">
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-copper" strokeWidth={1.5} />{" "}
              {footerLinks.contact[0].value}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-copper" strokeWidth={1.5} />{" "}
              {footerLinks.contact[1].value}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-copper" strokeWidth={1.5} />{" "}
              {footerLinks.contact[2].value}
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-sans-brand text-[11px] tracking-[0.3em]">TRANSPARÊNCIA</h4>
          <ul className="mt-5 space-y-2 font-sans-brand text-sm">
            {footerLinks.transparency.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="text-white/75 hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Bottom bar ---------------- */
function BottomUniverseBar() {
  return (
    <div className="bg-cream">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-2 px-6 py-5 text-center">
        <p className="font-sans-brand text-[11px] tracking-[0.3em] text-copper">
          UNIVERSO <Sparkles className="mx-1 inline h-3 w-3" strokeWidth={1.5} /> CAROL SOL
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-sans-brand text-[10px] tracking-[0.25em] text-brown-mid">
          {universoNav.map((item, i) => (
            <span key={item} className="flex items-center gap-3">
              {item}
              {i < universoNav.length - 1 && <span className="text-copper/60">✦</span>}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
function Home() {
  return (
    <main className="theme-elo min-h-screen bg-cream text-brown-dark">
      <UniverseSwitcher />
      <TopUniverseBar />
      <MainHeader />
      <HeroSection />
      <HelpSection />
      <ImpactSection />
      <StoriesSection />
      <ProcessSection />
      <CommunityCTA />
      <SocialGallerySection />
      <Footer />
      <BottomUniverseBar />
    </main>
  );
}
