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
  { label: "INÍCIO", href: "#inicio", active: true },
  { label: "COMO DOAR", href: "#como-doar" },
  { label: "HISTÓRIAS", href: "#historias" },
  { label: "GALERIA", href: "#galeria" },
  { label: "VOLUNTÁRIOS", href: "#voluntarios" },
  { label: "TRANSPARÊNCIA", href: "#transparencia" },
];

export const helpCards = [
  {
    icon: Scissors,
    title: "DOAR",
    script: "cabelo",
    text: "Doe cabelos, perucas, produtos e acessórios e ajude a transformar vidas.",
    cta: "QUERO DOAR",
  },
  {
    icon: HandHeart,
    title: "SOLICITAR",
    script: "cabelo",
    text: "Solicite um cabelo ou peruca e receba apoio neste momento tão importante.",
    cta: "SOLICITAR AGORA",
  },
  {
    icon: Users,
    title: "SER",
    script: "voluntário",
    text: "Seu talento e seu tempo podem gerar impacto na vida de muitas pessoas.",
    cta: "QUERO SER VOLUNTÁRIO",
  },
  {
    icon: HeartHandshake,
    title: "APOIAR",
    script: "o projeto",
    text: "Apoie com doações financeiras, materiais, serviços ou divulgação.",
    cta: "QUERO APOIAR",
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
    "Início",
    "Como Doar",
    "Solicitar Cabelo",
    "Histórias",
    "Galeria",
    "Voluntários",
    "Transparência",
  ],
  contact: [
    { label: "WhatsApp", value: "(14) 99837-3935" },
    { label: "E-mail", value: "ola@carolsol.com.br" },
    { label: "Localização", value: "Bauru - SP" },
  ],
  transparency: ["Prestação de Contas", "Relatórios", "Resultados"],
};

export const universoNav = [
  "HAIR EXTENSIONS",
  "SOL HAIR CLOSET",
  "INVISIBLE ACADEMY",
  "PROJETO ELO",
];
