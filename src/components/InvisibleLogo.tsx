export function InvisibleLogo({ light = false }: { light?: boolean }) {
  const color = light ? "#F5ECE5" : "#C97945";
  const sub = light ? "#E0A37F" : "#6B4A3A";
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <svg
        width="42"
        height="46"
        viewBox="0 0 42 46"
        fill="none"
        aria-hidden="true"
        className="h-10 w-9 shrink-0 sm:h-[46px] sm:w-[42px]"
      >
        <path
          d="M21 4 C22 8 24 10 27 11 C24 12 22 14 21 18 C20 14 18 12 15 11 C18 10 20 8 21 4Z"
          fill={color}
        />
        <path
          d="M6 20 C6 18 8 17 10 17 L20 17 L20 40 L10 40 C8 40 6 39 6 37 Z"
          stroke={color}
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M36 20 C36 18 34 17 32 17 L21 17 L21 40 L32 40 C34 40 36 39 36 37 Z"
          stroke={color}
          strokeWidth="1.2"
          fill="none"
        />
        <line x1="21" y1="17" x2="21" y2="40" stroke={color} strokeWidth="1" />
      </svg>
      <div className="min-w-0 leading-none">
        <div
          className="font-display text-[19px] tracking-[0.16em] sm:text-[22px] sm:tracking-[0.22em]"
          style={{ color }}
        >
          INVISIBLE
        </div>
        <div
          className="font-display mt-0.5 text-[11px] tracking-[0.42em] sm:text-[13px] sm:tracking-[0.52em]"
          style={{ color }}
        >
          ACADEMY
        </div>
        <div
          className="mt-1.5 hidden text-[7.5px] font-medium tracking-[0.28em] sm:block"
          style={{ color: sub }}
        >
          FORMAÇÃO EM MEGA HAIR DE ALTO PADRÃO
        </div>
      </div>
    </div>
  );
}
