import { useState, useEffect, useCallback, useMemo } from "react";
import type { Product, ProductVariant } from "@/lib/sol-data";

export interface CartItem {
  product: Product;
  variant?: ProductVariant | null;
  qty: number;
}

export const FREE_SHIPPING_THRESHOLD = 299.9;
export const DEFAULT_SHIPPING_COST = 20.0;
export const PIX_DISCOUNT_PERCENT = 5;

export function useStore() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [openDrawer, setOpenDrawer] = useState<null | "cat" | "search" | "cart" | "fav">(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    }
  }, []);

  // Salvar no localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sol-cart", JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem("sol-fav", JSON.stringify(favs));
    } catch {
      /* ignore */
    }
  }, [favs]);

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
        const existingIdx = prev.findIndex(
          (i) =>
            i.product.id === product.id &&
            (variant ? i.variant?.id === variant.id : !i.variant),
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            qty: updated[existingIdx].qty + qty,
          };
          return updated;
        }
        return [...prev, { product, variant: variant || null, qty }];
      });
      const title = variant ? `${product.name} (${variant.title})` : product.name;
      showToast(`${title} adicionado à sacola!`);
    },
    [showToast],
  );

  const setItemQty = useCallback((productId: string, variantId: string | null | undefined, qty: number) => {
    setCart((prev) =>
      prev.flatMap((i) => {
        const match =
          i.product.id === productId &&
          (variantId ? i.variant?.id === variantId : !i.variant);
        if (!match) return [i];
        if (qty <= 0) return [];
        return [{ ...i, qty }];
      }),
    );
  }, []);

  const removeFromCart = useCallback((productId: string, variantId?: string | null) => {
    setCart((prev) =>
      prev.filter(
        (i) =>
          !(
            i.product.id === productId &&
            (variantId ? i.variant?.id === variantId : !i.variant)
          ),
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

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.variant
        ? Number(item.variant.promotionalPriceOverride ?? item.variant.priceOverride ?? item.product.promotionalPrice ?? item.product.price)
        : Number(item.product.promotionalPrice ?? item.product.price);
      return acc + price * item.qty;
    }, 0);
  }, [cart]);

  const shippingCost = useMemo(() => {
    if (cart.length === 0) return 0;
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST;
  }, [cart.length, subtotal]);

  const pixDiscount = useMemo(() => {
    return Number(((subtotal * PIX_DISCOUNT_PERCENT) / 100).toFixed(2));
  }, [subtotal]);

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
  };
}
