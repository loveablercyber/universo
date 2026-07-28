import { Instagram, MessageCircle, Mail, MapPin, Calendar } from "lucide-react";
import { Logo } from "./Logo";
import { brand, footerLinks } from "@/data/carol-sol";
import { siteLinks } from "@/lib/site-links";

export function Footer() {
  return (
    <footer id="contato" className="bg-ink text-warm-white/85">
      <div className="container-cs py-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo dark />
          <p className="mt-6 text-[12px] leading-relaxed text-warm-white/70 max-w-xs">
            Beleza que transforma.
            <br />
            Confiança que empodera.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href={brand.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram Carol Sol Hair"
              className="grid h-9 w-9 place-items-center rounded-full border border-copper/40 text-copper-light hover:bg-copper/10 transition"
            >
              <Instagram className="h-4 w-4" strokeWidth={1.5} />
            </a>
            <a
              href={brand.whatsapp}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp Carol Sol"
              className="grid h-9 w-9 place-items-center rounded-full border border-copper/40 text-copper-light hover:bg-copper/10 transition"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-[11px] tracking-[0.25em] text-warm-white mb-5">ACESSE RÁPIDO</h4>
          <ul className="space-y-3 text-[12px]">
            {footerLinks.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="hover:text-copper-light transition">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] tracking-[0.25em] text-warm-white mb-5">CONTATO</h4>
          <ul className="space-y-4 text-[12px]">
            <li className="flex items-start gap-3">
              <MessageCircle className="h-4 w-4 text-copper mt-0.5 shrink-0" strokeWidth={1.5} />
              <a href={brand.whatsapp} target="_blank" rel="noreferrer">
                <div className="text-warm-white/60 text-[10px]">WhatsApp</div>
                {brand.phone}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-copper mt-0.5 shrink-0" strokeWidth={1.5} />
              <a href={`mailto:${brand.email}`}>
                <div className="text-warm-white/60 text-[10px]">E-mail</div>
                {brand.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-copper mt-0.5 shrink-0" strokeWidth={1.5} />
              <div>{brand.location}</div>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] tracking-[0.25em] text-warm-white mb-5">
            HORÁRIO DE ATENDIMENTO
          </h4>
          <ul className="space-y-2 text-[12px] text-warm-white/80">
            {brand.hours.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <a
            href={siteLinks.agenda}
            className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-md bg-copper-gradient text-warm-white text-[10px] tracking-[0.2em] hover:brightness-110 transition"
          >
            <Calendar className="h-4 w-4" /> AGENDAR ATENDIMENTO
          </a>
        </div>
      </div>

      <div className="border-t border-copper/20">
        <div className="container-cs py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-warm-white/60">
          <span>© 2026 Universo Carol Sol. Todos os direitos reservados.</span>
          <span>
            <a href="/politica-de-privacidade" className="hover:text-copper-light">
              Política de Privacidade
            </a>
            &nbsp;|&nbsp;
            <a href="/termos-de-uso" className="hover:text-copper-light">
              Termos de Uso
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
