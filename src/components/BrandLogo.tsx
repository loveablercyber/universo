import { useEffect, useState } from "react";

const FALLBACK_LOGO = "/images/sol-hair-closet-logo-transparent.png";

let cachedLogoUrl = "";
let logoRequest: Promise<string> | null = null;

function loadBrandLogo() {
  if (cachedLogoUrl) return Promise.resolve(cachedLogoUrl);
  if (logoRequest) return logoRequest;

  logoRequest = fetch("/api/store?action=store_settings")
    .then((response) => response.json())
    .then((payload) => {
      const value = payload?.settings?.find(
        (setting: { key?: string }) => setting.key === "brand_logo_url",
      )?.value;
      cachedLogoUrl = typeof value === "string" && value.trim() ? value.trim() : FALLBACK_LOGO;
      return cachedLogoUrl;
    })
    .catch(() => FALLBACK_LOGO);

  return logoRequest;
}

export function BrandLogo({
  className = "h-12 w-auto max-w-52 object-contain",
  alt = "Universo Carol Sol",
}: {
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState(cachedLogoUrl || FALLBACK_LOGO);

  useEffect(() => {
    let active = true;
    void loadBrandLogo().then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, []);

  return <img src={src} alt={alt} className={className} />;
}
