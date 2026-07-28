import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalLayout, InstitutionalSection } from "@/components/carol/InstitutionalLayout";
import { brand } from "@/data/carol-sol";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Universo Carol Sol" },
      {
        name: "description",
        content: "Saiba como o portal Universo Carol Sol trata e protege dados pessoais.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/politica-de-privacidade" }],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    title: "1. Quem somos",
    text: "O Universo Carol Sol reúne experiências de beleza, educação, tecnologia, comércio e impacto social. Para assuntos de privacidade, entre em contato pelo e-mail informado nesta página.",
  },
  {
    title: "2. Dados tratados",
    text: "Este portal institucional pode registrar dados técnicos essenciais de acesso e recebe somente as informações que você decide enviar ao entrar em contato por WhatsApp, Instagram ou e-mail. Sistemas externos, como Agenda, App, Loja e Academy, possuem fluxos e políticas próprios.",
  },
  {
    title: "3. Finalidades",
    text: "Os dados podem ser utilizados para responder solicitações, orientar atendimentos, manter segurança, cumprir obrigações legais e melhorar a experiência dos serviços solicitados.",
  },
  {
    title: "4. Compartilhamento",
    text: "Não comercializamos dados pessoais. Informações podem ser processadas por fornecedores essenciais de infraestrutura e comunicação ou compartilhadas quando houver obrigação legal.",
  },
  {
    title: "5. Conservação e segurança",
    text: "Mantemos dados pelo período necessário à finalidade informada e aplicamos medidas técnicas e organizacionais proporcionais para reduzir riscos de acesso indevido, perda ou alteração.",
  },
  {
    title: "6. Seus direitos",
    text: "Você pode solicitar confirmação de tratamento, acesso, correção, informação sobre compartilhamento, portabilidade quando aplicável, anonimização ou eliminação nos limites da legislação.",
  },
  {
    title: "7. Serviços externos",
    text: "Ao seguir um link para WhatsApp, Instagram, Agenda, App, Loja ou Academy, o tratamento também passa a observar as regras e políticas do serviço acessado.",
  },
  {
    title: "8. Atualizações",
    text: "Esta política pode ser atualizada para refletir mudanças no portal, nos serviços ou na legislação. A versão vigente será sempre publicada neste endereço.",
  },
];

function PrivacyPage() {
  return (
    <InstitutionalLayout
      eyebrow="Privacidade"
      title="Cuidado e transparência também no ambiente digital."
      description="Esta política apresenta, em linguagem clara, como os dados pessoais podem ser tratados no Portal Universo Carol Sol."
    >
      <InstitutionalSection title="Política de Privacidade">
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
        <div className="mt-8 rounded-[1.25rem] bg-brown p-6 text-warm-white">
          <h2 className="font-serif text-2xl">Canal de privacidade</h2>
          <p className="mt-3 text-sm text-warm-white/70">
            Solicitações podem ser enviadas para{" "}
            <a className="text-copper-light underline" href={`mailto:${brand.email}`}>
              {brand.email}
            </a>
            .
          </p>
        </div>
      </InstitutionalSection>
    </InstitutionalLayout>
  );
}
