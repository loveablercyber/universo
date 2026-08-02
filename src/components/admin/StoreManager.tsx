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
} from "lucide-react";

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
  badgeLabel?: string | null;
  badgeTone?: string | null;
  status: "active" | "draft" | "out_of_stock" | "archived";
  sold: number;
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
  totalAmount: number;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  trackingCode?: string | null;
  createdAt: string;
};

type Stats = {
  totalRevenue: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
};

export function StoreManager() {
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [viewingOrder, setViewingOrder] = useState<StoreOrder | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resProd, resOrd, resStats] = await Promise.all([
        fetch("/api/admin/store?action=products"),
        fetch("/api/admin/store?action=orders"),
        fetch("/api/admin/store?action=stats"),
      ]);

      const dataProd = await resProd.json();
      const dataOrd = await resOrd.json();
      const dataStats = await resStats.json();

      if (!resProd.ok) throw new Error(dataProd.message || "Erro ao carregar produtos");

      setProducts(dataProd.products || []);
      setOrders(dataOrd.orders || []);
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
      {/* Cards de Métricas */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-copper/10 bg-white p-6">
            <DollarSign className="h-6 w-6 text-emerald-600" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-3xl text-emerald-700">
              R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55">
              Faturamento Total
            </p>
          </div>
          <div className="rounded-2xl border border-copper/10 bg-white p-6">
            <ShoppingBag className="h-6 w-6 text-copper" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-3xl">{stats.paidOrders}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55">Pedidos Pagos</p>
          </div>
          <div className="rounded-2xl border border-copper/10 bg-white p-6">
            <Package className="h-6 w-6 text-amber-600" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-3xl">{stats.pendingOrders}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55">
              Aguardando Pagamento
            </p>
          </div>
          <div className="rounded-2xl border border-copper/10 bg-white p-6">
            <Truck className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-3xl">{stats.shippedOrders}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55">
              Enviados / Entregues
            </p>
          </div>
        </div>
      )}

      {/* Navegação de Abas */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-copper/10">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "products"
                ? "bg-copper text-white shadow-sm"
                : "bg-cream/40 text-brown/70 hover:bg-cream"
            }`}
          >
            <Package size={16} /> Produtos ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "orders"
                ? "bg-copper text-white shadow-sm"
                : "bg-cream/40 text-brown/70 hover:bg-cream"
            }`}
          >
            <ShoppingBag size={16} /> Pedidos ({orders.length})
          </button>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brown/40" size={15} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-copper/20 bg-cream/30 pl-9 pr-4 text-xs outline-none focus:border-copper"
            />
          </div>

          {activeTab === "products" && (
            <button
              onClick={() => setEditingProduct({} as StoreProduct)}
              className="h-10 px-4 flex items-center gap-2 rounded-xl bg-copper text-xs font-semibold text-white hover:bg-copper-dark transition shrink-0"
            >
              <Plus size={16} /> Novo Produto
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {/* Tabela de Produtos */}
      {activeTab === "products" && (
        <div className="overflow-hidden rounded-2xl border border-copper/10 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream/30 text-xs uppercase text-brown/60">
                <tr>
                  <th className="px-6 py-4 font-medium">Produto</th>
                  <th className="px-6 py-4 font-medium">Preço</th>
                  <th className="px-6 py-4 font-medium">Estoque</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Vendas</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-copper/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-brown/60">
                      Carregando catálogo...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-brown/60">
                      Nenhum produto cadastrado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-cream/20 transition">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-12 w-12 rounded-xl object-cover border border-copper/10"
                        />
                        <div>
                          <p className="font-medium text-brown">{p.name}</p>
                          <p className="text-xs text-brown/55">{p.info || p.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-brown">
                        R$ {p.price.toFixed(2).replace(".", ",")}
                        {p.promotionalPrice && (
                          <span className="ml-2 text-xs font-normal text-emerald-600">
                            (Promo: R$ {p.promotionalPrice.toFixed(2)})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-semibold ${
                            p.stockQuantity === 0
                              ? "text-red-600"
                              : p.stockQuantity < 10
                                ? "text-amber-600"
                                : "text-emerald-700"
                          }`}
                        >
                          {p.stockQuantity} un
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                            p.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.status === "draft"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-brown/60">{p.sold} unidades</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="p-2 text-brown/50 hover:text-copper transition rounded-full hover:bg-copper/10"
                        >
                          <Edit3 size={16} />
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

      {/* Tabela de Pedidos */}
      {activeTab === "orders" && (
        <div className="overflow-hidden rounded-2xl border border-copper/10 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream/30 text-xs uppercase text-brown/60">
                <tr>
                  <th className="px-6 py-4 font-medium">Pedido</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Rastreio</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-copper/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-brown/60">
                      Carregando pedidos...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-brown/60">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-cream/20 transition">
                      <td className="px-6 py-4 font-mono font-bold text-copper">{o.orderNumber}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-brown">{o.customerName}</p>
                        <p className="text-xs text-brown/55">{o.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-brown">
                        R$ {o.totalAmount.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                            o.status === "paid" || o.status === "processing"
                              ? "bg-emerald-100 text-emerald-800"
                              : o.status === "shipped" || o.status === "delivered"
                                ? "bg-blue-100 text-blue-800"
                                : o.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-brown/60">
                        {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-xs text-brown/70 font-mono">
                        {o.trackingCode || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setViewingOrder(o)}
                          className="p-2 text-brown/50 hover:text-copper transition rounded-full hover:bg-copper/10"
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

      {/* Modal Edição de Produto */}
      {editingProduct && (
        <ProductEditorModal
          product={editingProduct.id ? editingProduct : null}
          onClose={() => setEditingProduct(null)}
          onUpdate={loadData}
        />
      )}

      {/* Modal Detalhes do Pedido */}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

function ProductEditorModal({
  product,
  onClose,
  onUpdate,
}: {
  product: StoreProduct | null;
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
        action: "save-product",
        id: product?.id,
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
        image: form.get("image"),
        badgeLabel: form.get("badgeLabel") || null,
        badgeTone: form.get("badgeTone") || "gold",
        status: form.get("status"),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-copper/20">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <h2 className="font-serif text-2xl text-brown">
            {product ? "Editar Produto" : "Novo Produto"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-brown/50 hover:bg-copper/10 hover:text-brown transition"
          >
            <X size={20} />
          </button>
        </header>

        <form
          id="product-form"
          onSubmit={handleSubmit}
          className="overflow-auto p-6 space-y-4 max-h-[80vh]"
        >
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nome do Produto</label>
              <input
                name="name"
                defaultValue={product?.name}
                required
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Slug (URL)</label>
              <input
                name="slug"
                defaultValue={product?.slug}
                required
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Preço (R$)</label>
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
              <label className="text-xs font-medium">Preço Promo (R$)</label>
              <input
                name="promotionalPrice"
                type="number"
                step="0.01"
                defaultValue={product?.promotionalPrice ?? ""}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Estoque</label>
              <input
                name="stockQuantity"
                type="number"
                defaultValue={product?.stockQuantity ?? 50}
                required
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">URL da Imagem</label>
            <input
              name="image"
              defaultValue={product?.image || "/images/produto-fibra-russa.jpg"}
              required
              className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Especificação Rápida (Info)</label>
              <input
                name="info"
                defaultValue={product?.info ?? ""}
                placeholder="Ex: Preto • 150g • 60cm"
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <select
                name="status"
                defaultValue={product?.status || "active"}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              >
                <option value="active">Ativo</option>
                <option value="draft">Rascunho</option>
                <option value="out_of_stock">Sem Estoque</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Descrição Completa</label>
            <textarea
              name="description"
              defaultValue={product?.description ?? ""}
              rows={3}
              className="w-full rounded-xl border border-copper/20 p-3 outline-none focus:border-copper text-sm"
            />
          </div>
        </form>

        <footer className="border-t border-copper/10 bg-cream/10 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-brown/70 hover:text-brown transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-copper px-6 py-2 text-sm font-semibold text-white hover:bg-copper-dark transition"
          >
            <Save size={16} /> Salvar
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
  const [loading, setLoading] = useState(false);

  const handleSaveStatus = async () => {
    setLoading(true);
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

      if (!res.ok) throw new Error("Erro ao atualizar pedido.");
      onUpdate();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-copper/20">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-brown">Pedido #{order.orderNumber}</h2>
            <p className="text-xs text-brown/60">
              {new Date(order.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-brown/50 hover:bg-copper/10 hover:text-brown transition"
          >
            <X size={20} />
          </button>
        </header>

        <div className="overflow-auto p-6 space-y-6 max-h-[80vh]">
          {/* Dados do Cliente */}
          <div className="space-y-2">
            <h3 className="font-serif text-lg border-b border-copper/10 pb-1">Cliente</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-brown/60">Nome</span>
                {order.customerName}
              </div>
              <div>
                <span className="block text-xs text-brown/60">CPF</span>
                {order.customerDocument}
              </div>
              <div>
                <span className="block text-xs text-brown/60">E-mail</span>
                {order.customerEmail}
              </div>
              <div>
                <span className="block text-xs text-brown/60">Telefone</span>
                {order.customerPhone}
              </div>
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div className="space-y-2">
            <h3 className="font-serif text-lg border-b border-copper/10 pb-1">
              Endereço de Entrega
            </h3>
            <p className="text-sm text-brown/80">
              {order.shippingAddress.street}, {order.shippingAddress.number}
              {order.shippingAddress.complement ? ` (${order.shippingAddress.complement})` : ""}
              <br />
              {order.shippingAddress.neighborhood} – {order.shippingAddress.city}/
              {order.shippingAddress.state}
              <br />
              <span className="text-xs text-brown/60 font-mono">
                CEP: {order.shippingAddress.zipCode}
              </span>
            </p>
          </div>

          {/* Alterar Status & Rastreio */}
          <div className="space-y-3 bg-cream/30 p-4 rounded-2xl border border-copper/10">
            <h3 className="font-serif text-lg">Atualizar Status & Envio</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1">Status do Pedido</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StoreOrder["status"])}
                  className="w-full h-10 rounded-xl border border-copper/20 bg-white px-3 text-sm outline-none focus:border-copper"
                >
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                  <option value="processing">Em Preparação</option>
                  <option value="shipped">Enviado</option>
                  <option value="delivered">Entregue</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Código de Rastreamento</label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ex: BR123456789BR"
                  className="w-full h-10 rounded-xl border border-copper/20 bg-white px-3 text-sm font-mono outline-none focus:border-copper"
                />
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-copper/10 bg-cream/10 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-brown/70 hover:text-brown transition"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSaveStatus}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-copper px-6 py-2 text-sm font-semibold text-white hover:bg-copper-dark transition"
          >
            <Save size={16} /> Salvar Alterações
          </button>
        </footer>
      </div>
    </div>
  );
}
