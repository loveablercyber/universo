INSERT INTO universe.settings(key, value, description, is_public)
VALUES (
  'store_home_config',
  '{
    "heroEyebrow": "A SUA MELHOR VERSÃO",
    "heroTitle": "CABELOS QUE TRANSFORMAM",
    "heroSubtitle": "Qualidade premium para realçar sua beleza todos os dias.",
    "heroCtaLabel": "COMPRE AGORA",
    "heroCtaUrl": "/sol-hair-closet/produtos",
    "heroImageUrl": "/images/hero-sol-hair-closet.jpg",
    "featuredCategoryIds": ["apliques", "fibra-russa", "perucas"],
    "featuredProductIds": []
  }'::jsonb,
  'Conteúdo, categorias e produtos em destaque na página inicial da Sol Hair Closet',
  true
)
ON CONFLICT (key) DO NOTHING;
