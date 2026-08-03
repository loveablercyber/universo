import React from "react";
import {
  CmsPageContent,
  CmsHeroSection,
  CmsTextSection,
  CmsCardsSection,
  CmsGallerySection,
  CmsCtaSection,
} from "./cms.types";
import { Sparkles, ArrowRight } from "lucide-react";

export function CmsSectionRenderer({ content }: { content?: CmsPageContent }) {
  if (!content || !content.sections || content.sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-12">
      {content.sections.map((section, index) => {
        switch (section.type) {
          case "hero":
            return <HeroWidget key={index} data={section as CmsHeroSection} />;
          case "text":
            return <TextWidget key={index} data={section as CmsTextSection} />;
          case "cards":
            return <CardsWidget key={index} data={section as CmsCardsSection} />;
          case "gallery":
            return <GalleryWidget key={index} data={section as CmsGallerySection} />;
          case "cta":
            return <CtaWidget key={index} data={section as CmsCtaSection} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function HeroWidget({ data }: { data: CmsHeroSection }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-copper/20 bg-cream-soft p-8 md:p-12 shadow-sm">
      {data.eyebrow && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-copper">
          {data.eyebrow}
        </p>
      )}
      {data.imageUrl && (
        <img
          src={data.imageUrl}
          alt={data.title}
          className="mt-6 max-h-[32rem] w-full rounded-2xl object-cover"
        />
      )}
      <h2 className="mt-3 font-serif text-3xl md:text-5xl leading-tight text-brown">
        {data.title}
      </h2>
      {data.subtitle && (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brown/75">{data.subtitle}</p>
      )}
      {data.buttonLabel && data.buttonLink && (
        <a
          href={data.buttonLink}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-copper-gradient px-6 py-3 text-xs font-semibold tracking-wider text-white transition hover:opacity-95"
        >
          {data.buttonLabel} <ArrowRight size={14} />
        </a>
      )}
    </section>
  );
}

function GalleryWidget({ data }: { data: CmsGallerySection }) {
  return (
    <section className="space-y-5">
      {data.title && <h3 className="font-serif text-3xl text-brown">{data.title}</h3>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.images.map((image, index) => (
          <figure key={`${image.url}-${index}`} className="overflow-hidden rounded-2xl bg-white">
            <img
              src={image.url}
              alt={image.alt || image.caption || ""}
              className="aspect-[4/3] w-full object-cover"
            />
            {image.caption && (
              <figcaption className="p-3 text-xs text-brown/70">{image.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

function CtaWidget({ data }: { data: CmsCtaSection }) {
  return (
    <section className="rounded-[2rem] bg-ink p-8 text-white md:p-12">
      <h3 className="font-serif text-3xl md:text-4xl">{data.title}</h3>
      {data.subtitle && <p className="mt-3 max-w-2xl text-sm text-white/70">{data.subtitle}</p>}
      <a
        href={data.buttonLink}
        className="mt-6 inline-flex rounded-xl bg-copper px-6 py-3 text-xs font-semibold tracking-wider"
      >
        {data.buttonLabel}
      </a>
    </section>
  );
}

function TextWidget({ data }: { data: CmsTextSection }) {
  return (
    <section className="rounded-[1.5rem] bg-white p-8 border border-copper/10">
      {data.eyebrow && (
        <p className="text-[10px] uppercase tracking-widest text-copper font-medium">
          {data.eyebrow}
        </p>
      )}
      {data.title && (
        <h3 className="mt-2 font-serif text-2xl md:text-3xl text-brown">{data.title}</h3>
      )}
      <div className="mt-4 text-sm leading-7 text-brown/80 whitespace-pre-line">{data.content}</div>
    </section>
  );
}

function CardsWidget({ data }: { data: CmsCardsSection }) {
  return (
    <section className="space-y-6">
      {data.title && (
        <div>
          {data.eyebrow && (
            <p className="text-[10px] uppercase tracking-widest text-copper font-medium">
              {data.eyebrow}
            </p>
          )}
          <h3 className="font-serif text-2xl md:text-4xl text-brown">{data.title}</h3>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-3">
        {data.items.map((card, i) => (
          <article
            key={i}
            className="rounded-2xl border border-copper/15 bg-white p-6 transition hover:shadow-md"
          >
            <Sparkles className="h-6 w-6 text-copper" />
            <h4 className="mt-4 font-serif text-xl text-brown">{card.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-brown/70">{card.description}</p>
            {card.link && (
              <a
                href={card.link}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-copper hover:underline"
              >
                Saber mais <ArrowRight size={12} />
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
