import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package,
  Search,
  CheckCircle2,
  Truck,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Mail,
  LogIn,
  Key,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const Route = createFileRoute("/sol-hair-closet/pedidos")({
  component: CustomerOrdersPage,
});

function CustomerOrdersPage() {
  const store = useStore();
  const [customer, setCustomer] = useState<{ fullName: string; email: string } | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingLink, setRequestingLink] = useState(false);
  const [linkSentMessage, setLinkSentMessage] = useState("");
  const [devToken, setDevToken] = useState("");
  const [error, setError] = useState("");

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const tokenFromUrl = urlParams?.get("token");
  const emailFromUrl = urlParams?.get("email");

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError("");

      try {
        // 1. Tentar ler sessão do cliente logado
        const custRes = await fetch("/api/store-customer");
        const custData = await custRes.json();

        if (custRes.ok && custData.ok && custData.customer?.email) {
          setCustomer(custData.customer);
          // Buscar pedidos da sessão
          const ordRes = await fetch("/api/store?action=customer_orders");
          const ordData = await ordRes.json();
          if (ordRes.ok && ordData.ok && Array.isArray(ordData.orders)) {
            setOrders(ordData.orders);
          }
        } else if (emailFromUrl && tokenFromUrl) {
          // 2. Tentar validar token temporário de acesso
          const ordRes = await fetch(
            `/api/store?action=customer_orders&email=${encodeURIComponent(emailFromUrl)}&token=${encodeURIComponent(tokenFromUrl)}`,
          );
          const ordData = await ordRes.json();
          if (ordRes.ok && ordData.ok && Array.isArray(ordData.orders)) {
            setOrders(ordData.orders);
            setEmailInput(emailFromUrl);
          } else {
            setError(ordData.message || "Link de acesso expirado ou inválido.");
          }
        }
      } catch {
        setError("Erro ao conectar com o servidor.");
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [emailFromUrl, tokenFromUrl]);

  const handleRequestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }

    setRequestingLink(true);
    setError("");
    setLinkSentMessage("");
    setDevToken("");

    try {
      const res = await fetch(
        `/api/store?action=request_history_access&email=${encodeURIComponent(emailInput.trim().toLowerCase())}`,
      );
      const data = await res.json();

      if (res.ok && data.ok) {
        setLinkSentMessage("Enviamos um link de acesso seguro para o seu e-mail!");
        if (data.devToken) {
          setDevToken(data.devToken);
        }
      } else {
        setError(data.message || "Não foi possível gerar o link de acesso.");
      }
    } catch {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setRequestingLink(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="rounded-full bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/30 px-3 py-1 text-xs font-semibold">Pagamento Confirmado</span>;
      case "shipped":
        return <span className="rounded-full bg-copper/10 text-copper border border-copper/30 px-3 py-1 text-xs font-semibold">Pedido Enviado</span>;
      case "delivered":
        return <span className="rounded-full bg-[#2E7D32] text-warm-white px-3 py-1 text-xs font-semibold">Entregue</span>;
      case "cancelled":
        return <span className="rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">Cancelado</span>;
      default:
        return <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold">Aguardando Pagamento</span>;
    }
  };

  return (
    <StoreLayout storeState={store}>
      <div className="container-shell py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl text-ink-deep font-bold">
              Meus Pedidos
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              Acompanhe o status de pagamento, separação e envio de suas compras.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <Loader2 size={36} className="animate-spin text-copper mb-3" />
              <p className="text-xs font-medium">Verificando autorização de acesso...</p>
            </div>
          ) : customer || orders.length > 0 ? (
            /* Lista de Pedidos Autenticada */
            <div className="space-y-6">
              {customer && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-cream/40 border border-line text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#2E7D32]" />
                    <span>Conectada como <b>{customer.email}</b></span>
                  </div>
                  <Link to="/sol-hair-closet/conta" className="text-copper font-semibold hover:underline">
                    Minha Conta
                  </Link>
                </div>
              )}

              {orders.length === 0 ? (
                <div className="text-center py-16 bg-warm-white rounded-3xl border border-line p-8">
                  <Package size={36} className="text-copper mx-auto mb-3" />
                  <p className="font-serif text-lg font-semibold text-ink-deep">Nenhum pedido encontrado</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Você ainda não possui compras registradas neste e-mail.
                  </p>
                  <Link
                    to="/sol-hair-closet/produtos"
                    className="mt-6 inline-block rounded-full bg-ink-deep px-6 py-2.5 text-xs font-semibold text-cream hover:bg-copper transition"
                  >
                    EXPLORAR PRODUTOS
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold tracking-wider uppercase text-ink-deep">
                    Suas Compras ({orders.length})
                  </h2>

                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="rounded-3xl border border-line bg-warm-white p-6 shadow-sm space-y-4 hover:border-copper/40 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
                        <div>
                          <span className="font-mono text-xs font-bold text-copper">
                            #{ord.orderNumber}
                          </span>
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            Realizado em {new Date(ord.createdAt).toLocaleDateString("pt-BR")} às{" "}
                            {new Date(ord.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(ord.status)}
                          <Link
                            to="/sol-hair-closet/pedido"
                            search={{ order_number: ord.orderNumber }}
                            className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink-deep hover:bg-blush hover:text-copper transition flex items-center gap-1"
                          >
                            Ver Detalhes <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>

                      {/* Itens */}
                      {Array.isArray(ord.items) && ord.items.length > 0 && (
                        <div className="divide-y divide-line/60">
                          {ord.items.map((it: any, i: number) => (
                            <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center text-xs">
                              <div>
                                <p className="font-medium text-ink-deep">{it.productName}</p>
                                {it.variantName && (
                                  <p className="text-[10px] text-copper">{it.variantName}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-text-secondary">{it.quantity}x </span>
                                <span className="font-semibold text-ink-deep font-mono">{fmt(it.unitPrice)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rodapé */}
                      <div className="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        {ord.trackingCode ? (
                          <div className="flex items-center gap-2 text-copper font-medium">
                            <Truck size={16} />
                            <span>Código de Rastreio: <b>{ord.trackingCode}</b></span>
                          </div>
                        ) : (
                          <span className="text-text-secondary">Rastreio será disponibilizado após o envio.</span>
                        )}

                        <div className="text-right">
                          <span className="text-text-secondary">Total: </span>
                          <span className="font-serif text-lg font-bold text-ink-deep font-mono">
                            {fmt(ord.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Tela de Acesso Protegido (Sem Login) */
            <div className="rounded-3xl border border-line bg-warm-white p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-blush/60 border border-copper/20 text-xs text-ink-deep">
                <ShieldCheck size={24} className="text-copper shrink-0" />
                <p>
                  Para proteger seus dados de entrega, endereço e informações pessoais, o histórico de compras é acessível apenas com login ou link de segurança enviado ao seu e-mail.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {linkSentMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-[#2E7D32] space-y-2">
                  <p className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} className="shrink-0" /> {linkSentMessage}
                  </p>
                  {devToken && (
                    <div className="pt-2 border-t border-green-200">
                      <p className="text-[10px] text-green-700">Link rápido de teste gerado:</p>
                      <a
                        href={`/sol-hair-closet/pedidos?email=${encodeURIComponent(emailInput)}&token=${encodeURIComponent(devToken)}`}
                        className="font-mono text-[11px] underline font-bold"
                      >
                        Clique aqui para visualizar pedidos com o token gerado →
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Opção 1: Já tenho conta */}
                <div className="p-6 rounded-2xl border border-line bg-cream/20 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink-deep flex items-center gap-2">
                      <LogIn size={18} className="text-copper" /> Já tenho conta
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Acesse com seu e-mail e senha para visualizar todos os pedidos e gerenciar seus endereços.
                    </p>
                  </div>
                  <Link
                    to="/sol-hair-closet/conta"
                    className="w-full rounded-full bg-ink-deep py-3 text-xs tracking-wider font-semibold text-cream hover:bg-copper transition text-center mt-4"
                  >
                    ENTRAR NA CONTA
                  </Link>
                </div>

                {/* Opção 2: Comprei sem cadastro (Magic Link) */}
                <div className="p-6 rounded-2xl border border-line bg-cream/20 space-y-3">
                  <h3 className="font-serif text-lg font-bold text-ink-deep flex items-center gap-2">
                    <Mail size={18} className="text-copper" /> Comprei sem conta
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Digite seu e-mail de compra para receber um link de acesso temporário e seguro:
                  </p>
                  <form onSubmit={handleRequestMagicLink} className="space-y-3 pt-1">
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full rounded-xl border border-line bg-warm-white px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                    />
                    <button
                      type="submit"
                      disabled={requestingLink}
                      className="w-full rounded-full bg-copper py-2.5 text-xs tracking-wider font-semibold text-warm-white hover:bg-copper/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {requestingLink ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                      ENVIAR LINK DE ACESSO
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
