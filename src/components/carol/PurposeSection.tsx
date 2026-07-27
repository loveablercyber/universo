import { Sparkles, Phone, Heart, Crown } from "lucide-react";
import { benefits } from "@/data/carol-sol";

const icons = {
  sparkle: Sparkles,
  phone: Phone,
  heart: Heart,
  crown: Crown,
  "heart-connect": Heart,
};

export function PurposeSection() {
  return (
    <section id="proposito" className="bg-cream py-16">
      <div className="container-cs grid lg:grid-cols-[1fr_2fr] gap-12 items-center">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight text-brown">
            MAIS DO QUE
            <br />
            UM SALÃO.
          </h2>
          <p
            className="mt-2 text-3xl text-copper italic"
            style={{ fontFamily: "var(--font-script)" }}
          >
            Um propósito.
          </p>
          <p className="mt-5 text-[12px] leading-relaxed text-brown/80 max-w-sm">
            O Universo Carol Sol reúne beleza,
            <br />
            tecnologia e impacto social para cuidar
            <br />
            da sua autoestima em cada detalhe.
          </p>
          <a
            href="#proposito"
            className="mt-6 inline-flex h-10 items-center px-5 rounded-md border border-copper/60 text-[10px] tracking-[0.2em] text-brown hover:bg-copper/5 transition"
          >
            CONHEÇA NOSSA HISTÓRIA
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-copper/20">
          {benefits.map((b) => {
            const Icon = icons[b.icon as keyof typeof icons];
            return (
              <div key={b.title} className="px-4 text-center flex flex-col items-center">
                <Icon className="h-8 w-8 text-copper" strokeWidth={1.2} />
                <h3 className="mt-3 text-[10px] tracking-[0.2em] text-brown whitespace-pre-line font-medium leading-tight">
                  {b.title}
                </h3>
                <p className="mt-2 text-[10px] text-brown/70 leading-relaxed">{b.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
