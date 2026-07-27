import { Calendar, ShoppingBag, MessageCircle } from "lucide-react";
import { brand } from "@/data/carol-sol";
import { siteLinks } from "@/lib/site-links";

export function FinalCTA() {
  return (
    <section className="bg-cream py-14">
      <div className="container-cs grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl text-brown leading-tight">
            SUA TRANSFORMAÇÃO
            <br />
            COMEÇA AQUI.
          </h2>
          <p className="mt-4 text-[12px] text-brown/80 leading-relaxed max-w-md">
            Agende seu atendimento, visite nossa loja
            <br />
            ou fale com nossa equipe.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 lg:justify-end">
          <a
            href={siteLinks.agenda}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-copper-gradient text-warm-white text-[10px] tracking-[0.2em] hover:brightness-110 transition"
          >
            <Calendar className="h-4 w-4" /> AGENDAR ATENDIMENTO
          </a>
          <a
            href={siteLinks.store}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md border border-copper/60 text-brown text-[10px] tracking-[0.2em] hover:bg-copper/5 transition"
          >
            <ShoppingBag className="h-4 w-4" /> LOJA ONLINE
          </a>
          <a
            href={brand.whatsapp}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-whatsapp text-warm-white text-[10px] tracking-[0.2em] hover:brightness-110 transition"
          >
            <MessageCircle className="h-4 w-4" /> FALAR NO WHATSAPP
          </a>
        </div>
      </div>
    </section>
  );
}
