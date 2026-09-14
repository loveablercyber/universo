import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Product, ProductVariant } from "@/lib/sol-data";
import { calculateStoreDiscounts, DEFAULT_PIX_DISCOUNT } from "@/lib/store-discounts";

export interface CartItem {
  product: Product;
  variant?: ProductVariant | null;
  qty: number;
}

export const FREE_SHIPPING_THRESHOLD = 299.9;
export const DEFAULT_SHIPPING_COST = 20.0;
export const PIX_DISCOUNT_PERCENT = DEFAULT_PIX_DISCOUNT;

export function useStore() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<null | "cat" | "search" | "cart" | "fav">(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const catalogRefreshed = useRef(false);

  // Carregar do localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("sol-cart");
      const savedFavs = localStorage.getItem("sol-fav");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      }
      if (savedFavs) {
        const parsed = JSON.parse(savedFavs);
        if (Array.isArray(parsed)) setFavs(parsed);
      }
    } catch {
      /* ignore */
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  // Revalida preço, estoque, elegibilidade e variações salvos no navegador.
  // O checkout ainda faz a validação autoritativa no servidor.
  useEffect(() => {
    if (!storageLoaded || cart.length === 0 || catalogRefreshed.current) return;
    catalogRefreshed.current = true;
    void fetch("/api/store?action=products&limit=100")
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.ok || !Array.isArray(payload.products)) return;
        const products = new Map<string, Product>(
          payload.products.map((product: Product) => [product.id, product]),
        );
        setCart((current) =>
          current.flatMap((item) => {
            const product = products.get(item.product.id);
            if (!product) return [];
            const variant = item.variant
              ? product.variants?.find((candidate) => candidate.id === item.variant?.id)
              : null;
            if (item.variant && !variant) return [];
            const available = variant?.stockQuantity ?? product.stockQuantity;
            if (available <= 0) return [];
            return [{ product, variant: variant || null, qty: Math.min(item.qty, available) }];
          }),
        );
      })
      .catch(() => {});
  }, [cart.length, storageLoaded]);

  // Salvar no localStorage
  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem("sol-cart", JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem("sol-fav", JSON.stringify(favs));
    } catch {
      /* ignore */
    }
  }, [favs, storageLoaded]);

  // Timer do toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const addToCart = useCallback(
    (product: Product, variant?: ProductVariant | null, qty = 1) => {
      setCart((prev) => {
        const available = Math.max(0, variant?.stockQuantity ?? product.stockQuantity);
        const requested = Math.min(Math.max(1, qty), available);
        if (requested <= 0) return prev;
        const existingIdx = prev.findIndex(
          (i) =>
            i.product.id === product.id && (variant ? i.variant?.id === variant.id : !i.variant),
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            qty: Math.min(updated[existingIdx].qty + requested, available),
          };
          return updated;
        }
        return [...prev, { product, variant: variant || null, qty: requested }];
      });
      const title = variant ? `${product.name} (${variant.title})` : product.name;
      showToast(`${title} adicionado à sacola!`);
    },
    [showToast],
  );

  const setItemQty = useCallback(
    (productId: string, variantId: string | null | undefined, qty: number) => {
      setCart((prev) =>
        prev.flatMap((i) => {
          const match =
            i.product.id === productId && (variantId ? i.variant?.id === variantId : !i.variant);
          if (!match) return [i];
          if (qty <= 0) return [];
          const available = Math.max(0, i.variant?.stockQuantity ?? i.product.stockQuantity);
          return [{ ...i, qty: Math.min(qty, available) }];
        }),
      );
    },
    [],
  );

  const removeFromCart = useCallback((productId: string, variantId?: string | null) => {
    setCart((prev) =>
      prev.filter(
        (i) =>
          !(i.product.id === productId && (variantId ? i.variant?.id === variantId : !i.variant)),
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem("sol-cart");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFav = useCallback(
    (productId: string) => {
      setFavs((prev) => {
        const isFav = prev.includes(productId);
        if (isFav) {
          showToast("Item removido dos favoritos");
          return prev.filter((id) => id !== productId);
        } else {
          showToast("Item salvo nos favoritos ❤️");
          return [...prev, productId];
        }
      });
    },
    [showToast],
  );

  const isFaved = useCallback((productId: string) => favs.includes(productId), [favs]);

  // Cálculos financeiros
  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart]);

  const discountLines = useMemo(
    () =>
      cart.map((item, index) => ({
        key: String(index),
        quantity: item.qty,
        regularUnitPrice: Number(item.variant?.priceOverride ?? item.product.price),
        promotionalUnitPrice:
          item.variant?.promotionalPriceOverride ??
          (item.variant?.priceOverride != null ? null : item.product.promotionalPrice),
        wholesaleEligible: Boolean(item.product.wholesaleEligible),
      })),
    [cart],
  );
  const cardPricing = useMemo(
    () => calculateStoreDiscounts(discountLines, { paymentMethod: "card" }),
    [discountLines],
  );
  const pixPricing = useMemo(
    () =>
      calculateStoreDiscounts(discountLines, {
        paymentMethod: "pix",
        pixDiscountPercent: PIX_DISCOUNT_PERCENT,
      }),
    [discountLines],
  );
  const subtotal = cardPricing.merchandiseSubtotal;

  const shippingCost = useMemo(() => {
    if (cart.length === 0) return 0;
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST;
  }, [cart.length, subtotal]);

  const pixDiscount = useMemo(() => {
    return Number(Math.max(0, subtotal - pixPricing.merchandiseSubtotal).toFixed(2));
  }, [subtotal, pixPricing.merchandiseSubtotal]);

  const pixTotal = useMemo(() => {
    return Math.max(0, subtotal + shippingCost - pixDiscount);
  }, [subtotal, shippingCost, pixDiscount]);

  const total = useMemo(() => {
    return subtotal + shippingCost;
  }, [subtotal, shippingCost]);

  return {
    cart,
    favs,
    openDrawer,
    setOpenDrawer,
    showCheckoutModal,
    setShowCheckoutModal,
    toastMessage,
    showToast,
    addToCart,
    setItemQty,
    removeFromCart,
    clearCart,
    toggleFav,
    isFaved,
    cartCount,
    subtotal,
    shippingCost,
    pixDiscount,
    pixTotal,
    total,
    cardPricing,
    pixPricing,
    wholesaleEligibleQuantity: cardPricing.wholesaleEligibleQuantity,
    wholesaleDiscountPercent: cardPricing.wholesaleDiscountPercent,
    unitsUntilNextWholesaleTier: cardPricing.unitsUntilNextWholesaleTier,
    nextWholesaleThreshold: cardPricing.nextWholesaleThreshold,
  };
}
