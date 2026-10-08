import { BrandLogo } from "@/components/BrandLogo";

export function Logo({ dark: _dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex">
      <BrandLogo className="h-11 w-auto max-w-48 object-contain md:h-12 md:max-w-56" />
    </span>
  );
}
