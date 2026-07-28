import type { ReactNode } from "react";
import { UniverseSwitcher } from "@/components/UniverseSwitcher";
import { Header } from "@/components/carol/Header";
import { Footer } from "@/components/carol/Footer";

type InstitutionalLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function InstitutionalLayout({
  eyebrow,
  title,
  description,
  children,
}: InstitutionalLayoutProps) {
  return (
    <div className="min-h-screen bg-cream text-brown">
      <UniverseSwitcher />
      <Header />
      <main>
        <section className="border-b border-copper/15 bg-cream-soft px-6 py-16 text-center md:py-24">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-copper">
            {eyebrow}
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl font-serif text-4xl leading-tight md:text-6xl">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-brown/75">{description}</p>
        </section>
        {children}
      </main>
      <Footer />
    </div>
  );
}

export function InstitutionalSection({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-6 py-16 md:py-20 ${className}`}>
      <div className="container-cs">
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-copper">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-3 max-w-3xl font-serif text-3xl leading-tight md:text-5xl">{title}</h2>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
