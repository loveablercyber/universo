export interface Product {
  id: string;
  name: string;
  info: string;
  price: number;
  rating: number;
  reviews: number;
  sold: string;
  image: string;
  badge: { label: string; tone: "gold" | "rose" | "copper" | "cream" };
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

export const products: Product[] = [
  {
    id: "fibra-russa-lisa",
    name: "Fibra Russa Lisa Natural",
    info: "Preto • 150g • 60cm",
    price: 219.9,
    rating: 4.7,
    reviews: 146,
    sold: "+1.200 vendidas",
    image: "/images/produto-fibra-russa.jpg",
    badge: { label: "✦ MAIS VENDIDO", tone: "gold" },
  },
  {
    id: "crochet-cacheado",
    name: "Crochet Cacheado",
    info: "Preto • 300g • 40cm",
    price: 39.9,
    rating: 4.6,
    reviews: 156,
    sold: "+1.800 vendidas",
    image: "/images/produto-crochet-cacheado.jpg",
    badge: { label: "✦ QUERIDINHA", tone: "cream" },
  },
  {
    id: "rabo-cavalo-liso",
    name: "Rabo de Cavalo Liso",
    info: "Preto • 80cm • 120g",
    price: 149.9,
    rating: 4.5,
    reviews: 87,
    sold: "+670 vendidas",
    image: "/images/produto-rabo-cavalo.jpg",
    badge: { label: "♥ FAVORITA", tone: "rose" },
  },
  {
    id: "lace-morena-iluminada",
    name: "Lace Front Morena Iluminada",
    info: "70cm • Fibra Premium • 180%",
    price: 549.9,
    rating: 4.6,
    reviews: 97,
    sold: "+950 vendidas",
    image: "/images/produto-lace-morena.jpg",
    badge: { label: "✦ LANÇAMENTO", tone: "copper" },
  },
];

export const categories: Category[] = [
  { id: "fibra-russa", name: "FIBRA RUSSA", image: "/images/produto-fibra-russa.jpg" },
  { id: "apliques", name: "APLIQUES", image: "/images/produto-rabo-cavalo.jpg" },
  { id: "perucas", name: "PERUCAS", image: "/images/categoria-perucas.jpg" },
  { id: "acessorios", name: "ACESSÓRIOS", image: "/images/categoria-acessorios.jpg" },
  { id: "manutencao", name: "MANUTENÇÃO", image: "/images/categoria-manutencao.jpg" },
  { id: "fibra-europeia", name: "FIBRA EUROPEIA", image: "/images/categoria-fibra-europeia.jpg" },
];

export const drawerCategories = [
  "Fibra Russa",
  "Fibra Europeia",
  "Jumbo e Kanekalon",
  "Apliques Tic-Tac",
  "Rabo de Cavalo",
  "Perucas",
  "Lace Front",
  "Crochet",
  "Box Braids",
  "Passion Twist",
  "Water Wave",
  "Dread",
  "Acessórios",
  "Manutenção",
  "Produtos profissionais",
  "Ofertas",
];
