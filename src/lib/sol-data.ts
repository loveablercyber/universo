export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string;
  title: string;
  color?: string;
  colorHex?: string;
  lengthCm?: number;
  weightG?: number;
  texture?: string;
  priceOverride?: number | null;
  promotionalPriceOverride?: number | null;
  stockQuantity: number;
  imageUrl?: string;
  status: "active" | "out_of_stock" | "inactive";
  sortOrder?: number;
}

export interface ProductBadge {
  label: string;
  tone: "gold" | "rose" | "copper" | "cream";
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  info?: string;
  description?: string;
  price: number;
  promotionalPrice?: number | null;
  stockQuantity: number;
  categoryId?: string;
  image: string;
  images?: string[];
  badge?: ProductBadge;
  rating: number;
  reviews: number;
  sold?: string;
  variants?: ProductVariant[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image: string;
  sortOrder?: number;
  productCount?: number;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  document?: string;
  defaultAddress?: {
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  isRegistered?: boolean;
}

export interface StoreOrderItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  shippingAddress: {
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  shippingCost: number;
  subtotal: number;
  discountAmount?: number;
  discountType?: string;
  totalAmount: number;
  paymentMethod: string;
  paymentMethodSelected?: string;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  trackingCode?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
  items?: StoreOrderItem[];
}
