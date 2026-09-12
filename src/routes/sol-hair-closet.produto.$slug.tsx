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
  Leaf,
  Gem,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product, ProductVariant } from "@/lib/sol-data";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const Route = createFileRoute("/sol-hair-closet/produto/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = useParams({ from: "/sol-hair-closet/produto/$slug" });
  const store = useStore();

  const [product, setProduct] = useState<
    (Product & { categoryName?: string; categorySlug?: string; relatedProducts?: Product[] }) | null
  >(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedLength, setSelectedLength] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectionError, setSelectionError] = useState("");

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
          const availableVariants = (data.product.variants || []).filter(
            (variant: ProductVariant) => variant.status !== "inactive",
          );
          if (availableVariants.length === 1) {
            setSelectedVariant(availableVariants[0]);
            setSelectedColor(availableVariants[0].color || "");
            setSelectedLength(availableVariants[0].lengthCm ?? null);
            setSelectedImage(
              availableVariants[0].images?.[0] ||
                availableVariants[0].imageUrl ||
                data.product.image,
            );
          } else {
            setSelectedVariant(null);
            setSelectedColor("");
            setSelectedLength(null);
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
          <p className="font-serif text-lg text-ink-deep font-medium">
            Carregando detalhes do produto...
          </p>
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
            <h1 className="font-serif text-2xl text-ink-deep font-bold">
              Ops! Produto Indisponível
            </h1>
            <p className="text-xs text-text-secondary mt-2">
              {error || "Não conseguimos encontrar este item."}
            </p>
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
    ? Number(
        selectedVariant.promotionalPriceOverride ??
          selectedVariant.priceOverride ??
          product.promotionalPrice ??
          product.price,
      )
    : Number(product.promotionalPrice ?? product.price);

  const oldPrice = selectedVariant?.promotionalPriceOverride
    ? Number(selectedVariant.priceOverride ?? product.price)
    : product.promotionalPrice
      ? Number(product.price)
      : null;

  const variants = (product.variants || []).filter((variant) => variant.status !== "inactive");
  const hasVariants = variants.length > 0;
  const currentStock = selectedVariant
    ? selectedVariant.stockQuantity
    : hasVariants
      ? 0
      : product.stockQuantity;
  const isOutOfStock = selectedVariant
    ? selectedVariant.stockQuantity <= 0
    : !hasVariants && product.stockQuantity <= 0;
  const colorOptions = Array.from(
    new Set(variants.map((v) => v.color).filter(Boolean)),
  ) as string[];
  const variantsForColor = selectedColor
    ? variants.filter((v) => v.color === selectedColor)
    : variants;
  const sizeOptions = Array.from(
    new Set(
      variantsForColor.map((v) => v.lengthCm).filter((value): value is number => value != null),
    ),
  ).sort((a, b) => a - b);
  const requiresColor = colorOptions.length > 0;
  const requiresLength = variants.some((variant) => variant.lengthCm != null);
  const resolveVariant = (color: string, length: number | null) =>
    variants.find(
      (variant) =>
        (!requiresColor || variant.color === color) &&
        (!requiresLength || variant.lengthCm === length),
    ) || null;
  const chooseCombination = (color: string, length: number | null) => {
    setSelectedColor(color);
    setSelectedLength(length);
    const next = resolveVariant(color, length);
    setSelectedVariant(next);
    setQuantity(1);
    setSelectionError("");
    const images = next
      ? ([...(next.images || []), next.imageUrl].filter(Boolean) as string[])
      : [];
    setSelectedImage(images[0] || product.image);
  };

  const variantImages = selectedVariant
    ? [...(selectedVariant.images || []), selectedVariant.imageUrl].filter(
        (value): value is string => Boolean(value),
      )
    : [];
  const sourceImages = variantImages.length
    ? variantImages
    : [product.image, ...(product.images || [])];
  const allImages = sourceImages.filter(
    (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index,
  );

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      setSelectionError("Selecione todas as opções do produto antes de continuar.");
      return;
    }
    store.addToCart(product, selectedVariant, quantity);
  };

  const handleBuyNow = () => {
    if (hasVariants && !selectedVariant) {
      setSelectionError("Selecione todas as opções do produto antes de continuar.");
      return;
    }
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
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] gap-8 lg:gap-12">
          {/* Coluna 1: Galeria de Imagens */}
          <div className="grid gap-4 lg:grid-cols-[88px_minmax(0,1fr)] lg:items-start">
            {allImages.length > 1 && (
              <div className="order-2 flex gap-3 overflow-x-auto pb-2 lg:order-1 lg:max-h-[760px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
                {allImages.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setSelectedImage(img)}
                    className={`aspect-[9/16] h-24 rounded-xl overflow-hidden border-2 transition shrink-0 ${selectedImage === img ? "border-copper shadow-md" : "border-line opacity-70 hover:opacity-100"}`}
                    aria-label={`Ver imagem ${i + 1}`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="relative order-1 aspect-[9/16] max-h-[820px] rounded-3xl overflow-hidden bg-blush border border-line shadow-sm lg:order-2">
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

              {/* Avaliações reais: sem números inventados quando ainda não há avaliações. */}
              {product.reviews > 0 ? (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex text-copper">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        fill="currentColor"
                        strokeWidth={0}
                        className={i < Math.floor(product.rating) ? "" : "opacity-25"}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-ink-deep">{product.rating}</span>
                  <span className="text-xs text-text-secondary">
                    ({product.reviews} avaliações de clientes verificadas)
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-xs text-text-secondary">
                  Este produto ainda não recebeu avaliações.
                </p>
              )}
            </div>

            {/* Preços e Desconto Pix */}
            <div className="rounded-2xl bg-warm-white border border-line p-5 space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-3xl sm:text-4xl text-ink-deep font-bold">
                  {fmt(currentPrice)}
                </span>
                {oldPrice && (
                  <span className="text-sm text-text-secondary line-through">{fmt(oldPrice)}</span>
                )}
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg bg-copper/10 px-3 py-1.5 text-xs font-semibold text-copper">
                <Sparkles size={14} />
                <span>
                  5% OFF no Pix: <b>{fmt(currentPrice * 0.95)}</b>
                </span>
              </div>

              <p className="text-xs text-text-secondary pt-1">
                Ou em até <b>12x sem juros</b> no cartão de crédito.
              </p>
            </div>

            {product.shortDescription && (
              <p className="text-sm leading-relaxed text-text-secondary">
                {product.shortDescription}
              </p>
            )}

            {/* Variações de Produto (Cor, Comprimento, Peso) */}
            {hasVariants && (
              <div className="space-y-4 rounded-2xl border border-line bg-warm-white p-4">
                {requiresColor && (
                  <label className="block text-xs font-semibold text-ink-deep">
                    Cor
                    <select
                      value={selectedColor}
                      onChange={(event) => {
                        const color = event.target.value;
                        const compatibleLength =
                          requiresLength &&
                          selectedLength != null &&
                          resolveVariant(color, selectedLength)
                            ? selectedLength
                            : requiresLength
                              ? null
                              : selectedLength;
                        chooseCombination(color, compatibleLength);
                      }}
                      className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
                    >
                      <option value="">Selecione a cor</option>
                      {colorOptions.map((color) => (
                        <option
                          key={color}
                          value={color}
                          disabled={
                            !variants.some(
                              (variant) =>
                                variant.color === color &&
                                variant.status === "active" &&
                                variant.stockQuantity > 0,
                            )
                          }
                        >
                          {color}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {requiresLength && (!requiresColor || selectedColor) && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-ink-deep">
                      Tamanho / comprimento
                    </p>
                    {sizeOptions.length <= 5 ? (
                      <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((size) => {
                          const option = resolveVariant(selectedColor, size);
                          const unavailable =
                            !option || option.status !== "active" || option.stockQuantity <= 0;
                          return (
                            <button
                              key={size}
                              type="button"
                              disabled={unavailable}
                              onClick={() => chooseCombination(selectedColor, size)}
                              className={`min-w-16 rounded-xl border px-4 py-2 text-xs transition ${selectedLength === size ? "border-copper bg-copper text-white" : "border-line bg-white text-ink-deep"} disabled:cursor-not-allowed disabled:opacity-35`}
                            >
                              {size} cm
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <select
                        value={selectedLength ?? ""}
                        onChange={(event) =>
                          chooseCombination(
                            selectedColor,
                            event.target.value ? Number(event.target.value) : null,
                          )
                        }
                        className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
                      >
                        <option value="">Selecione o tamanho</option>
                        {sizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {size} cm
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                {selectedVariant && (
                  <p className="text-xs text-text-secondary">
                    SKU:{" "}
                    <span className="font-mono text-ink-deep">
                      {selectedVariant.sku || "não informado"}
                    </span>
                    {selectedVariant.texture ? ` • ${selectedVariant.texture}` : ""}
                    {selectedVariant.weightG ? ` • ${selectedVariant.weightG} g` : ""}
                  </p>
                )}
              </div>
            )}
            {selectionError && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
              >
                {selectionError}
              </p>
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
                  disabled={isOutOfStock || (hasVariants && !selectedVariant)}
                  className="rounded-full border-2 border-ink-deep bg-warm-white py-3.5 text-xs tracking-[0.2em] font-semibold text-ink-deep hover:bg-ink-deep hover:text-cream transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={16} /> ADICIONAR À SACOLA
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || (hasVariants && !selectedVariant)}
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
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 border-y border-line py-5 text-center lg:grid-cols-4">
          {[
            [Leaf, "Toque macio", "e sedoso"],
            [Gem, "Aparência", "natural"],
            [ShieldCheck, "Alta", "durabilidade"],
            [Sparkles, "Resultado", "profissional"],
          ].map(([Icon, title, subtitle]) => {
            const BenefitIcon = Icon as typeof Leaf;
            return (
              <div key={String(title)} className="flex items-center justify-center gap-3">
                <BenefitIcon size={21} className="text-copper" />
                <p className="text-xs font-semibold text-ink-deep">
                  {String(title)}
                  <span className="block font-normal text-text-secondary">{String(subtitle)}</span>
                </p>
              </div>
            );
          })}
        </div>

        <section className="mt-10 rounded-2xl border border-line bg-warm-white p-5 lg:p-7">
          <div className="hidden grid-cols-4 divide-x divide-line lg:grid">
            {[
              ["Descrição", product.description],
              ["Características", product.characteristics],
              ["Métodos", product.methods],
              ["Cuidados", product.careInstructions],
            ].map(([title, content]) => (
              <div key={title} className="px-6 first:pl-0 last:pr-0">
                <h2 className="border-b-2 border-copper pb-3 text-xs font-bold uppercase tracking-[0.14em] text-ink-deep">
                  {title}
                </h2>
                <p className="mt-5 whitespace-pre-line text-sm leading-7 text-text-secondary">
                  {content || "Informação ainda não cadastrada."}
                </p>
              </div>
            ))}
          </div>
          <div className="divide-y divide-line lg:hidden">
            {[
              ["Descrição", product.description],
              ["Características", product.characteristics],
              ["Métodos", product.methods],
              ["Cuidados", product.careInstructions],
            ].map(([title, content], index) => (
              <details key={title} open={index === 0} className="py-3">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-ink-deep">
                  {title}
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-text-secondary">
                  {content || "Informação ainda não cadastrada."}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Produtos Relacionados */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <div className="mt-20 pt-10 border-t border-line">
            <h2 className="font-serif text-2xl uppercase tracking-wide text-ink-deep mb-6">
              Você também pode gostar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {product.relatedProducts.slice(0, 5).map((rel) => (
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
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-line bg-warm-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(61,34,19,0.12)] backdrop-blur lg:hidden">
        <p className="min-w-0 flex-1 font-serif text-xl font-bold text-ink-deep">
          {fmt(currentPrice)}
        </p>
        <button
          onClick={handleBuyNow}
          disabled={isOutOfStock || (hasVariants && !selectedVariant)}
          className="rounded-full bg-copper px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-40"
        >
          Comprar agora
        </button>
      </div>
    </StoreLayout>
  );
}
