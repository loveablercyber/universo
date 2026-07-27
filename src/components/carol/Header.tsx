import { useState } from "react";
import { Calendar, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { nav } from "@/data/carol-sol";
import { siteLinks } from "@/lib/site-links";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-ink text-warm-white">
      <div className="container-cs flex h-[72px] items-center justify-between gap-4">
        <a href="#inicio" className="shrink-0">
          <Logo dark />
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {nav.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className={`relative text-[11px] tracking-[0.2em] font-medium transition-colors hover:text-copper-light ${
                n.active ? "text-warm-white" : "text-warm-white/85"
              }`}
            >
              {n.label}
              {n.active && (
                <span className="absolute -bottom-2 left-1/2 h-px w-6 -translate-x-1/2 bg-copper" />
              )}
            </a>
          ))}
        </nav>

        <a
          href={siteLinks.agenda}
          className="hidden md:inline-flex items-center gap-2 h-[42px] px-5 rounded-md bg-copper-gradient text-warm-white text-[11px] tracking-[0.18em] font-medium shadow-[0_6px_20px_-8px_rgba(183,110,80,0.7)] hover:brightness-110 transition"
        >
          <Calendar className="h-4 w-4" strokeWidth={1.5} />
          AGENDAR ATENDIMENTO
        </a>

        <button
          className="lg:hidden text-warm-white p-2"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink text-warm-white lg:hidden">
          <div className="flex items-center justify-between p-5 border-b border-copper/20">
            <Logo dark />
            <button onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-col p-8 gap-6">
            {nav.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className="text-sm tracking-[0.2em]"
              >
                {n.label}
              </a>
            ))}
            <a
              href={siteLinks.agenda}
              className="mt-4 inline-flex items-center justify-center gap-2 h-12 rounded-md bg-copper-gradient text-warm-white text-xs tracking-[0.18em]"
            >
              <Calendar className="h-4 w-4" /> AGENDAR ATENDIMENTO
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
