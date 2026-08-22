import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Truck,
  Package,
  Sparkles,
  Loader2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";

export const Route = createFileRoute("/sol-hair-closet/pedido")({
  head: () => ({
    meta: [
      { title: "Status do Pedido | Sol Hair Closet" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrderStatusPage,
});

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type OrderData = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  shippingCost: number;
  discountAmount?: number;
  totalAmount: number;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  trackingCode?: string | null;
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paidAt?: string | null;
  createdAt: string;
  items: Array<{
    productName: string;
    variantName?: string | null;
    price: number;
    quantity: number;
    total: number;
  }>;
};

function OrderStatusPage() {
  const store = useStore();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const orderNumber =
    urlParams?.get("order_number") ||
    urlParams?.get("checkout_ref")?.replace("store-", "") ||
    null;
  const token = urlParams?.get("token") || (typeof window !== "undefined" ? localStorage.getItem(`order_token_${orderNumber}`) : null);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      setError("Número do pedido ausente.");
      return;
    }

    async function fetchOrder() {
      try {
        const queryParams = new URLSearchParams({
          action: "order_status",
          order_number: orderNumber!,
        });
        if (token) queryParams.append("token", token);

        const res = await fetch(`/api/store?${queryParams.toString()}`);
        const data = await res.json();

        if (res.ok && data.ok) {
          setOrder(data.order);
        } else {
          setError(data.message || "Acesso não autorizado ou pedido não encontrado.");
        }
      } catch (err) {
        setError("Erro de conexão ao buscar pedido.");
      } finally {
        setLoading(false);
      }
    }

    void fetchOrder();
  }, [orderNumber, token]);

  const isPaid = order?.status === "paid" || order?.status === "shipped" || order?.status === "delivered" || order?.status === "processing";
  const isShipped = order?.status === "shipped" || order?.status === "delivered";
  const isDelivered = order?.status === "delivered";

  return (
    <StoreLayout storeState={store}>
      <div className="container-shell py-12">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="py-24 text-center space-y-4">
              <Loader2 size={36} className="animate-spin text-copper mx-auto" />
              <h2 className="font-serif text-2xl text-ink-deep font-bold">Consultando seu pedido...</h2>
              <p className="text-xs text-text-secondary">Sincronizando status com o gateway SumUp.</p>
            </div>
          ) : error || !order ? (
            <div className="py-16 text-center space-y-4 rounded-3xl border border-line bg-warm-white p-8">
              <XCircle className="mx-auto text-red-500" size={48} strokeWidth={1.5} />
              <h2 className="font-serif text-2xl font-bold text-ink-deep">Ops! {error}</h2>
              <p className="text-xs text-text-secondary">
                Verifique o link recebido ou consulte na página de Meus Pedidos.
              </p>
              <Link
                to="/sol-hair-closet/pedidos"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink-deep px-8 text-xs font-semibold tracking-widest text-cream hover:bg-copper transition"
              >
                MEUS PEDIDOS
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Card Principal de Status */}
              <div className="rounded-3xl border border-line bg-warm-white p-8 shadow-sm text-center space-y-4">
                {isPaid ? (
                  <div className="space-y-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#2E7D32]/10 text-[#2E7D32]">
                      <CheckCircle2 size={36} />
                    </div>
                    <h1 className="font-serif text-3xl text-ink-deep font-bold">
                      Pagamento Confirmado!
                    </h1>
                    <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
                      Obrigada por comprar com a Sol Hair Closet! Seu pedido{" "}
                      <span className="font-bold text-copper">#{order.orderNumber}</span> já está sendo preparado com carinho.
                    </p>
                  </div>
                ) : order.status === "cancelled" ? (
                  <div className="space-y-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <XCircle size={36} />
                    </div>
                    <h1 className="font-serif text-3xl text-ink-deep font-bold">Pedido Cancelado</h1>
                    <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
                      O pagamento do pedido <b>#{order.orderNumber}</b> não foi concluído ou expirou.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Clock size={36} />
                    </div>
                    <h1 className="font-serif text-3xl text-ink-deep font-bold">Aguardando Pagamento</h1>
                    <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
                      Estamos aguardando a confirmação do pagamento do seu pedido <b>#{order.orderNumber}</b>.
                    </p>
                  </div>
                )}

                {/* Timeline Visual de Entrega */}
                {order.status !== "cancelled" && (
                  <div className="pt-6 pb-2 border-t border-line">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="flex flex-col items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${
                          isPaid ? "bg-[#2E7D32] text-warm-white" : "bg-line text-text-secondary"
                        }`}>
                          <CheckCircle2 size={20} />
                        </div>
                        <span className="text-[11px] font-semibold text-ink-deep mt-2">1. Pago</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${
                          isShipped ? "bg-copper text-warm-white" : "bg-blush text-text-secondary"
                        }`}>
                          <Truck size={20} />
                        </div>
                        <span className="text-[11px] font-semibold text-ink-deep mt-2">2. Em Trânsito</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDelivered ? "bg-[#2E7D32] text-warm-white" : "bg-blush text-text-secondary"
                        }`}>
                          <Package size={20} />
                        </div>
                        <span className="text-[11px] font-semibold text-ink-deep mt-2">3. Entregue</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rastreio */}
              {order.trackingCode && (
                <div className="rounded-3xl border border-copper/30 bg-blush/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Truck size={24} className="text-copper" />
                    <div>
                      <p className="text-xs font-bold text-ink-deep uppercase tracking-wider">Código de Rastreamento Correios</p>
                      <p className="font-mono text-base font-bold text-copper">{order.trackingCode}</p>
                    </div>
                  </div>
                  <a
                    href={`https://rastreamento.correios.com.br/app/index.php?codigo=${order.trackingCode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-ink-deep px-6 py-2.5 text-xs font-semibold tracking-wider text-cream hover:bg-copper transition flex items-center gap-1.5"
                  >
                    Rastrear nos Correios <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {/* Resumo de Itens e Endereço */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Itens */}
                <div className="rounded-3xl border border-line bg-warm-white p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-ink-deep">
                    Itens do Pedido ({order.items.length})
                  </h3>
                  <div className="divide-y divide-line">
                    {order.items.map((it, i) => (
                      <div key={i} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-ink-deep">{it.productName}</p>
                          {it.variantName && (
                            <p className="text-[10px] text-copper">{it.variantName}</p>
                          )}
                          <p className="text-[10px] text-text-secondary">{it.quantity} unidade(s)</p>
                        </div>
                        <span className="font-semibold text-ink-deep font-mono">{fmt(it.total)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-line space-y-1.5 text-xs">
                    <div className="flex justify-between text-text-secondary">
                      <span>Subtotal</span>
                      <span>{fmt(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Frete</span>
                      <span>{order.shippingCost === 0 ? "GRÁTIS" : fmt(order.shippingCost)}</span>
                    </div>
                    {Number(order.discountAmount || 0) > 0 && (
                      <div className="flex justify-between text-copper font-semibold">
                        <span>Desconto Pix</span>
                        <span>-{fmt(Number(order.discountAmount))}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-line flex justify-between font-bold text-sm text-ink-deep">
                      <span>Total Pago</span>
                      <span className="font-serif text-lg text-copper">{fmt(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Endereço de Entrega */}
                <div className="rounded-3xl border border-line bg-warm-white p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-ink-deep flex items-center gap-2">
                    <MapPin size={16} className="text-copper" /> Endereço de Envio
                  </h3>
                  <div className="text-xs text-text-secondary space-y-1">
                    <p className="font-semibold text-ink-deep">{order.customerName}</p>
                    <p>{order.shippingAddress.street}, nº {order.shippingAddress.number} {order.shippingAddress.complement && ` - ${order.shippingAddress.complement}`}</p>
                    <p>{order.shippingAddress.neighborhood} — {order.shippingAddress.city}/{order.shippingAddress.state}</p>
                    <p className="font-mono pt-1">CEP: {order.shippingAddress.zipCode}</p>
                  </div>

                  <div className="pt-4 border-t border-line text-xs text-text-secondary space-y-2">
                    <p className="font-medium text-ink-deep">Dúvidas sobre sua entrega?</p>
                    <p>Fale diretamente com nossa equipe no WhatsApp informando o número <b>#{order.orderNumber}</b>.</p>
                    <a
                      href={`https://wa.me/5514998373935?text=${encodeURIComponent(`Olá! Gostaria de informações sobre o pedido ${order.orderNumber}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-copper font-semibold hover:underline"
                    >
                      Conversar no WhatsApp →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
