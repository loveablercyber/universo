import { CmsPageContent, CmsPageSeo } from "./cms.types";

export const defaultCmsPages: Record<
  string,
  { title: string; content: CmsPageContent; seo: CmsPageSeo }
> = {
  inicio: {
    title: "Página inicial",
    seo: {
      title: "Carol Sol · Luxury Hair & Beauty Universe",
      description:
        "Universo Carol Sol: salão premium, aplicativo, loja de mega hair e Projeto Elo. Beleza que transforma, confiança que empodera.",
    },
    content: {
      sections: [
        {
          type: "hero",
          eyebrow: "LUXURY HAIR & BEAUTY UNIVERSE",
          title: "Sua beleza levada a sério.",
          subtitle:
            "Salão premium, aplicativo exclusivo, loja física e online e o Projeto Elo. Um ecossistema completo focado em transformação e autoestima.",
          buttonLabel: "AGENDAR AVALIAÇÃO",
          buttonLink: "https://agenda.carolsol.com.br",
          imageUrl: "/images/salao-carol-sol.jpg",
        },
        {
          type: "cards",
          eyebrow: "MÓDULOS E POSSIBILIDADES",
          title: "Explore nosso universo",
          items: [
            {
              title: "Salão Premium",
              description:
                "Especialista em Mega Hair, coloração e tratamentos capilares de alta qualidade.",
              link: "/salao",
            },
            {
              title: "Projeto Elo",
              description: "Transformando doações em autoestima através do acolhimento e próteses.",
              link: "/projeto-elo",
            },
            {
              title: "Sol Hair Closet",
              description: "Loja com seleção exclusiva de cabelos, fibras e acessórios.",
              link: "/servicos",
            },
          ],
        },
      ],
    },
  },
  sobre: {
    title: "Sobre Carol Sol",
    seo: {
      title: "Carol Sol | Perfil profissional",
      description:
        "Conheça Carol Sol, especialista em mega hair há 15 anos, com atendimento humanizado e protocolos personalizados.",
    },
    content: {
      sections: [
        {
          type: "hero",
          eyebrow: "Perfil profissional",
          title: "Técnica, cuidado e transformação em cada atendimento.",
          subtitle:
            "Carol Sol é especialista em mega hair, com foco em resultados naturais, seguros e duradouros.",
          imageUrl: "/images/salao-carol-sol.jpg",
        },
        {
          type: "text",
          eyebrow: "CAROL SOL",
          title: "Uma profissional dedicada à identidade de cada cliente.",
          content:
            "Carol Sol é uma profissional especializada em mega hair, com foco em resultados naturais e duradouros. O atendimento é feito de forma individual, combinando diagnóstico capilar, seleção de fios premium e técnicas de aplicação seguras.\n\nCada procedimento é pensado para valorizar a identidade da cliente, respeitar o cabelo natural e garantir conforto durante o uso.",
        },
        {
          type: "cards",
          eyebrow: "ESPECIALIDADES",
          title: "Soluções escolhidas com propósito.",
          items: [
            {
              title: "Especialista em Mega Hair",
              description:
                "Técnicas modernas, aplicação segura e manutenção cuidadosa para resultados naturais e duradouros.",
            },
            {
              title: "Bio Orgânico & Fibra Russa",
              description:
                "Seleção de fios premium para oferecer naturalidade, movimento, leveza e acabamento elegante.",
            },
            {
              title: "Fita Adesiva, Microlink e Entrelaçamento",
              description:
                "Protocolos personalizados para diferentes fios, necessidades e estilos de vida.",
            },
          ],
        },
      ],
    },
  },
  salao: {
    title: "Salão Premium",
    seo: {
      title: "Salão Premium | Carol Sol",
      description:
        "Ambiente exclusivo com atendimento personalizado e técnicas avançadas em mega hair e tratamento.",
    },
    content: {
      sections: [
        {
          type: "hero",
          eyebrow: "SALÃO PREMIUM",
          title: "Um espaço pensado para o seu bem-estar.",
          subtitle: "Atendimento exclusivo com privacidade, conforto e excelência técnica.",
          buttonLabel: "AGENDAR HORÁRIO",
          buttonLink: "https://agenda.carolsol.com.br",
        },
      ],
    },
  },
  servicos: {
    title: "Serviços e Protocolos",
    seo: {
      title: "Serviços e Tratamentos | Carol Sol",
      description:
        "Confira nossos serviços de Mega Hair, manutenção, tratamentos e consultas de avaliação.",
    },
    content: {
      sections: [
        {
          type: "hero",
          eyebrow: "SERVIÇOS",
          title: "Protocolos de alta performance para seus cabelos.",
          subtitle: "Transformações seguras e personalizadas para realçar sua beleza natural.",
        },
      ],
    },
  },
  contato: {
    title: "Contato e Localização",
    seo: {
      title: "Contato | Carol Sol",
      description:
        "Entre em contato conosco, tire suas dúvidas ou solicite um orçamento via WhatsApp.",
    },
    content: {
      sections: [
        {
          type: "hero",
          eyebrow: "CONTATO",
          title: "Estamos prontos para atender você.",
          subtitle: "Fale com nossa equipe pelo WhatsApp ou venha nos visitar.",
        },
        {
          type: "text",
          title: "Canais Oficiais",
          content: "WhatsApp: (14) 99837-3935\nE-mail: ola@carolsol.com.br\nEndereço: Bauru - SP",
        },
      ],
    },
  },
  "projeto-elo": {
    title: "Projeto Elo",
    seo: {
      title: "Projeto Elo | Transformando Vidas",
      description:
        "Iniciativa social do Universo Carol Sol voltada à doação de mega hair e recuperação da auto-estima.",
    },
    content: {
      sections: [
        {
          type: "hero",
          eyebrow: "IMPACTO SOCIAL",
          title: "Transformando doações em autoestima.",
          subtitle: "Acolhimento, amor e restauração da confiança para mulheres e crianças.",
          buttonLabel: "SEJA UM VOLUNTÁRIO / DOADOR",
          buttonLink: "/contato",
        },
      ],
    },
  },
};
