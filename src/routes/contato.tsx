import { createFileRoute } from "@tanstack/react-router";
import { Clock, Instagram, Mail, MapPin, MessageCircle } from "lucide-react";
import { InstitutionalLayout, InstitutionalSection } from "@/components/carol/InstitutionalLayout";
import { brand } from "@/data/carol-sol";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato | Universo Carol Sol" },
      {
        name: "description",
        content: "Fale com a equipe Carol Sol por WhatsApp, Instagram ou e-mail.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/contato" }],
  }),
  component: ContatoPage,
});

const channels = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    text: brand.phone,
    href: brand.whatsapp,
    action: "Iniciar conversa",
  },
  {
    icon: Instagram,
    title: "Instagram",
    text: "@carolsolhair",
    href: brand.instagram,
    action: "Acessar perfil",
  },
  {
    icon: Mail,
    title: "E-mail",
    text: brand.email,
    href: `mailto:${brand.email}`,
    action: "Enviar e-mail",
  },
];

function ContatoPage() {
  return (
    <InstitutionalLayout
      eyebrow="Contato"
      title="Estamos aqui para ouvir e orientar você."
      description="Escolha o canal mais confortável. Para avaliação e agendamento, o WhatsApp é o caminho mais rápido."
    >
      <InstitutionalSection title="Fale com o Universo Carol Sol.">
        <div className="grid gap-5 md:grid-cols-3">
          {channels.map(({ icon: Icon, title, text, href, action }) => (
            <a
              key={title}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
              className="group rounded-[1.5rem] border border-copper/15 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brown/10"
            >
              <Icon className="h-7 w-7 text-copper" strokeWidth={1.4} />
              <h2 className="mt-5 font-serif text-2xl">{title}</h2>
              <p className="mt-2 text-sm text-brown/70">{text}</p>
              <span className="mt-6 inline-block text-[10px] font-medium uppercase tracking-[0.18em] text-copper">
                {action}
              </span>
            </a>
          ))}
        </div>
      </InstitutionalSection>

      <InstitutionalSection title="Atendimento em Bauru." className="bg-white/55">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[1.5rem] bg-brown p-7 text-warm-white">
            <MapPin className="h-7 w-7 text-copper-light" strokeWidth={1.4} />
            <h2 className="mt-4 font-serif text-2xl">Localização</h2>
            <p className="mt-3 text-sm leading-6 text-warm-white/70">{brand.location}</p>
            <p className="mt-2 text-xs text-warm-white/50">
              O endereço completo é informado durante a confirmação do atendimento.
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-brown p-7 text-warm-white">
            <Clock className="h-7 w-7 text-copper-light" strokeWidth={1.4} />
            <h2 className="mt-4 font-serif text-2xl">Horários</h2>
            <ul className="mt-3 space-y-2 text-sm text-warm-white/70">
              {brand.hours.map((hour) => (
                <li key={hour}>{hour}</li>
              ))}
            </ul>
          </article>
        </div>
      </InstitutionalSection>
    </InstitutionalLayout>
  );
}
