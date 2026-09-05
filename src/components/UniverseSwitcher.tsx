const destinations = [
  { label: "Página principal", to: "/" },
  { label: "Projeto Elo", to: "/elo" },
  { label: "Invisible Academy", to: "/academy" },
  { label: "Sol Hair Closet", to: "/store" },
  { label: "Minha conta", to: "/conta" },
] as const;

export function UniverseSwitcher() {
  return (
    <nav
      aria-label="Navegação entre os modelos"
      className="relative z-[70] w-full bg-[#160b04] text-white"
    >
      <div className="mx-auto flex min-h-10 max-w-[1440px] items-center gap-1 overflow-x-auto px-4 py-1.5 sm:justify-center">
        {destinations.map((item) => (
          <a
            key={item.to}
            href={item.to}
            className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
