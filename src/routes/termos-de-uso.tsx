import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalLayout, InstitutionalSection } from "@/components/carol/InstitutionalLayout";
import { brand } from "@/data/carol-sol";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | Universo Carol Sol" },
      {
        name: "description",
        content: "Condições de acesso e utilização do Portal Universo Carol Sol.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/termos-de-uso" }],
  }),
  component: TermsPage,
});

const sections = [
  {
    title: "1. Finalidade do portal",
    text: "O Portal Universo Carol Sol apresenta a marca, seus projetos, serviços e canais digitais. Informações comerciais específicas podem ser confirmadas diretamente com a equipe.",
  },
  {
    title: "2. Uso adequado",
    text: "Ao acessar o portal, você concorda em utilizá-lo de forma lícita, sem tentar comprometer sua segurança, disponibilidade, conteúdo ou direitos de terceiros.",
  },
  {
    title: "3. Conteúdo informativo",
    text: "Conteúdos sobre cabelos, técnicas e cuidados têm finalidade informativa e não substituem avaliação profissional individual. Indicação de método, orçamento e resultado dependem de diagnóstico.",
  },
  {
    title: "4. Propriedade intelectual",
    text: "Textos, marcas, fotografias, identidade visual e demais materiais pertencem aos seus titulares e não podem ser reproduzidos ou explorados comercialmente sem autorização.",
  },
  {
    title: "5. Links e serviços externos",
    text: "Agenda, App, Loja, Academy, WhatsApp e Instagram podem operar em endereços próprios. Ao acessá-los, também se aplicam os termos e políticas de cada serviço.",
  },
  {
    title: "6. Disponibilidade",
    text: "Buscamos manter o portal acessível e atualizado, mas podem ocorrer interrupções para manutenção, segurança ou eventos fora de nosso controle.",
  },
  {
    title: "7. Alterações",
    text: "Os termos podem ser atualizados para refletir mudanças na operação ou na legislação. A continuidade de uso após a publicação caracteriza ciência da versão vigente.",
  },
  {
    title: "8. Contato",
    text: "Dúvidas sobre estes termos podem ser enviadas ao canal oficial de e-mail do Universo Carol Sol.",
  },
];

function TermsPage() {
  return (
    <InstitutionalLayout
      eyebrow="Termos"
      title="Uma relação construída com clareza e respeito."
      description="Estas condições orientam o acesso e o uso do Portal Universo Carol Sol."
    >
      <InstitutionalSection title="Termos de Uso">
        <p className="mb-8 text-xs uppercase tracking-[0.15em] text-brown/55">
          Última atualização: 27 de julho de 2026
        </p>
        <div className="space-y-4">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[1.25rem] border border-copper/15 bg-white p-6"
            >
              <h2 className="font-serif text-2xl">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-brown/70">{section.text}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm text-brown/70">
          Contato:{" "}
          <a className="text-copper underline" href={`mailto:${brand.email}`}>
            {brand.email}
          </a>
        </p>
      </InstitutionalSection>
    </InstitutionalLayout>
  );
}
