import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  ShoppingBag,
  Package,
  Truck,
  DollarSign,
  Edit3,
  X,
  Save,
  ExternalLink,
  Users,
  Mail,
  Phone,
  Grid,
  Layers,
  Sparkles,
  Trash2,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";

type StoreVariant = {
  id?: string;
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
};

type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  info?: string;
  description?: string;
  price: number;
  promotionalPrice?: number | null;
  stockQuantity: number;
  categoryId?: string | null;
  categoryName?: string;
  image: string;
  images?: string[];
  badgeLabel?: string | null;
  badgeTone?: string | null;
  status: "active" | "draft" | "out_of_stock" | "archived";
  sold: number;
  variants?: StoreVariant[];
};

type StoreCategory = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
  productCount?: number;
};

type StoreOrder = {
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
  totalAmount: number;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  trackingCode?: string | null;
  paidAt?: string | null;
  createdAt: string;
  items?: Array<{
    productName: string;
    variantName?: string | null;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  }>;
};

type Stats = {
  totalRevenue: number;
  totalOrders: number;
  activeProducts: number;
  lowStockCount: number;
};

type StoreCustomer = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  document?: string;
  status: "active" | "blocked" | "inactive";
  ordersCount: number;
  totalSpent: number;
  lastOrderAt?: string | null;
  defaultAddress?: StoreOrder["shippingAddress"];
  orders: Array<
    Pick<StoreOrder, "id" | "orderNumber" | "totalAmount" | "status" | "trackingCode" | "createdAt">
  >;
};

export function StoreManager() {
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "orders" | "customers">(
    "products",
  );
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [customers, setCustomers] = useState<StoreCustomer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(null);
  const [viewingOrder, setViewingOrder] = useState<StoreOrder | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<StoreCustomer | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resProd, resCat, resOrd, resStats, resCustomers] = await Promise.all([
        fetch("/api/admin/store?action=products"),
        fetch("/api/admin/store?action=categories"),
        fetch("/api/admin/store?action=orders"),
        fetch("/api/admin/store?action=stats"),
        fetch("/api/admin/store?action=customers"),
      ]);

      const dataProd = await resProd.json();
      const dataCat = await resCat.json();
      const dataOrd = await resOrd.json();
      const dataStats = await resStats.json();
      const dataCustomers = await resCustomers.json();

      if (!resProd.ok) throw new Error(dataProd.message || "Erro ao carregar produtos");

      setProducts(dataProd.products || []);
      setCategories(dataCat.categories || []);
      setOrders(dataOrd.orders || []);
      if (resCustomers.ok) setCustomers(dataCustomers.customers || []);
      if (resStats.ok) setStats(dataStats.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar loja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const removeProduct = async (product: StoreProduct) => {
    if (
      !window.confirm(
        `Remover definitivamente o produto “${product.name}”? O histórico dos pedidos será preservado.`,
      )
    ) {
      return;
    }

    setDeletingProductId(product.id);
    setError("");
    try {
      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-product", id: product.id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao remover produto");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover produto");
    } finally {
      setDeletingProductId(null);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Cards de Métricas */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-copper/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-brown/60">
                Faturamento Confirmado
              </span>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-copper/10 text-copper">
                <DollarSign size={20} />
              </div>
            </div>
            <p className="mt-4 font-serif text-3xl text-brown">
              R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="rounded-3xl border border-copper/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-brown/60">
                Total de Pedidos
              </span>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <ShoppingBag size={20} />
              </div>
            </div>
            <p className="mt-4 font-serif text-3xl text-brown">{stats.totalOrders}</p>
          </div>

          <div className="rounded-3xl border border-copper/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-brown/60">
                Produtos Ativos
              </span>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-green-50 text-green-600">
                <Package size={20} />
              </div>
            </div>
            <p className="mt-4 font-serif text-3xl text-brown">{stats.activeProducts}</p>
          </div>

          <div className="rounded-3xl border border-copper/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-brown/60">
                Estoque Baixo (≤ 5)
              </span>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Truck size={20} />
              </div>
            </div>
            <p className="mt-4 font-serif text-3xl text-brown">{stats.lowStockCount}</p>
          </div>
        </div>
      )}

      {/* Navegação de Abas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-copper/10 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("products")}
            className={`rounded-2xl px-5 py-2.5 text-xs font-semibold tracking-wider transition uppercase ${
              activeTab === "products"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "bg-white text-brown/70 hover:bg-copper/10"
            }`}
          >
            <Package size={14} className="inline mr-1.5" /> Produtos ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`rounded-2xl px-5 py-2.5 text-xs font-semibold tracking-wider transition uppercase ${
              activeTab === "categories"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "bg-white text-brown/70 hover:bg-copper/10"
            }`}
          >
            <Grid size={14} className="inline mr-1.5" /> Categorias ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`rounded-2xl px-5 py-2.5 text-xs font-semibold tracking-wider transition uppercase ${
              activeTab === "orders"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "bg-white text-brown/70 hover:bg-copper/10"
            }`}
          >
            <ShoppingBag size={14} className="inline mr-1.5" /> Pedidos ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`rounded-2xl px-5 py-2.5 text-xs font-semibold tracking-wider transition uppercase ${
              activeTab === "customers"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "bg-white text-brown/70 hover:bg-copper/10"
            }`}
          >
            <Users size={14} className="inline mr-1.5" /> Clientes ({customers.length})
          </button>
        </div>

        {activeTab === "products" && (
          <button
            onClick={() =>
              setEditingProduct({
                id: "",
                slug: "",
                name: "",
                price: 0,
                stockQuantity: 25,
                image: "",
                status: "active",
                sold: 0,
                variants: [],
              })
            }
            className="flex items-center gap-2 rounded-2xl bg-copper px-5 py-2.5 text-xs font-semibold tracking-wider text-white hover:bg-copper-dark transition shadow-md shadow-copper/20"
          >
            <Plus size={16} /> NOVO PRODUTO
          </button>
        )}

        {activeTab === "categories" && (
          <button
            onClick={() =>
              setEditingCategory({
                id: "",
                slug: "",
                name: "",
                description: "",
                image: "/images/produto-fibra-russa.jpg",
                sortOrder: categories.length + 1,
              })
            }
            className="flex items-center gap-2 rounded-2xl bg-copper px-5 py-2.5 text-xs font-semibold tracking-wider text-white hover:bg-copper-dark transition shadow-md shadow-copper/20"
          >
            <Plus size={16} /> NOVA CATEGORIA
          </button>
        )}
      </div>

      {/* Conteúdo da Aba Produtos */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-4 text-brown/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produtos por nome ou slug..."
              className="h-12 w-full rounded-2xl border border-copper/10 bg-white pl-11 pr-4 text-sm outline-none focus:border-copper shadow-sm"
            />
          </div>

          <div className="overflow-hidden rounded-3xl border border-copper/10 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-copper/10 bg-cream/30 text-xs font-semibold uppercase tracking-wider text-brown/60">
                <tr>
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Preço</th>
                  <th className="px-6 py-4">Estoque</th>
                  <th className="px-6 py-4">Variações</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-copper/5">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-brown/50">
                      Nenhum produto cadastrado ou encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-cream/20 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt=""
                            className="h-12 w-12 rounded-xl object-cover border border-copper/10"
                          />
                          <div>
                            <p className="font-semibold text-brown">{p.name}</p>
                            <p className="text-xs text-brown/50 font-mono">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-brown/70">
                        {p.categoryName || "Geral"}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-brown">
                          R$ {p.price.toFixed(2).replace(".", ",")}
                        </p>
                        {p.promotionalPrice && (
                          <p className="text-xs text-copper font-medium">
                            Promo: R$ {p.promotionalPrice.toFixed(2).replace(".", ",")}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-semibold ${
                            p.stockQuantity <= 5 ? "text-red-600 font-bold" : "text-brown"
                          }`}
                        >
                          {p.stockQuantity} unid.
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-brown/70">
                        {p.variants && p.variants.length > 0 ? (
                          <span className="rounded-full bg-copper/10 text-copper px-2.5 py-1 text-xs font-semibold">
                            {p.variants.length} variações
                          </span>
                        ) : (
                          <span className="text-brown/40">Único</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                            p.status === "active"
                              ? "bg-green-50 text-green-700"
                              : p.status === "out_of_stock"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="rounded-xl p-2 text-copper hover:bg-copper/10 transition"
                            title="Editar produto"
                            aria-label={`Editar ${p.name}`}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeProduct(p)}
                            disabled={deletingProductId === p.id}
                            className="rounded-xl p-2 text-red-600 hover:bg-red-50 transition disabled:cursor-wait disabled:opacity-50"
                            title="Remover produto"
                            aria-label={`Remover ${p.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Categorias */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-copper/10 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-copper/10 bg-cream/30 text-xs font-semibold uppercase tracking-wider text-brown/60">
                <tr>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">ID / Slug</th>
                  <th className="px-6 py-4">Produtos Vinculados</th>
                  <th className="px-6 py-4">Ordem</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-copper/5">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-cream/20 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-copper/10 grid place-items-center text-copper font-bold">
                            ✦
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-brown">{c.name}</p>
                          {c.description && (
                            <p className="text-xs text-brown/50">{c.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-brown/60">{c.id}</td>
                    <td className="px-6 py-4 font-semibold text-brown">{c.productCount || 0}</td>
                    <td className="px-6 py-4 text-brown/70">{c.sortOrder}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingCategory(c)}
                        className="rounded-xl p-2 text-copper hover:bg-copper/10 transition"
                      >
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Pedidos */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 text-brown/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pedidos por número, cliente ou e-mail..."
                className="h-12 w-full rounded-2xl border border-copper/10 bg-white pl-11 pr-4 text-sm outline-none focus:border-copper shadow-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 rounded-2xl border border-copper/10 bg-white px-4 text-sm outline-none focus:border-copper shadow-sm"
            >
              <option value="">Todos os Status</option>
              <option value="pending">Aguardando Pagamento</option>
              <option value="paid">Pago</option>
              <option value="shipped">Enviado</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-3xl border border-copper/10 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-copper/10 bg-cream/30 text-xs font-semibold uppercase tracking-wider text-brown/60">
                <tr>
                  <th className="px-6 py-4">Pedido</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Rastreio</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-copper/5">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-brown/50">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-cream/20 transition">
                      <td className="px-6 py-4 font-mono font-bold text-copper">
                        #{o.orderNumber}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-brown">{o.customerName}</p>
                        <p className="text-xs text-brown/50">{o.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4 font-serif font-bold text-brown">
                        R$ {o.totalAmount.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                            o.status === "paid"
                              ? "bg-green-50 text-green-700"
                              : o.status === "shipped"
                                ? "bg-blue-50 text-blue-700"
                                : o.status === "cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-brown/70">
                        {o.trackingCode || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-brown/60">
                        {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setViewingOrder(o)}
                          className="rounded-xl p-2 text-copper hover:bg-copper/10 transition"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Clientes */}
      {activeTab === "customers" && (
        <div className="overflow-hidden rounded-3xl border border-copper/10 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-copper/10 bg-cream/30 text-xs font-semibold uppercase tracking-wider text-brown/60">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Total Comprado</th>
                <th className="px-6 py-4">Pedidos</th>
                <th className="px-6 py-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-copper/5">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-cream/20 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-brown">{c.fullName}</p>
                    <p className="text-xs text-brown/50">{c.document || "CPF não cadastrado"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-brown">{c.email}</p>
                    <p className="text-xs text-brown/50">{c.phone || "Sem telefone"}</p>
                  </td>
                  <td className="px-6 py-4 font-serif font-bold text-brown">
                    R$ {c.totalSpent.toFixed(2).replace(".", ",")}
                  </td>
                  <td className="px-6 py-4 font-semibold text-brown">{c.ordersCount}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setViewingCustomer(c)}
                      className="rounded-xl p-2 text-copper hover:bg-copper/10 transition"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modais */}
      {editingProduct && (
        <ProductEditorModal
          product={editingProduct.id ? editingProduct : null}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onUpdate={loadData}
        />
      )}

      {editingCategory && (
        <CategoryEditorModal
          category={editingCategory.id ? editingCategory : null}
          onClose={() => setEditingCategory(null)}
          onUpdate={loadData}
        />
      )}

      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onUpdate={loadData}
        />
      )}

      {viewingCustomer && (
        <CustomerDetailModal customer={viewingCustomer} onClose={() => setViewingCustomer(null)} />
      )}
    </div>
  );
}

function CategoryEditorModal({
  category,
  onClose,
  onUpdate,
}: {
  category: StoreCategory | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);

    try {
      const body = {
        action: "save-category",
        id: form.get("id"),
        name: form.get("name"),
        description: form.get("description"),
        image: form.get("image"),
        sortOrder: parseInt(String(form.get("sortOrder")), 10) || 0,
      };

      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao salvar categoria");

      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <h2 className="font-serif text-2xl text-brown">
            {category ? "Editar Categoria" : "Nova Categoria"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-brown/50 hover:bg-copper/10">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

          <div className="space-y-1">
            <label className="text-xs font-medium text-brown">Identificador / Slug (único) *</label>
            <input
              name="id"
              defaultValue={category?.id}
              required
              placeholder="ex: fibra-russa"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-brown">Nome da Categoria *</label>
            <input
              name="name"
              defaultValue={category?.name}
              required
              placeholder="ex: Fibra Russa"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-brown">URL da Imagem</label>
            <input
              name="image"
              defaultValue={category?.image || "/images/produto-fibra-russa.jpg"}
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-brown">Descrição</label>
            <textarea
              name="description"
              defaultValue={category?.description}
              rows={2}
              className="w-full rounded-xl border border-copper/20 p-3 text-sm outline-none focus:border-copper"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-brown">Ordem de Exibição</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={category?.sortOrder || 1}
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>

          <footer className="pt-4 border-t border-copper/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-brown/70 hover:text-brown"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-copper px-6 py-2.5 text-xs font-semibold text-white hover:bg-copper-dark transition shadow-md"
            >
              Salvar Categoria
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function ProductEditorModal({
  product,
  categories,
  onClose,
  onUpdate,
}: {
  product: StoreProduct | null;
  categories: StoreCategory[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [variants, setVariants] = useState<StoreVariant[]>(product?.variants || []);
  const [imageUrl, setImageUrl] = useState(product?.image || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        title: "Nova Opção (Cor / Comprimento)",
        stockQuantity: 10,
        status: "active",
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = <K extends keyof StoreVariant>(
    index: number,
    field: K,
    value: StoreVariant[K],
  ) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", product?.name || "Imagem de produto");
      form.append("altText", product?.name || "Produto da Sol Hair Closet");

      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const payload = await res.json();
      if (!res.ok || !payload.publicUrl) {
        throw new Error(payload.message || "Não foi possível enviar a imagem");
      }
      setImageUrl(payload.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageUrl) {
      setError("Envie a imagem principal do produto antes de salvar.");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);

    try {
      const body = {
        action: "save-product",
        id: product?.id || undefined,
        slug: form.get("slug"),
        name: form.get("name"),
        info: form.get("info"),
        description: form.get("description"),
        price: parseFloat(String(form.get("price"))),
        promotionalPrice: form.get("promotionalPrice")
          ? parseFloat(String(form.get("promotionalPrice")))
          : null,
        stockQuantity: parseInt(String(form.get("stockQuantity")), 10),
        categoryId: form.get("categoryId") || null,
        image: imageUrl,
        badgeLabel: form.get("badgeLabel") || null,
        badgeTone: form.get("badgeTone") || "gold",
        status: form.get("status"),
        variants,
      };

      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao salvar produto");

      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl max-h-[90vh]">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <h2 className="font-serif text-2xl text-brown">
            {product?.id ? "Editar Produto" : "Novo Produto"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-brown/50 hover:bg-copper/10">
            <X size={20} />
          </button>
        </header>

        <form id="product-form" onSubmit={handleSubmit} className="overflow-auto p-6 space-y-6">
          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

          {/* Dados Principais */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-copper">
              1. Informações Básicas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-brown">Nome do Produto *</label>
                <input
                  name="name"
                  defaultValue={product?.name}
                  required
                  placeholder="Ex: Fibra Russa Lisa Natural"
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-brown">Slug (URL) *</label>
                <input
                  name="slug"
                  defaultValue={product?.slug}
                  required
                  placeholder="ex: fibra-russa-lisa"
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-brown">Categoria</label>
                <select
                  name="categoryId"
                  defaultValue={product?.categoryId || ""}
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
                >
                  <option value="">Selecione...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-brown">Preço (R$) *</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={product?.price}
                  required
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-brown">Preço Promocional (R$)</label>
                <input
                  name="promotionalPrice"
                  type="number"
                  step="0.01"
                  defaultValue={product?.promotionalPrice ?? ""}
                  placeholder="Opcional"
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-brown">Estoque Geral</label>
                <input
                  name="stockQuantity"
                  type="number"
                  defaultValue={product?.stockQuantity ?? 50}
                  required
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-brown">Status</label>
                <select
                  name="status"
                  defaultValue={product?.status || "active"}
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
                >
                  <option value="active">Ativo (visível na loja)</option>
                  <option value="draft">Rascunho</option>
                  <option value="out_of_stock">Sem Estoque</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-brown">Badge / Selo</label>
                <input
                  name="badgeLabel"
                  defaultValue={product?.badgeLabel || ""}
                  placeholder="Ex: ✦ MAIS VENDIDO"
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="product-main-image" className="text-xs font-medium text-brown">
                Imagem Principal *
              </label>
              <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-copper/30 bg-cream/20 p-4 sm:flex-row sm:items-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Prévia da imagem principal do produto"
                    className="h-24 w-24 rounded-xl border border-copper/10 object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-xl bg-white text-copper/60">
                    <ImagePlus size={28} />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <input
                    id="product-main-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    disabled={uploadingImage}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file);
                      event.currentTarget.value = "";
                    }}
                    className="block w-full text-xs text-brown/70 file:mr-3 file:rounded-xl file:border-0 file:bg-copper file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-copper-dark disabled:opacity-50"
                  />
                  <p className="text-[11px] text-brown/55">
                    {uploadingImage
                      ? "Enviando imagem..."
                      : imageUrl
                        ? "Imagem pronta. Selecione outro arquivo para substituir."
                        : "Use JPG, PNG, WEBP, SVG ou GIF."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-brown">Especificação Curta (Info)</label>
              <input
                name="info"
                defaultValue={product?.info || ""}
                placeholder="Ex: Preto • 150g • 60cm"
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-brown">Descrição Completa</label>
              <textarea
                name="description"
                defaultValue={product?.description || ""}
                rows={3}
                className="w-full rounded-xl border border-copper/20 p-3 text-sm outline-none focus:border-copper"
              />
            </div>
          </div>

          {/* Variações de Produto */}
          <div className="space-y-4 pt-4 border-t border-copper/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-copper">
                  2. Variações do Produto (Cor, Comprimento, Peso)
                </h3>
                <p className="text-[11px] text-brown/60">
                  Cadastre cores ou tamanhos específicos com estoque individual.
                </p>
              </div>
              <button
                type="button"
                onClick={addVariant}
                className="rounded-xl border border-copper/30 bg-copper/10 px-3 py-1.5 text-xs font-semibold text-copper hover:bg-copper hover:text-white transition flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar Opção
              </button>
            </div>

            {variants.length === 0 ? (
              <p className="text-xs text-brown/50 italic bg-cream/30 p-3 rounded-xl">
                Nenhuma variação específica. O produto será vendido com o preço e estoque padrão
                acima.
              </p>
            ) : (
              <div className="space-y-3">
                {variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-copper/15 bg-cream/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brown">Variação #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="text-red-500 hover:text-red-700 text-xs p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-brown/70">
                          Título da Opção *
                        </label>
                        <input
                          value={v.title}
                          onChange={(e) => updateVariant(idx, "title", e.target.value)}
                          placeholder="Ex: Preto Natural 60cm"
                          className="w-full h-8 rounded-lg border border-copper/20 px-2 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-brown/70">Cor / Tom</label>
                        <input
                          value={v.color || ""}
                          onChange={(e) => updateVariant(idx, "color", e.target.value)}
                          placeholder="Ex: Castanho Escuro"
                          className="w-full h-8 rounded-lg border border-copper/20 px-2 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-brown/70">
                          Estoque desta Variação *
                        </label>
                        <input
                          type="number"
                          value={v.stockQuantity}
                          onChange={(e) =>
                            updateVariant(idx, "stockQuantity", parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full h-8 rounded-lg border border-copper/20 px-2 text-xs outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <footer className="border-t border-copper/10 bg-cream/20 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-brown/70 hover:text-brown"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={loading || uploadingImage}
            className="flex items-center gap-2 rounded-xl bg-copper px-6 py-2.5 text-xs font-semibold text-white hover:bg-copper-dark transition shadow-md"
          >
            <Save size={16} /> Salvar Produto
          </button>
        </footer>
      </div>
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onUpdate,
}: {
  order: StoreOrder;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState(order.status);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-order-status",
          orderId: order.id,
          status,
          trackingCode: trackingCode || null,
        }),
      });
      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-brown">Pedido #{order.orderNumber}</h2>
            <p className="text-xs text-brown/50">
              Realizado em {new Date(order.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-brown/50 hover:bg-copper/10">
            <X size={20} />
          </button>
        </header>

        <div className="p-6 overflow-auto space-y-6">
          {/* Atualização de Status */}
          <div className="p-4 rounded-2xl border border-copper/20 bg-cream/20 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-copper">
              Atualizar Status & Rastreamento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-brown/70">Status do Pedido</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StoreOrder["status"])}
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 text-xs outline-none focus:border-copper"
                >
                  <option value="pending">Aguardando Pagamento</option>
                  <option value="paid">Pago</option>
                  <option value="processing">Em Separação</option>
                  <option value="shipped">Enviado (com Rastreio)</option>
                  <option value="delivered">Entregue</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-brown/70">
                  Código de Rastreio Correios
                </label>
                <input
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ex: AA123456789BR"
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 text-xs outline-none focus:border-copper font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-copper px-5 py-2 text-xs font-semibold text-white hover:bg-copper-dark transition"
            >
              {saving ? "Salvando..." : "Salvar Alterações do Pedido"}
            </button>
          </div>

          {/* Dados do Cliente e Endereço */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-copper/10 bg-white">
              <p className="font-bold text-brown">Cliente</p>
              <p className="mt-1 text-brown/70">{order.customerName}</p>
              <p className="text-brown/70">{order.customerEmail}</p>
              <p className="text-brown/70">{order.customerPhone}</p>
              <p className="text-brown/70">CPF: {order.customerDocument}</p>
            </div>

            <div className="p-4 rounded-2xl border border-copper/10 bg-white">
              <p className="font-bold text-brown">Endereço de Entrega</p>
              <p className="mt-1 text-brown/70">
                {order.shippingAddress.street}, {order.shippingAddress.number}{" "}
                {order.shippingAddress.complement}
              </p>
              <p className="text-brown/70">
                {order.shippingAddress.neighborhood} — {order.shippingAddress.city}/
                {order.shippingAddress.state}
              </p>
              <p className="font-mono text-brown/70">CEP: {order.shippingAddress.zipCode}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerDetailModal({
  customer,
  onClose,
}: {
  customer: StoreCustomer;
  onClose: () => void;
}) {
  const address = customer.defaultAddress;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl">{customer.fullName}</h2>
            <p className="text-xs text-brown/55">Cliente da Sol Hair Closet</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-brown/50 hover:bg-copper/10">
            <X size={20} />
          </button>
        </header>
        <div className="space-y-6 overflow-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm">
              <Mail size={15} className="text-copper" /> {customer.email}
            </p>
            <p className="flex items-center gap-2 text-sm">
              <Phone size={15} className="text-copper" /> {customer.phone || "Não informado"}
            </p>
            <p className="text-sm">
              <span className="text-brown/55">Documento:</span>{" "}
              {customer.document || "Não informado"}
            </p>
            <p className="text-sm">
              <span className="text-brown/55">Total comprado:</span> R${" "}
              {customer.totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
