import { Smartphone, ShoppingBag, Heart, MessageCircle } from "lucide-react";
import { Ornament } from "./Ornament";
import { possibilities } from "@/data/carol-sol";

const iconMap = {
  logo: () => (
    <span
      className="font-serif italic text-4xl text-copper-gradient"
      style={{ fontFamily: "var(--font-serif)" }}
    >
      $
    </span>
  ),
  smartphone: () => <Smartphone className="h-8 w-8 text-copper" strokeWidth={1.2} />,
  bag: () => <ShoppingBag className="h-8 w-8 text-copper" strokeWidth={1.2} />,
  heart: () => <Heart className="h-8 w-8 text-copper" strokeWidth={1.2} />,
  whatsapp: () => <MessageCircle className="h-8 w-8 text-copper" strokeWidth={1.2} />,
};

export function PossibilitiesSection() {
  return (
    <section className="bg-cream py-16 lg:py-20">
      <div className="container-cs">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl md:text-3xl tracking-[0.15em] text-brown">
            UM UNIVERSO DE POSSIBILIDADES
          </h2>
          <Ornament className="my-3" />
          <p className="text-[11px] tracking-[0.3em] text-brown/70">HOJE VOCÊ JÁ PODE ACESSAR:</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {possibilities.map((p) => {
            const Icon = iconMap[p.icon];
            return (
              <article
                key={p.title}
                className="flex flex-col rounded-lg border border-copper/25 bg-warm-white overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-30px_rgba(183,110,80,0.5)]"
              >
                <div className="flex flex-col items-center text-center px-4 pt-6 pb-4">
                  <Icon />
                  <h3 className="mt-3 font-serif text-[15px] tracking-[0.12em] text-brown whitespace-pre-line leading-tight">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[9px] tracking-[0.25em] text-copper whitespace-pre-line">
                    {p.subtitle}
                  </p>
                </div>
                <div className="px-4">
                  <div className="aspect-[4/3] overflow-hidden rounded-md">
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <ul className="flex-1 px-5 py-4 space-y-2">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-[11px] text-brown/85">
                      <Heart className="h-3 w-3 text-copper shrink-0" strokeWidth={1.5} />
                      {it}
                    </li>
                  ))}
                </ul>
                <div className="p-4 pt-0">
                  <a
                    href={p.cta.href}
                    className={`flex items-center justify-center gap-2 h-10 rounded-md text-[10px] tracking-[0.2em] text-warm-white transition hover:brightness-110 ${
                      p.cta.variant === "whatsapp" ? "bg-whatsapp" : "bg-copper-gradient"
                    }`}
                  >
                    {p.cta.variant === "whatsapp" && <MessageCircle className="h-4 w-4" />}
                    {p.cta.label}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
