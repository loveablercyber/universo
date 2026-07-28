import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UniverseSwitcher } from "@/components/UniverseSwitcher";
import {
  Sparkles,
  Award,
  Users,
  Infinity as InfinityIcon,
  ArrowRight,
  MessageCircle,
  GraduationCap,
  HandHeart,
  UserRound,
  PlayCircle,
  UsersRound,
  Gem,
  Heart,
  Globe,
  Star,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
  Menu,
  X,
} from "lucide-react";
import { InvisibleLogo } from "../components/InvisibleLogo";
import {
  navigation,
  heroFeatures,
  learningBenefits,
  courses,
  stats,
  testimonials,
  ctaBenefits,
  footerNav,
  contactInfo,
  universeBrands,
} from "../data/invisible-site";

export const Route = createFileRoute("/invisible-academy")({
  head: () => ({
    meta: [
      { title: "Invisible Academy | Universo Carol Sol" },
      {
        name: "description",
        content:
          "Formação profissional em mega hair, técnicas, gestão e desenvolvimento de carreira.",
      },
      { property: "og:title", content: "Invisible Academy | Universo Carol Sol" },
      {
        property: "og:description",
        content: "Educação, técnica e transformação para profissionais da beleza.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/invisible-academy" }],
  }),
  component: Index,
});

const heroIconMap = { sparkles: Sparkles, award: Award, users: Users, infinity: InfinityIcon };
const benefitIconMap = {
  "heart-hand": HandHeart,
  teacher: UserRound,
  play: PlayCircle,
  community: UsersRound,
  gem: Gem,
};
const statIconMap = { cap: GraduationCap, heart: Heart, globe: Globe, star: Sparkles };
const ctaIconMap = { sparkles: Sparkles, clock: Clock, heart: Heart, infinity: InfinityIcon };

function Diamond() {
  return <span className="text-[#C97945] mx-3">✦</span>;
}

function TopUniverseBar() {
  return (
    <div className="bg-[#F5ECE5] border-b border-[rgba(201,121,69,0.15)]">
      <div className="container-max flex items-center justify-center gap-4 py-2.5">
        <div className="hidden sm:block h-px w-24 bg-[rgba(201,121,69,0.35)]" />
        <div className="text-[10px] sm:text-[11px] tracking-[0.42em] text-[#C97945] font-medium">
          UNIVERSO <span className="mx-2">✦</span> CAROL SOL
        </div>
        <div className="hidden sm:block h-px w-24 bg-[rgba(201,121,69,0.35)]" />
      </div>
    </div>
  );
}

function MainHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-[#FFFDFC] border-b border-[rgba(201,121,69,0.12)] sticky top-0 z-40">
      <div className="container-max flex items-center justify-between py-4">
        <a href="#inicio" className="shrink-0">
          <InvisibleLogo />
        </a>
        <nav className="hidden lg:flex items-center gap-7">
          {navigation.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className={`text-[11px] tracking-[0.18em] font-medium transition-colors hover:text-[#C97945] relative ${n.active ? "text-[#C97945]" : "text-[#4B2C1E]"}`}
            >
              {n.label}
              {n.active && (
                <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 h-[1.5px] w-4 bg-[#C97945] rounded-full" />
              )}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#area-aluno"
            className="btn-copper btn-copper-hover text-[10px] px-5 py-3 hidden sm:inline-flex"
          >
            <UserRound size={14} strokeWidth={1.8} />
            ÁREA DO ALUNO
          </a>
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden text-[#4B2C1E]"
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden bg-[#FFFDFC] border-t border-[rgba(201,121,69,0.12)]">
          <div className="container-max py-4 flex flex-col gap-3">
            {navigation.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className="text-[12px] tracking-[0.2em] text-[#4B2C1E] py-1"
              >
                {n.label}
              </a>
            ))}
            <a
              href="#area-aluno"
              className="btn-copper btn-copper-hover text-[10px] mt-2 sm:hidden"
            >
              <UserRound size={14} /> ÁREA DO ALUNO
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section id="inicio" className="bg-[#FBF6F1]">
      <div className="container-max grid lg:grid-cols-2 gap-10 items-center py-10 lg:py-14">
        <div className="order-2 lg:order-1">
          <span className="inline-block bg-[#F5ECE5] text-[#6B4A3A] text-[10px] tracking-[0.24em] font-semibold px-4 py-2 rounded-md">
            FORMAÇÃO QUE TRANSFORMA
          </span>
          <h1 className="font-display mt-6 text-[42px] lg:text-[56px] leading-[1.05] text-[#4B2C1E] tracking-tight">
            TORNE-SE REFERÊNCIA
            <br />
            EM MEGA HAIR
            <br />
            <span className="font-script text-[#C97945] text-[52px] lg:text-[68px] leading-none italic block mt-2">
              e transforme vidas.
            </span>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-[#6F5B52] max-w-md">
            Ensino de alto padrão, técnicas exclusivas e suporte completo para você se tornar uma
            especialista de sucesso.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#cursos" className="btn-copper btn-copper-hover">
              CONHEÇA OS CURSOS <ArrowRight size={14} />
            </a>
            <a href="#contato" className="btn-ghost">
              FALAR COM NOSSA EQUIPE <MessageCircle size={14} className="text-[#C97945]" />
            </a>
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-5 max-w-lg">
            {heroFeatures.map((f) => {
              const Ico = heroIconMap[f.icon];
              return (
                <div key={f.title} className="flex items-center gap-2.5">
                  <Ico size={22} strokeWidth={1.3} className="text-[#C97945] shrink-0" />
                  <div className="text-[11px] leading-tight text-[#4B2C1E]">
                    <div className="font-semibold">{f.title}</div>
                    <div className="text-[#6F5B52]">{f.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="order-1 lg:order-2 relative">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3.4] shadow-[0_30px_60px_-30px_rgba(75,44,30,0.35)]">
            <img
              src="/images/hero-invisible-academy.jpg"
              alt="Especialista Invisible Academy segurando aplique de mega hair"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 lg:bottom-6 lg:-right-4 lg:left-auto bg-[#FFFDFC] rounded-2xl px-5 py-4 shadow-[0_20px_40px_-20px_rgba(75,44,30,0.35)] border border-[rgba(201,121,69,0.15)] max-w-[220px]">
            <div className="flex items-start gap-3">
              <GraduationCap size={26} strokeWidth={1.4} className="text-[#C97945] mt-0.5" />
              <div>
                <div className="text-[11px] tracking-[0.22em] font-semibold text-[#C97945]">
                  CERTIFICADO
                </div>
                <div className="text-[11px] tracking-[0.22em] font-semibold text-[#C97945] -mt-0.5">
                  INCLUSO
                </div>
                <div className="mt-2 text-[10.5px] text-[#6F5B52] leading-snug">
                  Reconhecido pelo
                  <br />
                  Universo Carol Sol
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LearningBenefits() {
  return (
    <section className="bg-[#FBF6F1] pb-10">
      <div className="container-max">
        <h2 className="text-center text-[12px] sm:text-[13px] tracking-[0.28em] font-semibold text-[#C97945] mb-6">
          APRENDIZADO QUE GERA CONFIANÇA, LIBERDADE E RESULTADOS.
        </h2>
        <div className="bg-[#F5ECE5]/60 border border-[rgba(201,121,69,0.18)] rounded-3xl px-6 py-8 lg:px-10 lg:py-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:divide-x lg:divide-[rgba(201,121,69,0.2)]">
            {learningBenefits.map((b, i) => {
              const Ico = benefitIconMap[b.icon];
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center text-center ${i > 0 ? "lg:pl-6" : ""}`}
                >
                  <Ico size={30} strokeWidth={1.2} className="text-[#C97945]" />
                  <div className="mt-4 text-[11px] tracking-[0.2em] font-semibold text-[#C97945]">
                    {b.title}
                  </div>
                  <p className="mt-2 text-[11.5px] text-[#6F5B52] leading-relaxed whitespace-pre-line">
                    {b.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function CoursesSection() {
  return (
    <section id="cursos" className="bg-[#FBF6F1] py-14">
      <div className="container-max">
        <div className="text-center">
          <div className="text-[12px] tracking-[0.32em] text-[#C97945] font-semibold">
            NOSSOS CURSOS
          </div>
          <h2 className="font-display text-[32px] lg:text-[42px] text-[#4B2C1E] mt-3 tracking-tight">
            ESCOLHA O CAMINHO DA SUA TRANSFORMAÇÃO
          </h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="h-px w-10 bg-[rgba(201,121,69,0.4)]" />
            <Diamond />
            <span className="h-px w-10 bg-[rgba(201,121,69,0.4)]" />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {courses.map((c) => (
            <article
              key={c.subtitle}
              className="bg-[#FFFDFC] rounded-2xl border border-[rgba(201,121,69,0.15)] overflow-hidden flex flex-col hover:shadow-[0_20px_40px_-24px_rgba(75,44,30,0.35)] hover:-translate-y-0.5 transition"
            >
              <div className="relative aspect-[4/3]">
                <img
                  src={c.image}
                  alt={`${c.title} ${c.subtitle}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span className="absolute top-3 left-3 bg-[#C97945] text-white text-[9px] tracking-[0.18em] font-semibold px-2.5 py-1 rounded-md">
                  {c.badge}
                </span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-center">
                  <div className="text-[13px] tracking-[0.2em] text-[#6F5B52]">{c.title}</div>
                  <div className="text-[13px] tracking-[0.2em] font-semibold text-[#4B2C1E]">
                    {c.subtitle}
                  </div>
                </h3>
                <p className="text-center text-[11.5px] text-[#6F5B52] leading-relaxed mt-3 whitespace-pre-line">
                  {c.description}
                </p>
                <div className="flex items-center justify-center gap-4 mt-4 text-[10.5px] text-[#6F5B52]">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound size={12} className="text-[#C97945]" />
                    {c.level}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Award size={12} className="text-[#C97945]" />
                    {c.cert}
                  </span>
                </div>
                <div className="mt-5 flex justify-center">
                  <a href="#" className="btn-copper btn-copper-hover text-[10px] px-5 py-2.5">
                    SAIBA MAIS <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <a href="#" className="btn-ghost">
            VER TODOS OS CURSOS <ArrowRight size={13} className="text-[#C97945]" />
          </a>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="bg-[#FBF6F1] pb-14">
      <div className="container-max">
        <div className="bg-[#F5ECE5]/70 border border-[rgba(201,121,69,0.18)] rounded-3xl px-6 py-8 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:divide-x lg:divide-[rgba(201,121,69,0.2)]">
            {stats.map((s, i) => {
              const Ico = statIconMap[s.icon];
              return (
                <div
                  key={i}
                  className={`flex items-center justify-center gap-4 ${i > 0 ? "lg:pl-6" : ""}`}
                >
                  <Ico size={34} strokeWidth={1.2} className="text-[#C97945] shrink-0" />
                  <div>
                    <div className="font-display text-[24px] lg:text-[28px] text-[#4B2C1E] leading-none">
                      {s.value}
                    </div>
                    <div className="text-[10px] tracking-[0.22em] text-[#6F5B52] mt-1.5 font-medium">
                      {s.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const [idx, setIdx] = useState(0);
  const total = testimonials.length;
  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  return (
    <section id="depoimentos" className="bg-[#FBF6F1] pb-14">
      <div className="container-max">
        <div className="text-center">
          <h2 className="text-[13px] tracking-[0.32em] font-semibold text-[#C97945]">
            ALUNAS QUE SE TORNARAM REFERÊNCIAS
          </h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="h-px w-10 bg-[rgba(201,121,69,0.4)]" />
            <Diamond />
            <span className="h-px w-10 bg-[rgba(201,121,69,0.4)]" />
          </div>
        </div>

        <div className="relative mt-10">
          <button
            onClick={prev}
            aria-label="Anterior"
            className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[#FFFDFC] border border-[rgba(201,121,69,0.2)] items-center justify-center shadow-md hover:bg-[#F5ECE5]"
          >
            <ChevronLeft size={18} className="text-[#4B2C1E]" />
          </button>
          <button
            onClick={next}
            aria-label="Próximo"
            className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[#FFFDFC] border border-[rgba(201,121,69,0.2)] items-center justify-center shadow-md hover:bg-[#F5ECE5]"
          >
            <ChevronRight size={18} className="text-[#4B2C1E]" />
          </button>

          <div className="hidden md:grid grid-cols-3 gap-5 px-4">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} t={t} dim={i !== idx} />
            ))}
          </div>
          <div className="md:hidden">
            <TestimonialCard t={testimonials[idx]} />
            <div className="flex justify-center gap-3 mt-5">
              <button
                onClick={prev}
                aria-label="Anterior"
                className="w-10 h-10 rounded-full bg-[#FFFDFC] border border-[rgba(201,121,69,0.2)] flex items-center justify-center"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={next}
                aria-label="Próximo"
                className="w-10 h-10 rounded-full bg-[#FFFDFC] border border-[rgba(201,121,69,0.2)] flex items-center justify-center"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ t, dim = false }: { t: (typeof testimonials)[number]; dim?: boolean }) {
  return (
    <div
      className={`bg-[#FFFDFC] border border-[rgba(201,121,69,0.15)] rounded-2xl p-5 flex items-center gap-4 transition-opacity ${dim ? "opacity-95" : ""}`}
    >
      <img
        src={t.photo}
        alt={t.name}
        className="w-16 h-16 rounded-full object-cover shrink-0"
        loading="lazy"
      />
      <div>
        <p className="text-[12px] text-[#6F5B52] leading-relaxed italic">{t.text}</p>
        <div className="mt-3">
          <div className="text-[12px] font-semibold text-[#4B2C1E]">{t.name}</div>
          <div className="text-[10.5px] text-[#6F5B52]">{t.city}</div>
        </div>
      </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <section className="bg-[#FBF6F1] pb-14">
      <div className="container-max">
        <div className="bg-[#F5ECE5]/70 border border-[rgba(201,121,69,0.18)] rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-6 items-center p-4 md:p-6">
          <div className="rounded-2xl overflow-hidden aspect-[4/3] md:h-full">
            <img
              src="/images/cta-invisible-academy.jpg"
              alt="Especialista Invisible Academy"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="px-2">
            <h3 className="font-display text-[22px] lg:text-[26px] text-[#4B2C1E] leading-tight">
              SUA CARREIRA PODE CHEGAR
              <br />
              AONDE VOCÊ SONHA.
            </h3>
            <p className="font-script text-[#C97945] text-[26px] lg:text-[30px] leading-none mt-1">
              O primeiro passo é aqui.
            </p>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ctaBenefits.map((b, i) => {
                const Ico = ctaIconMap[b.icon];
                return (
                  <div key={i} className="flex flex-col items-center text-center">
                    <Ico size={22} strokeWidth={1.3} className="text-[#C97945]" />
                    <div className="mt-2 text-[10.5px] text-[#6F5B52] whitespace-pre-line leading-tight">
                      {b.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3 px-2">
            <a href="#cursos" className="btn-copper btn-copper-hover">
              QUERO COMEÇAR AGORA <ArrowRight size={14} />
            </a>
            <a
              href="#contato"
              className="text-[11px] text-[#6B4A3A] inline-flex items-center gap-2 hover:text-[#C97945]"
            >
              <MessageCircle size={14} className="text-[#C97945]" />
              Fale com nossa equipe
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      id="contato"
      className="text-[#F5ECE5]"
      style={{ background: "linear-gradient(135deg, #2B1309 0%, #5A2D17 100%)" }}
    >
      <div className="container-max py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <InvisibleLogo light />
          </div>
          <div>
            <h4 className="text-[12px] tracking-[0.28em] font-semibold text-[#F5ECE5] mb-4">
              NAVEGAÇÃO
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {footerNav.flat().map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-[12px] text-[#E0A37F] hover:text-white transition"
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[12px] tracking-[0.28em] font-semibold text-[#F5ECE5] mb-4">
              CONTATO
            </h4>
            <ul className="space-y-3 text-[12px] text-[#E0A37F]">
              <li className="flex items-center gap-2.5">
                <Phone size={14} className="text-[#C97945]" />
                {contactInfo.whatsapp}
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={14} className="text-[#C97945]" />
                {contactInfo.email}
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin size={14} className="text-[#C97945]" />
                {contactInfo.location}
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] tracking-[0.28em] font-semibold text-[#F5ECE5] mb-4">
              REDES SOCIAIS
            </h4>
            <div className="flex gap-3">
              {[Instagram, Facebook, Youtube].map((Ico, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social"
                  className="w-10 h-10 rounded-full border border-[rgba(201,121,69,0.4)] flex items-center justify-center text-[#E0A37F] hover:bg-[#C97945] hover:text-white hover:border-transparent transition"
                >
                  <Ico size={16} />
                </a>
              ))}
              <a
                href="#"
                aria-label="TikTok"
                className="w-10 h-10 rounded-full border border-[rgba(201,121,69,0.4)] flex items-center justify-center text-[#E0A37F] hover:bg-[#C97945] hover:text-white hover:border-transparent transition text-[13px] font-bold"
              >
                ♪
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function BottomUniverseBar() {
  return (
    <div className="bg-[#F5ECE5] border-t border-[rgba(201,121,69,0.15)]">
      <div className="container-max py-4">
        <div className="text-center text-[10.5px] tracking-[0.42em] text-[#C97945] font-semibold">
          UNIVERSO <span className="mx-2">✦</span> CAROL SOL
        </div>
        <div className="mt-3 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[9.5px] tracking-[0.28em] text-[#6B4A3A] font-medium">
          {universeBrands.map((b, i) => (
            <span key={b} className="inline-flex items-center gap-4">
              {b}
              {i < universeBrands.length - 1 && <span className="text-[#C97945]">✦</span>}
            </span>
          ))}
        </div>
        <div className="mt-2 text-center text-[10px] text-[#6F5B52]">
          Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}

function Index() {
  return (
    <div className="theme-invisible min-h-screen bg-[#FBF6F1]">
      <UniverseSwitcher />
      <TopUniverseBar />
      <MainHeader />
      <main>
        <HeroSection />
        <LearningBenefits />
        <CoursesSection />
        <StatsSection />
        <TestimonialsSection />
        <FinalCTA />
      </main>
      <Footer />
      <BottomUniverseBar />
    </div>
  );
}
