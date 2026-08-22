import React, { useState, useEffect } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  Heart,
  ShoppingBag,
  Star,
  Truck,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product, ProductVariant } from "@/lib/sol-data";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const Route = createFileRoute("/sol-hair-closet/produto/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = useParams({ from: "/sol-hair-closet/produto/$slug" });
  const store = useStore();

  const [product, setProduct] = useState<(Product & { categoryName?: string; categorySlug?: string; relatedProducts?: Product[] }) | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/store?action=product&slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (res.ok && data.ok && data.product) {
          setProduct(data.product);
          setSelectedImage(data.product.image);
          if (data.product.variants && data.product.variants.length > 0) {
            setSelectedVariant(data.product.variants[0]);
          }
        } else {
          setError(data.message || "Produto não encontrado.");
        }
      } catch (err) {
        setError("Erro ao carregar detalhes do produto.");
      } finally {
        setLoading(false);
      }
    }
    void loadProduct();
  }, [slug]);

  if (loading) {
    return (
      <StoreLayout storeState={store}>
        <div className="flex flex-col items-center justify-center py-36 text-text-secondary">
          <Loader2 size={36} className="animate-spin text-copper mb-4" />
          <p className="font-serif text-lg text-ink-deep font-medium">Carregando detalhes do produto...</p>
        </div>
      </StoreLayout>
    );
  }

  if (error || !product) {
    return (
      <StoreLayout storeState={store}>
        <div className="container-shell py-20 text-center">
          <div className="max-w-md mx-auto rounded-3xl border border-line bg-warm-white p-8 shadow-sm">
            <AlertCircle size={40} className="text-[#B7476A] mx-auto mb-4" />
            <h1 className="font-serif text-2xl text-ink-deep font-bold">Ops! Produto Indisponível</h1>
            <p className="text-xs text-text-secondary mt-2">{error || "Não conseguimos encontrar este item."}</p>
            <Link
              to="/sol-hair-closet/produtos"
              className="mt-6 inline-block rounded-full bg-ink-deep px-8 py-3 text-xs tracking-widest font-semibold text-cream hover:bg-copper transition"
            >
              VOLTAR AO CATÁLOGO
            </Link>
          </div>
        </div>
      </StoreLayout>
    );
  }

  const currentPrice = selectedVariant
    ? Number(selectedVariant.promotionalPriceOverride ?? selectedVariant.priceOverride ?? product.promotionalPrice ?? product.price)
    : Number(product.promotionalPrice ?? product.price);

  const oldPrice = selectedVariant?.promotionalPriceOverride
    ? Number(selectedVariant.priceOverride ?? product.price)
    : product.promotionalPrice
    ? Number(product.price)
    : null;

  const currentStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const isOutOfStock = currentStock <= 0;

  const allImages = [
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(selectedVariant?.imageUrl ? [selectedVariant.imageUrl] : []),
  ].filter(Boolean);

  const handleAddToCart = () => {
    store.addToCart(product, selectedVariant, quantity);
  };

  const handleBuyNow = () => {
    store.addToCart(product, selectedVariant, quantity);
    store.setShowCheckoutModal(true);
  };

  return (
    <StoreLayout storeState={store}>
      <div className="container-shell py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-text-secondary mb-8">
          <Link to="/sol-hair-closet" className="hover:text-copper transition">
            Início
          </Link>
          <span>/</span>
          <Link to="/sol-hair-closet/produtos" className="hover:text-copper transition">
            Catálogo
          </Link>
          {product.categoryName && (
            <>
              <span>/</span>
              <Link
                to="/sol-hair-closet/categoria/$slug"
                params={{ slug: product.categorySlug || product.categoryId || "" }}
                className="hover:text-copper transition"
              >
                {product.categoryName}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-ink-deep font-medium truncate max-w-xs">{product.name}</span>
        </div>

        {/* Detalhes do Produto: Grid 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Coluna 1: Galeria de Imagens */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-blush border border-line shadow-sm">
              <img
                src={selectedImage || product.image || "/images/produto-fibra-russa.jpg"}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              {product.badge?.label && (
                <span className="absolute top-4 left-4 rounded-full bg-copper text-warm-white px-3.5 py-1 text-[10px] tracking-[0.2em] font-semibold uppercase shadow-md">
                  {product.badge.label}
                </span>
              )}
              {isOutOfStock && (
                <span className="absolute bottom-4 left-4 rounded-full bg-ink-deep/90 text-warm-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                  Esgotado
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`h-20 w-20 rounded-2xl overflow-hidden border-2 transition shrink-0 ${
                      selectedImage === img
                        ? "border-copper shadow-md ring-2 ring-copper/20"
                        : "border-line opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coluna 2: Informações, Variações e Compra */}
          <div className="flex flex-col space-y-6">
            <div>
              <div className="flex items-center justify-between gap-4">
                <h1 className="font-serif text-2xl sm:text-3xl text-ink-deep font-bold leading-tight">
                  {product.name}
                </h1>
                <button
                  onClick={() => store.toggleFav(product.id)}
                  aria-label="Favoritar produto"
                  className="grid h-10 w-10 place-items-center rounded-full bg-warm-white border border-line text-ink-deep hover:text-copper shadow-sm transition shrink-0"
                >
                  <Heart
                    size={20}
                    fill={store.isFaved(product.id) ? "#B7476A" : "none"}
                    className={store.isFaved(product.id) ? "text-[#B7476A]" : ""}
                  />
                </button>
              </div>

              {product.info && (
                <p className="mt-1 text-xs sm:text-sm text-text-secondary">{product.info}</p>
              )}

              {/* Avaliações */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex text-copper">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      fill="currentColor"
                      strokeWidth={0}
                      className={i < Math.floor(product.rating || 5) ? "" : "opacity-25"}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-ink-deep">
                  {product.rating || 4.8}
                </span>
                <span className="text-xs text-text-secondary">
                  ({product.reviews || 120} avaliações de clientes verificadas)
                </span>
              </div>
            </div>

            {/* Preços e Desconto Pix */}
            <div className="rounded-2xl bg-warm-white border border-line p-5 space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-3xl sm:text-4xl text-ink-deep font-bold">
                  {fmt(currentPrice)}
                </span>
                {oldPrice && (
                  <span className="text-sm text-text-secondary line-through">
                    {fmt(oldPrice)}
                  </span>
                )}
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg bg-copper/10 px-3 py-1.5 text-xs font-semibold text-copper">
                <Sparkles size={14} />
                <span>5% OFF no Pix: <b>{fmt(currentPrice * 0.95)}</b></span>
              </div>

              <p className="text-xs text-text-secondary pt-1">
                Ou em até <b>12x sem juros</b> no cartão de crédito.
              </p>
            </div>

            {/* Variações de Produto (Cor, Comprimento, Peso) */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold tracking-wider uppercase text-ink-deep">
                  Opções Disponíveis:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {product.variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const isVarOutOfStock = v.stockQuantity <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariant(v);
                          if (v.imageUrl) setSelectedImage(v.imageUrl);
                        }}
                        disabled={isVarOutOfStock}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-copper bg-copper/10 ring-2 ring-copper/30 font-semibold"
                            : "border-line bg-warm-white hover:border-copper/40"
                        } ${isVarOutOfStock ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                      >
                        <div>
                          <p className="text-xs text-ink-deep">{v.title}</p>
                          {(v.color || v.lengthCm) && (
                            <p className="text-[10px] text-text-secondary">
                              {[v.color, v.lengthCm ? `${v.lengthCm}cm` : null, v.weightG ? `${v.weightG}g` : null]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-copper">
                          {isVarOutOfStock ? "Esgotado" : `${v.stockQuantity} unid.`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantidade e Botões de Compra */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-line rounded-full bg-warm-white px-3 py-2 shadow-sm">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="text-ink-deep hover:text-copper px-2 text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-bold font-mono">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                    disabled={quantity >= currentStock}
                    className="text-ink-deep hover:text-copper px-2 text-sm font-bold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <span className="text-xs text-text-secondary">
                  {currentStock > 0 ? (
                    <span className="text-[#2E7D32] font-semibold flex items-center gap-1">
                      <CheckCircle2 size={14} /> {currentStock} unidades em estoque
                    </span>
                  ) : (
                    <span className="text-[#B7476A] font-semibold">Produto esgotado</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="rounded-full border-2 border-ink-deep bg-warm-white py-3.5 text-xs tracking-[0.2em] font-semibold text-ink-deep hover:bg-ink-deep hover:text-cream transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={16} /> ADICIONAR À SACOLA
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="rounded-full bg-copper py-3.5 text-xs tracking-[0.2em] font-semibold text-warm-white hover:bg-copper/90 transition shadow-lg shadow-copper/20 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  COMPRAR AGORA <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Informações de Frete e Segurança */}
            <div className="rounded-2xl border border-line bg-cream/30 p-4 space-y-2 text-xs text-text-secondary">
              <div className="flex items-center gap-2 text-ink-deep font-medium">
                <Truck size={16} className="text-copper shrink-0" />
                <span>Frete Grátis nas compras acima de R$ 299,90</span>
              </div>
              <div className="flex items-center gap-2 text-ink-deep font-medium">
                <ShieldCheck size={16} className="text-[#2E7D32] shrink-0" />
                <span>Compra protegida com entrega garantida para todo o Brasil</span>
              </div>
              <div className="flex items-center gap-2 text-ink-deep font-medium">
                <RefreshCw size={16} className="text-copper shrink-0" />
                <span>Garantia de 7 dias após o recebimento</span>
              </div>
            </div>

            {/* Descrição Completa */}
            {product.description && (
              <div className="pt-4 border-t border-line space-y-2">
                <h3 className="text-xs font-bold tracking-wider uppercase text-ink-deep">
                  Descrição do Produto
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Produtos Relacionados */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <div className="mt-20 pt-10 border-t border-line">
            <h2 className="font-serif text-2xl uppercase tracking-wide text-ink-deep mb-6">
              Você também pode gostar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {product.relatedProducts.map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  onAdd={(item) => store.addToCart(item)}
                  onFav={(id) => store.toggleFav(id)}
                  faved={store.isFaved(rel.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
