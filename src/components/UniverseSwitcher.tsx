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
      className="relative z-30 w-full bg-[#4B3628] text-white"
    >
      <div className="scrollbar-none mx-auto flex min-h-9 max-w-[1440px] items-center gap-1 overflow-x-auto px-3 py-1 sm:justify-center">
        {destinations.map((item) => (
          <a
            key={item.to}
            href={item.to}
            className="shrink-0 whitespace-nowrap px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/80 transition hover:bg-white/10 hover:text-white sm:text-[10px]"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
