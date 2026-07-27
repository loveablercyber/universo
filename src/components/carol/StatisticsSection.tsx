import { Gem, Heart, Map, Infinity as Inf, Smartphone } from "lucide-react";
import { Ornament } from "./Ornament";
import { stats } from "@/data/carol-sol";

const icons = { diamond: Gem, heart: Heart, map: Map, infinity: Inf, smartphone: Smartphone };

export function StatisticsSection() {
  return (
    <section className="relative bg-ink text-warm-white py-16 overflow-hidden">
      <div
        className="absolute inset-0 opacity-25 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/numeros-background.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink" />
      <div className="container-cs relative">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl md:text-3xl tracking-[0.15em] text-warm-white">
            NÚMEROS QUE NOS INSPIRAM
          </h2>
          <Ornament className="mt-3" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-copper/25">
          {stats.map((s) => {
            const Icon = icons[s.icon];
            return (
              <div key={s.label} className="px-4 text-center flex flex-col items-center">
                <Icon className="h-8 w-8 text-copper-light" strokeWidth={1.2} />
                <div className="mt-4 font-serif text-2xl md:text-[26px] tracking-wide text-copper-light">
                  {s.value}
                </div>
                <p className="mt-2 text-[10px] tracking-[0.2em] text-warm-white/80 whitespace-pre-line leading-relaxed">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
