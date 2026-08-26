import {
  Scissors,
  HandHeart,
  Users,
  HeartHandshake,
  Heart,
  Package,
  Gift,
  Hand,
} from "lucide-react";

export const navigation = [
  { label: "INÍCIO", href: "/projeto-elo", active: true },
  { label: "COMO DOAR", href: "/projeto-elo/como-doar" },
  { label: "HISTÓRIAS", href: "/projeto-elo/historias" },
  { label: "GALERIA", href: "/projeto-elo/galeria" },
  { label: "VOLUNTÁRIOS", href: "/projeto-elo/participar?tipo=volunteer" },
  { label: "TRANSPARÊNCIA", href: "/projeto-elo/transparencia" },
];

export const helpCards = [
  {
    icon: Scissors,
    title: "DOAR",
    script: "cabelo",
    text: "Doe cabelos, perucas, produtos e acessórios e ajude a transformar vidas.",
    cta: "QUERO DOAR",
    href: "/projeto-elo/participar?tipo=hair_donation",
  },
  {
    icon: HandHeart,
    title: "SOLICITAR",
    script: "cabelo",
    text: "Solicite um cabelo ou peruca e receba apoio neste momento tão importante.",
    cta: "SOLICITAR AGORA",
    href: "/projeto-elo/participar?tipo=beneficiary_request",
  },
  {
    icon: Users,
    title: "SER",
    script: "voluntário",
    text: "Seu talento e seu tempo podem gerar impacto na vida de muitas pessoas.",
    cta: "QUERO SER VOLUNTÁRIO",
    href: "/projeto-elo/participar?tipo=volunteer",
  },
  {
    icon: HeartHandshake,
    title: "APOIAR",
    script: "o projeto",
    text: "Apoie com doações financeiras, materiais, serviços ou divulgação.",
    cta: "QUERO APOIAR",
    href: "/doacao",
  },
];

export const impactStats = [
  { icon: Scissors, value: "DOAÇÃO", label: ["UM GESTO QUE", "INICIA A MUDANÇA"] },
  { icon: Heart, value: "CUIDADO", label: ["PREPARO FEITO", "COM RESPEITO"] },
  { icon: Package, value: "ENTREGA", label: ["APOIO PARA", "NOVOS COMEÇOS"] },
  { icon: Users, value: "REDE", label: ["PESSOAS QUE", "SOMAM FORÇAS"] },
  { icon: HandHeart, value: "IMPACTO", label: ["AUTOESTIMA E", "ACOLHIMENTO"] },
];

export const stories = [
  { image: "/images/historia-1.jpg", text: "De um gesto de amor, nasceu um novo começo." },
  { image: "/images/historia-2.jpg", text: "Receber foi mais do que cabelo, foi autoestima." },
  { image: "/images/historia-3.jpg", text: "Ser voluntária me conectou a um propósito." },
];

export const processSteps = [
  { icon: Scissors, title: "1. DOAÇÃO", text: "Você doa seu cabelo ou itens." },
  {
    icon: HandHeart,
    title: "2. PREPARAÇÃO",
    text: "Tudo é higienizado e preparado com muito cuidado.",
  },
  {
    icon: Gift,
    title: "3. TRANSFORMAÇÃO",
    text: "Kits e perucas são montados com amor e responsabilidade.",
  },
  { icon: Hand, title: "4. ENTREGA", text: "Levamos autoestima e esperança para quem precisa." },
  { icon: Heart, title: "5. IMPACTO", text: "Novos começos, novas histórias, novas vidas." },
];

export const socialImages = [
  "/images/social-1.jpg",
  "/images/social-2.jpg",
  "/images/social-3.jpg",
  "/images/social-4.jpg",
  "/images/social-5.jpg",
];

export const footerLinks = {
  navigation: [
    { label: "Início", href: "/projeto-elo" },
    { label: "Como doar", href: "/projeto-elo/como-doar" },
    { label: "Solicitar atendimento", href: "/projeto-elo/participar?tipo=beneficiary_request" },
    { label: "Histórias", href: "/projeto-elo/historias" },
    { label: "Galeria", href: "/projeto-elo/galeria" },
    { label: "Voluntários", href: "/projeto-elo/participar?tipo=volunteer" },
    { label: "Transparência", href: "/projeto-elo/transparencia" },
  ],
  contact: [
    { label: "WhatsApp", value: "(14) 99837-3935" },
    { label: "E-mail", value: "ola@carolsol.com.br" },
    { label: "Localização", value: "Bauru - SP" },
  ],
  transparency: [
    { label: "Prestação de contas", href: "/projeto-elo/transparencia" },
    { label: "Resultados", href: "/projeto-elo/transparencia" },
    { label: "Política de Privacidade", href: "/politica-de-privacidade" },
  ],
};

export const universoNav = [
  "HAIR EXTENSIONS",
  "SOL HAIR CLOSET",
  "INVISIBLE ACADEMY",
  "PROJETO ELO",
];
