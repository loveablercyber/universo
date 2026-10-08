import { BrandLogo } from "@/components/BrandLogo";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={dark ? "inline-flex rounded-sm bg-[#FAF7F2] px-2 py-1" : "inline-flex"}>
      <BrandLogo className="h-11 w-auto max-w-48 object-contain md:h-12 md:max-w-56" />
    </span>
  );
}
