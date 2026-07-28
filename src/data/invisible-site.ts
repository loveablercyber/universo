import curso1 from "/images/curso-metodos-classicos.jpg?url";

export const navigation = [
  { label: "INÍCIO", href: "#inicio", active: true },
  { label: "CURSOS", href: "#cursos" },
  { label: "SOBRE", href: "#sobre" },
  { label: "MENTORIAS", href: "#mentorias" },
  { label: "CERTIFICAÇÃO", href: "#certificacao" },
  { label: "DEPOIMENTOS", href: "#depoimentos" },
  { label: "BLOG", href: "#blog" },
  { label: "CONTATO", href: "#contato" },
];

export const heroFeatures = [
  { title: "Métodos", subtitle: "Exclusivos", icon: "sparkles" as const },
  { title: "Certificação", subtitle: "Reconhecida", icon: "award" as const },
  { title: "Suporte", subtitle: "Completo", icon: "users" as const },
  { title: "Acesso", subtitle: "Vitalício", icon: "infinity" as const },
];

export const learningBenefits = [
  {
    icon: "heart-hand" as const,
    title: "FORMAÇÃO COMPLETA",
    text: "Do básico ao avançado,\ncom conteúdo atualizado.",
  },
  {
    icon: "teacher" as const,
    title: "PROFESSORA REFERÊNCIA",
    text: "Carol Sol, especialista com\nmais de 15 anos de experiência.",
  },
  {
    icon: "play" as const,
    title: "AULAS PRÁTICAS",
    text: "Passo a passo detalhado\npara você aplicar com segurança.",
  },
  {
    icon: "community" as const,
    title: "COMUNIDADE EXCLUSIVA",
    text: "Conecte-se com alunas\ne troque experiências.",
  },
  {
    icon: "gem" as const,
    title: "MENTORIAS E SUPORTE",
    text: "Acompanhamento próximo\npara o seu crescimento.",
  },
];

export type Course = {
  badge: string;
  image: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  cert: string;
};

export const courses: Course[] = [
  {
    badge: "MAIS PROCURADO",
    image: "/images/curso-metodos-classicos.jpg",
    title: "MEGA HAIR",
    subtitle: "MÉTODOS CLÁSSICOS",
    description: "Aprenda as técnicas mais utilizadas\nno mercado com excelência.",
    level: "Iniciante",
    cert: "Certificado",
  },
  {
    badge: "EXCLUSIVO",
    image: "/images/curso-fita-invisible.jpg",
    title: "MEGA HAIR",
    subtitle: "FITA INVISIBLE",
    description: "Técnica exclusiva, acabamento\nimperceptível e resultado natural.",
    level: "Intermediário",
    cert: "Certificado",
  },
  {
    badge: "AVANÇADO",
    image: "/images/curso-micro-link.jpg",
    title: "MEGA HAIR",
    subtitle: "MICRO LINK",
    description: "Domine a técnica de micro link\ne conquiste mais resultados.",
    level: "Avançado",
    cert: "Certificado",
  },
  {
    badge: "TENDÊNCIA",
    image: "/images/curso-colorimetria.jpg",
    title: "COLORIMETRIA",
    subtitle: "PARA MEGA HAIR",
    description: "Aprenda a colorir e personalizar\ncom harmonia e segurança.",
    level: "Intermediário",
    cert: "Certificado",
  },
  {
    badge: "BÔNUS",
    image: "/images/curso-gestao-marketing.jpg",
    title: "GESTÃO E MARKETING",
    subtitle: "PARA MEGA HAIR",
    description: "Estratégias para atrair clientes\ne lotar sua agenda.",
    level: "Todos os níveis",
    cert: "Certificado",
  },
];
// (unused import kept out)
void curso1;

export const stats = [
  { icon: "cap" as const, value: "MÉTODO", label: "CONHECIMENTO APLICÁVEL" },
  { icon: "heart" as const, value: "PRÁTICA", label: "TÉCNICA COM PROPÓSITO" },
  { icon: "globe" as const, value: "COMUNIDADE", label: "CONEXÃO PROFISSIONAL" },
  { icon: "star" as const, value: "EVOLUÇÃO", label: "CARREIRA E GESTÃO" },
];

export const testimonials = [
  {
    photo: "/images/aluna-1.jpg",
    text: "Conteúdo construído para transformar conhecimento técnico em segurança na prática.",
    name: "Aprendizado prático",
    city: "Metodologia Carol Sol",
  },
  {
    photo: "/images/aluna-2.jpg",
    text: "Uma jornada que une técnica de mega hair, atendimento premium e visão de negócio.",
    name: "Trilha contínua",
    city: "Técnica e gestão",
  },
  {
    photo: "/images/aluna-3.jpg",
    text: "Troca de experiências e desenvolvimento para profissionais que desejam evoluir juntas.",
    name: "Comunidade",
    city: "Conexão profissional",
  },
];

export const ctaBenefits = [
  { icon: "sparkles" as const, label: "Escolha seu\ncurso" },
  { icon: "clock" as const, label: "Estude no seu\ntempo" },
  { icon: "heart" as const, label: "Transforme\nvidas" },
  { icon: "infinity" as const, label: "Conquiste\nliberdade" },
];

export const footerNav = [
  ["Início", "Cursos", "Mentorias", "Certificação", "Depoimentos"],
  ["Blog", "Sobre", "Contato", "Área do Aluno"],
];

export const contactInfo = {
  whatsapp: "(14) 99837-3935",
  email: "ola@carolsol.com.br",
  location: "Bauru – SP",
};

export const universeBrands = [
  "HAIR EXTENSIONS",
  "SOL HAIR CLOSET",
  "INVISIBLE ACADEMY",
  "PROJETO ELO",
  "SUNSHINE",
  "BARONESA",
];
