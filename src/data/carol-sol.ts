import { siteLinks } from "@/lib/site-links";

export const brand = {
  name: "CAROL SOL",
  tagline: "LUXURY HAIR & BEAUTY UNIVERSE",
  phone: "(14) 99888-0000",
  whatsapp: "https://wa.me/5514998880000",
  email: "contato@carolsol.com.br",
  location: "Bauru · São Paulo · Brasil",
  hours: ["Segunda a Sexta: 9h às 19h", "Sábado: 9h às 16h", "Domingo: Fechado"],
};

export const nav = [
  { label: "INÍCIO", href: "#inicio", active: true },
  { label: "ACADEMIA", href: siteLinks.academy },
  { label: "APLICATIVO", href: siteLinks.app },
  { label: "LOJA", href: siteLinks.store },
  { label: "PROJETO ELO", href: "/projeto-elo" },
  { label: "CONTATO", href: "#contato" },
];

export const possibilities = [
  {
    icon: "logo" as const,
    title: "CAROL SOL\nHAIR EXTENSIONS",
    subtitle: "SALÃO PREMIUM",
    image: "/images/salao-carol-sol.jpg",
    items: ["Mega Hair", "Manutenção", "Coloração", "Avaliação Personalizada", "Tratamentos"],
    cta: { label: "AGENDAR ATENDIMENTO", href: siteLinks.agenda, variant: "copper" as const },
  },
  {
    icon: "smartphone" as const,
    title: "APLICATIVO\nDO CLIENTE",
    subtitle: "SEU SALÃO NA\nPALMA DA MÃO.",
    image: "/images/aplicativo-carol-sol.jpg",
    items: [
      "Agendamento online",
      "Alteração de horários",
      "Histórico de atendimentos",
      "Área exclusiva do cliente",
      "Notificações",
    ],
    cta: { label: "ACESSAR APLICATIVO", href: siteLinks.app, variant: "copper" as const },
  },
  {
    icon: "bag" as const,
    title: "SOL\nHAIR CLOSET",
    subtitle: "LOJA FÍSICA\n+ LOJA ONLINE",
    image: "/images/loja-sol-hair-closet.jpg",
    items: ["Cabelos", "Fibras", "Acessórios", "Produtos"],
    cta: { label: "ENTRAR NA LOJA", href: siteLinks.store, variant: "copper" as const },
  },
  {
    icon: "heart" as const,
    title: "PROJETO\nELO",
    subtitle: "TRANSFORMANDO\nDOAÇÕES EM AUTOESTIMA.",
    image: "/images/projeto-elo.jpg",
    items: ["Doação de Mega Hair", "Atendimento Social", "Transformações", "Como ajudar"],
    cta: { label: "CONHECER PROJETO ELO", href: "/projeto-elo", variant: "copper" as const },
  },
  {
    icon: "whatsapp" as const,
    title: "ATENDIMENTO\nHUMANIZADO",
    subtitle: "PESSOAS REAIS,\nCUIDANDO DE VOCÊ.",
    image: "/images/atendimento-whatsapp.jpg",
    items: ["Pré-avaliação", "Orçamentos", "Agendamento", "Suporte"],
    cta: {
      label: "FALAR NO WHATSAPP",
      href: "https://wa.me/5514998880000",
      variant: "whatsapp" as const,
    },
  },
];

export const benefits = [
  {
    icon: "sparkle",
    title: "ATENDIMENTO\nPREMIUM",
    text: "Experiência exclusiva do início ao fim.",
  },
  {
    icon: "phone",
    title: "TECNOLOGIA\nQUE CONECTA",
    text: "Soluções práticas para facilitar sua rotina.",
  },
  {
    icon: "heart",
    title: "HUMANIZAÇÃO\nSEMPRE",
    text: "Atendimento próximo, empático e acolhedor.",
  },
  {
    icon: "crown",
    title: "EXPERTISE\nEM MEGA HAIR",
    text: "Técnicas avançadas e profissionais especialistas.",
  },
  {
    icon: "heart-connect",
    title: "IMPACTO\nSOCIAL",
    text: "Transformamos doações em novas histórias.",
  },
] as const;

export const stats = [
  { icon: "diamond", value: "+10", label: "ANOS\nDE EXPERIÊNCIA" },
  { icon: "heart", value: "MILHARES", label: "DE TRANSFORMAÇÕES\nREALIZADAS" },
  { icon: "map", value: "CLIENTES", label: "ATENDIDAS EM\nTODO O BRASIL" },
  { icon: "infinity", value: "PROJETO ELO", label: "EM ATIVIDADE" },
  { icon: "smartphone", value: "APLICATIVO", label: "EXCLUSIVO PARA\nCLIENTES" },
] as const;

export const footerLinks = [
  { label: "Academia", href: siteLinks.academy },
  { label: "Aplicativo", href: siteLinks.app },
  { label: "Loja", href: siteLinks.store },
  { label: "Projeto Elo", href: "/projeto-elo" },
  { label: "Contato", href: "#contato" },
];
