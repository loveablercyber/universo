import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Download,
  GraduationCap,
  HeartHandshake,
  LogIn,
  Share,
  ShoppingBag,
  Smartphone,
  X,
} from "lucide-react";
import { InstitutionalLayout } from "@/components/carol/InstitutionalLayout";
import { siteLinks } from "@/lib/site-links";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "App Carol Sol · Seu universo em um só lugar" },
      {
        name: "description",
        content:
          "Instale o App Carol Sol e acesse loja, cursos, agenda, Projeto Elo e seus serviços em um só lugar.",
      },
      { name: "theme-color", content: "#221713" },
      { property: "og:title", content: "App Carol Sol" },
      {
        property: "og:description",
        content: "Compras, cursos, agendamentos e serviços Carol Sol na palma da sua mão.",
      },
      { property: "og:image", content: "https://www.carolsol.com.br/images/aplicativo-carol-sol.jpg" },
    ],
    links: [
      { rel: "canonical", href: "https://carolsol.com.br/app" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/app-icon.svg" },
    ],
  }),
  component: AppPage,
});

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const features = [
  {
    icon: ShoppingBag,
    eyebrow: "Loja",
    title: "Compre cabelos e acessórios",
    text: "Conheça fios, fibras, acessórios e produtos selecionados pela curadoria Carol Sol.",
    label: "Ir para a loja",
    href: siteLinks.store,
    tone: "bg-[#f3e4dc]",
  },
  {
    icon: GraduationCap,
    eyebrow: "Cursos",
    title: "Aprenda e contrate sua formação",
    text: "Veja detalhes, conteúdos e condições dos cursos da Invisible Academy antes de se matricular.",
    label: "Conhecer os cursos",
    href: siteLinks.academy,
    tone: "bg-[#e7dfd5]",
  },
  {
    icon: CalendarDays,
    eyebrow: "Agenda",
    title: "Agende seu atendimento",
    text: "Escolha o melhor horário para sua avaliação ou serviço com poucos passos.",
    label: "Fazer agendamento",
    href: siteLinks.agenda,
    tone: "bg-[#efe0d2]",
  },
  {
    icon: LogIn,
    eyebrow: "Minha conta",
    title: "Acompanhe tudo em um só lugar",
    text: "Entre para consultar serviços contratados, compras, cursos e agendamentos de forma resumida.",
    label: "Acessar minha conta",
    href: "/conta",
    tone: "bg-[#e3ddd7]",
  },
  {
    icon: HeartHandshake,
    eyebrow: "Projeto Elo",
    title: "Faça parte desta transformação",
    text: "Conheça o projeto, acompanhe histórias e descubra como doar ou participar.",
    label: "Conhecer o Projeto Elo",
    href: siteLinks.elo,
    tone: "bg-[#f2ded9]",
  },
] as const;

function AppPage() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  return (
    <InstitutionalLayout
      eyebrow="App Carol Sol"
      title="Seu universo de beleza na palma da mão."
      description="Uma experiência mais rápida e organizada para comprar, aprender, agendar e acompanhar tudo o que você vive com a Carol Sol."
    >
      <section className="px-6 py-12 md:py-20">
        <div className="container-cs grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-5 -rotate-3 rounded-[2.5rem] bg-copper/10" />
            <img
              src="/images/aplicativo-carol-sol.jpg"
              alt="Aplicativo Carol Sol no celular"
              className="relative aspect-[4/3] w-full rounded-[2rem] object-cover shadow-2xl"
            />
            <div className="absolute -bottom-5 left-5 right-5 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-xl backdrop-blur">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-copper-light">
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-copper">App Carol Sol</p>
                <p className="mt-1 text-sm font-medium text-brown">Leve, seguro e sempre à mão</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-copper">
              Não ocupa a loja de aplicativos
            </p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight text-brown md:text-5xl">
              Instale direto pelo navegador.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-brown/70">
              O App Carol Sol é um PWA: ele pode ficar na tela inicial do seu celular e abrir como
              um aplicativo, sem precisar procurar na App Store ou Google Play.
            </p>
            <button
              type="button"
              onClick={installApp}
              disabled={isInstalled}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-copper-gradient px-7 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white shadow-lg transition hover:brightness-110 disabled:cursor-default disabled:opacity-70"
            >
              <Download className="h-4 w-4" />
              {isInstalled ? "App já instalado" : "Instalar App Carol Sol"}
            </button>
            <p className="mt-4 text-xs leading-5 text-brown/55">
              Compatível com celulares Android, iPhone, tablets e computadores modernos.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white/55 px-6 py-16 md:py-20">
        <div className="container-cs">
          <div className="max-w-2xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-copper">
              Tudo conectado
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-brown md:text-5xl">
              Escolha o que você precisa agora.
            </h2>
            <p className="mt-4 text-sm leading-7 text-brown/70">
              A versão do app apresenta os serviços de forma mais direta, pensada para a rotina no celular.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ icon: Icon, eyebrow, title, text, label, href, tone }) => (
              <a
                key={title}
                href={href}
                className={`group flex min-h-72 flex-col rounded-[1.75rem] border border-copper/10 p-7 transition duration-300 hover:-translate-y-1 hover:border-copper/30 hover:shadow-xl ${tone}`}
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white/80 text-copper shadow-sm">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </span>
                  <ArrowRight className="h-5 w-5 text-brown/35 transition group-hover:translate-x-1 group-hover:text-copper" />
                </div>
                <p className="mt-7 text-[10px] font-medium uppercase tracking-[0.25em] text-copper">
                  {eyebrow}
                </p>
                <h3 className="mt-2 font-serif text-2xl leading-tight text-brown">{title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-brown/65">{text}</p>
                <span className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-brown">
                  {label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {showHelp ? (
        <div className="fixed inset-0 z-[100] grid place-items-end bg-ink/60 p-4 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
          <div className="relative w-full max-w-md rounded-[1.75rem] bg-cream p-7 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              aria-label="Fechar instruções"
              className="absolute right-5 top-5 rounded-full p-2 text-brown/60 hover:bg-brown/5"
            >
              <X className="h-5 w-5" />
            </button>
            <Share className="h-8 w-8 text-copper" strokeWidth={1.5} />
            <h2 id="install-help-title" className="mt-5 font-serif text-3xl text-brown">
              Adicione à tela inicial
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-brown/70">
              <p><strong className="text-brown">No iPhone ou iPad:</strong> toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p>
              <p><strong className="text-brown">No Android ou computador:</strong> abra o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.</p>
            </div>
            <button type="button" onClick={() => setShowHelp(false)} className="mt-6 w-full rounded-md bg-brown px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-white">
              Entendi
            </button>
          </div>
        </div>
      ) : null}
    </InstitutionalLayout>
  );
}
