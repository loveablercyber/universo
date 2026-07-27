import { Calendar, ShoppingBag } from "lucide-react";
import { Ornament } from "./Ornament";
import { siteLinks } from "@/lib/site-links";

export function HeroSection() {
  return (
    <section id="inicio" className="relative bg-cream-soft">
      <div className="grid lg:grid-cols-[47fr_53fr] min-h-[440px]">
        <div className="relative z-10 flex items-center justify-center px-6 py-12 lg:py-16 bg-cream-soft">
          <div className="max-w-md text-center lg:text-left fade-up">
            <p className="text-[10px] tracking-[0.35em] text-brown/80 font-medium">
              BEM-VINDA AO UNIVERSO
            </p>
            <h1 className="mt-3 font-serif text-5xl md:text-6xl lg:text-[76px] leading-none tracking-wide text-copper-gradient">
              CAROL SOL
            </h1>
            <p className="mt-3 text-[10px] tracking-[0.3em] text-brown/80">
              ✦ &nbsp;LUXURY HAIR &amp; BEAUTY UNIVERSE&nbsp; ✦
            </p>
            <p className="mt-6 text-[13px] leading-relaxed text-brown/90 max-w-sm mx-auto lg:mx-0">
              Transformamos beleza em autoestima
              <br />
              através de atendimento premium, tecnologia
              <br />e impacto social.
            </p>
            <p
              className="mt-5 text-3xl text-copper italic"
              style={{ fontFamily: "var(--font-script)" }}
            >
              Tudo conectado. Tudo por você.
            </p>
            <Ornament className="mt-3 mb-7 justify-center lg:justify-start" />
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a
                href={siteLinks.agenda}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-copper-gradient text-warm-white text-[11px] tracking-[0.18em] font-medium shadow-[0_8px_24px_-10px_rgba(183,110,80,0.7)] hover:brightness-110 transition"
              >
                <Calendar className="h-4 w-4" strokeWidth={1.5} />
                AGENDAR ATENDIMENTO
              </a>
              <a
                href={siteLinks.store}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md border border-copper/60 text-brown text-[11px] tracking-[0.18em] font-medium hover:bg-copper/5 transition"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                CONHECER A LOJA
              </a>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block w-32 bg-gradient-to-r from-transparent to-cream-soft" />
        </div>

        <div className="relative min-h-[300px] lg:min-h-0">
          <img
            src="/images/hero-carol-sol.jpg"
            alt="Modelo Carol Sol com cabelos longos ondulados em salão premium"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-cream-soft to-transparent hidden lg:block" />
        </div>
      </div>
    </section>
  );
}
