export function Logo({ dark = false }: { dark?: boolean }) {
  const nameColor = dark ? "text-warm-white" : "text-brown";
  const subColor = dark ? "text-copper-light/80" : "text-copper";
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center">
        <span
          className="font-serif text-4xl italic leading-none text-copper-gradient"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          $
        </span>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-serif text-xl tracking-[0.15em] ${nameColor}`}>CAROL SOL</span>
        <span className={`mt-1 text-[8px] tracking-[0.25em] ${subColor}`}>
          LUXURY HAIR &amp; BEAUTY UNIVERSE
        </span>
      </div>
    </div>
  );
}
