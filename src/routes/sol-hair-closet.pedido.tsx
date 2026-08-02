import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ShoppingBag,
  Truck,
  Package,
  Sparkles,
} from "lucide-react";
import { UniverseSwitcher } from "@/components/UniverseSwitcher";

export const Route = createFileRoute("/sol-hair-closet/pedido")({
  head: () => ({
    meta: [
      { title: "Status do Pedido | Sol Hair Closet" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrderStatusPage,
});

type OrderData = {
  orderNumber: string;
  customerName: string;
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
  createdAt: string;
  items: Array<{ productName: string; price: number; quantity: number; total: number }>;
};

function OrderStatusPage() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const orderNumber =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("order_number") ||
        new URLSearchParams(window.location.search).get("checkout_ref")?.replace("store-", "")
      : null;

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      setError("Número do pedido ausente.");
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch(
          `/api/store?action=order_status&order_number=${encodeURIComponent(orderNumber!)}`,
        );
        const data = await res.json();

        if (res.ok && data.ok) {
          setOrder(data.order);
        } else {
          setError(data.message || "Pedido não encontrado.");
        }
      } catch (err) {
        setError("Erro de conexão ao buscar pedido.");
      } finally {
        setLoading(false);
      }
    }

    void fetchOrder();
  }, [orderNumber]);

  return (
    <main className="min-h-screen bg-warm-white text-ink-deep font-sans">
      <UniverseSwitcher />

      {/* Header */}
      <header className="border-b border-line bg-cream/50 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            to="/sol-hair-closet"
            className="flex items-center gap-2 font-sans-brand text-xs font-semibold tracking-widest text-copper hover:text-ink-deep transition"
          >
            <ArrowLeft size={16} /> CONTINUAR COMPRANDO
          </Link>
          <span className="font-serif text-xl font-bold tracking-wider text-copper">
            SOL HAIR CLOSET
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {loading ? (
          <div className="py-16 text-center space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-copper/30 border-t-copper" />
            <h2 className="font-serif text-2xl">Consultando seu pedido...</h2>
          </div>
        ) : error || !order ? (
          <div className="py-12 text-center space-y-4 rounded-3xl border border-line bg-cream/30 p-8">
            <XCircle className="mx-auto text-red-500" size={48} strokeWidth={1.5} />
            <h2 className="font-serif text-3xl">Ops! {error}</h2>
            <p className="text-sm text-text-secondary">
              Verifique o link ou entre em contato com nosso atendimento.
            </p>
            <Link
              to="/sol-hair-closet"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink-deep px-8 text-xs font-semibold tracking-widest text-cream hover:bg-copper transition"
            >
              VOLTAR À LOJA
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Status Banner */}
            <div className="rounded-3xl border border-line bg-cream/40 p-8 text-center space-y-4 shadow-sm">
              {order.status === "paid" || order.status === "processing" ? (
                <>
                  <CheckCircle2 className="mx-auto text-emerald-600" size={52} strokeWidth={1.5} />
                  <h1 className="font-serif text-4xl">Pagamento Confirmado!</h1>
                  <p className="text-sm text-text-secondary">
                    Obrigado, <strong className="text-ink-deep">{order.customerName}</strong>! Seu
                    pedido <strong className="font-mono text-copper">#{order.orderNumber}</strong>{" "}
                    foi recebido e está em preparação.
                  </p>
                </>
              ) : order.status === "shipped" || order.status === "delivered" ? (
                <>
                  <Truck className="mx-auto text-blue-600" size={52} strokeWidth={1.5} />
                  <h1 className="font-serif text-4xl">
                    {order.status === "delivered" ? "Pedido Entregue!" : "Pedido Enviado!"}
                  </h1>
                  {order.trackingCode && (
                    <p className="text-sm">
                      Código de rastreamento:{" "}
                      <strong className="font-mono bg-white px-3 py-1 rounded-lg border border-line">
                        {order.trackingCode}
                      </strong>
                    </p>
                  )}
                </>
              ) : order.status === "pending" ? (
                <>
                  <Clock className="mx-auto text-amber-600" size={52} strokeWidth={1.5} />
                  <h1 className="font-serif text-4xl">Aguardando Pagamento</h1>
                  <p className="text-sm text-text-secondary">
                    Seu pedido{" "}
                    <strong className="font-mono text-copper">#{order.orderNumber}</strong> foi
                    gerado. Assim que a SumUp confirmar o pagamento, iniciaremos o envio.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="mx-auto text-red-600" size={52} strokeWidth={1.5} />
                  <h1 className="font-serif text-4xl">Pedido Cancelado</h1>
                  <p className="text-sm text-text-secondary">O pagamento não pôde ser concluído.</p>
                </>
              )}
            </div>

            {/* Detalhes do Pedido */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-line bg-white p-6 space-y-4">
                <h3 className="font-serif text-xl border-b border-line pb-2 flex items-center gap-2">
                  <Package size={18} className="text-copper" /> Itens Comprados
                </h3>
                <div className="divide-y divide-line text-sm">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex justify-between">
                      <div>
                        <p className="font-medium text-ink-deep">{item.productName}</p>
                        <p className="text-xs text-text-secondary">Qtd: {item.quantity}</p>
                      </div>
                      <span className="font-semibold">
                        R$ {item.total.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-line pt-3 flex justify-between font-serif text-lg font-bold text-ink-deep">
                  <span>Total Pago</span>
                  <span className="text-copper">
                    R$ {order.totalAmount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-white p-6 space-y-4">
                <h3 className="font-serif text-xl border-b border-line pb-2 flex items-center gap-2">
                  <Truck size={18} className="text-copper" /> Endereço de Entrega
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  <strong className="text-ink-deep">{order.customerName}</strong>
                  <br />
                  {order.shippingAddress.street}, {order.shippingAddress.number}
                  {order.shippingAddress.complement ? ` (${order.shippingAddress.complement})` : ""}
                  <br />
                  {order.shippingAddress.neighborhood} – {order.shippingAddress.city}/
                  {order.shippingAddress.state}
                  <br />
                  <span className="font-mono text-xs">CEP: {order.shippingAddress.zipCode}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
