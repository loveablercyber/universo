import React, { useState, useEffect, useRef } from "react";
import { X, ShieldCheck, Truck, CreditCard, QrCode, AlertCircle, Loader2, Sparkles } from "lucide-react";
import type { CartItem } from "@/hooks/use-store";
import { FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_COST, PIX_DISCOUNT_PERCENT } from "@/hooks/use-store";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CheckoutModal({
  cart,
  onClose,
  onOrderSuccess,
}: {
  cart: CartItem[];
  onClose: () => void;
  onOrderSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [searchingCep, setSearchingCep] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  const [address, setAddress] = useState({
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const [customer, setCustomer] = useState({
    fullName: "",
    email: "",
    phone: "",
    document: "",
  });

  // Tentar carregar dados do cliente logado
  useEffect(() => {
    async function loadCustomer() {
      try {
        const res = await fetch("/api/store-customer");
        const data = await res.json();
        if (res.ok && data.ok && data.customer) {
          const c = data.customer;
          setCustomer({
            fullName: c.fullName || "",
            email: c.email || "",
            phone: c.phone || "",
            document: c.document || "",
          });
          if (c.defaultAddress) {
            setAddress((prev) => ({ ...prev, ...c.defaultAddress }));
          }
        }
      } catch {
        /* ignore */
      }
    }
    void loadCustomer();
  }, []);

  // Autocompletar CEP
  const handleCepChange = async (val: string) => {
    const cleanCep = val.replace(/\D/g, "");
    setAddress((prev) => ({ ...prev, zipCode: val }));

    if (cleanCep.length === 8) {
      setSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch {
        /* ignore */
      } finally {
        setSearchingCep(false);
      }
    }
  };

  const subtotal = cart.reduce((acc, item) => {
    const price = item.variant
      ? Number(item.variant.promotionalPriceOverride ?? item.variant.priceOverride ?? item.product.promotionalPrice ?? item.product.price)
      : Number(item.product.promotionalPrice ?? item.product.price);
    return acc + price * item.qty;
  }, 0);

  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST;
  const pixDiscount = paymentMethod === "pix" ? Number(((subtotal * PIX_DISCOUNT_PERCENT) / 100).toFixed(2)) : 0;
  const totalAmount = Math.max(0.01, subtotal + shippingCost - pixDiscount);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        idempotencyKey: idempotencyKey.current,
        customerName: customer.fullName.trim(),
        customerEmail: customer.email.trim(),
        customerPhone: customer.phone.trim(),
        customerDocument: customer.document.replace(/\D/g, ""),
        paymentMethod: paymentMethod === "pix" ? "pix" : "card",
        shippingAddress: {
          zipCode: address.zipCode.replace(/\D/g, ""),
          street: address.street.trim(),
          number: address.number.trim(),
          complement: address.complement.trim(),
          neighborhood: address.neighborhood.trim(),
          city: address.city.trim(),
          state: address.state.trim().toUpperCase(),
        },
        items: cart.map((i) => ({
          productId: i.product.id,
          variantId: i.variant?.id || null,
          productName: i.product.name,
          variantName: i.variant?.title || null,
          price: i.variant
            ? Number(i.variant.promotionalPriceOverride ?? i.variant.priceOverride ?? i.product.promotionalPrice ?? i.product.price)
            : Number(i.product.promotionalPrice ?? i.product.price),
          qty: i.qty,
        })),
      };

      const res = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok || !data.checkoutUrl) {
        throw new Error(data.message || "Não foi possível iniciar o pagamento.");
      }

      if (data.accessToken && data.orderNumber) {
        try {
          localStorage.setItem(`order_token_${data.orderNumber}`, data.accessToken);
        } catch {
          /* ignore */
        }
      }

      if (onOrderSuccess) onOrderSuccess();

      // Redirecionar para o Hosted Checkout seguro da SumUp
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar checkout.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-deep/70 backdrop-blur-sm overflow-y-auto">
      <div className="my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-warm-white shadow-2xl ring-1 ring-line">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-line bg-cream/40 px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-ink-deep font-bold">Finalizar Compra</h2>
            <p className="text-xs text-text-secondary">Preencha seus dados de entrega e pagamento</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-secondary hover:bg-blush hover:text-ink-deep transition"
          >
            <X size={20} />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dados Pessoais */}
          <div className="space-y-3">
            <h3 className="text-xs tracking-wider uppercase font-semibold text-ink-deep flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-copper text-warm-white grid place-items-center text-[10px]">1</span>
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-text-secondary">Nome Completo *</label>
                <input
                  required
                  value={customer.fullName}
                  onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                  placeholder="Nome e Sobrenome"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">E-mail *</label>
                <input
                  required
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="seuemail@exemplo.com"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">WhatsApp / Telefone *</label>
                <input
                  required
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">CPF *</label>
                <input
                  required
                  value={customer.document}
                  onChange={(e) => setCustomer({ ...customer, document: e.target.value })}
                  placeholder="000.000.000-00"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                />
              </div>
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div className="space-y-3 pt-4 border-t border-line">
            <h3 className="text-xs tracking-wider uppercase font-semibold text-ink-deep flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-copper text-warm-white grid place-items-center text-[10px]">2</span>
              Endereço de Entrega
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-text-secondary flex items-center justify-between">
                  <span>CEP *</span>
                  {searchingCep && <span className="text-[10px] text-copper">Buscando CEP...</span>}
                </label>
                <input
                  required
                  value={address.zipCode}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-text-secondary">Rua / Logradouro *</label>
                <input
                  required
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="Av. Paulista"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">Número *</label>
                <input
                  required
                  value={address.number}
                  onChange={(e) => setAddress({ ...address, number: e.target.value })}
                  placeholder="123"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">Complemento</label>
                <input
                  value={address.complement}
                  onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                  placeholder="Apto 45, Bloco B"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">Bairro *</label>
                <input
                  required
                  value={address.neighborhood}
                  onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                  placeholder="Bela Vista"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-text-secondary">Cidade *</label>
                <input
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="São Paulo"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-secondary">UF / Estado *</label>
                <input
                  required
                  maxLength={2}
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                  placeholder="SP"
                  className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-3.5 py-2.5 text-xs outline-none focus:border-copper text-center font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Opção de Pagamento */}
          <div className="space-y-3 pt-4 border-t border-line">
            <h3 className="text-xs tracking-wider uppercase font-semibold text-ink-deep flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-copper text-warm-white grid place-items-center text-[10px]">3</span>
              Forma de Pagamento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("pix")}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  paymentMethod === "pix"
                    ? "border-copper bg-copper/10 ring-2 ring-copper/30"
                    : "border-line bg-warm-white hover:border-copper/40"
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-copper text-cream grid place-items-center shrink-0">
                  <QrCode size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-ink-deep">PIX Instantâneo</p>
                    <span className="rounded bg-copper px-1.5 py-0.5 text-[9px] font-bold text-warm-white">
                      5% OFF
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Aprovação imediata e envio prioritário
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  paymentMethod === "card"
                    ? "border-copper bg-copper/10 ring-2 ring-copper/30"
                    : "border-line bg-warm-white hover:border-copper/40"
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-ink-deep text-cream grid place-items-center shrink-0">
                  <CreditCard size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-deep">Cartão de Crédito</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Parcele em até 12x no checkout seguro
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="rounded-2xl border border-line bg-cream/40 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal ({cart.reduce((a, b) => a + b.qty, 0)} itens)</span>
              <span className="font-semibold text-ink-deep">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Truck size={14} /> Frete
              </span>
              <span>
                {shippingCost === 0 ? (
                  <span className="font-bold text-[#2E7D32]">GRÁTIS</span>
                ) : (
                  fmt(shippingCost)
                )}
              </span>
            </div>
            {paymentMethod === "pix" && (
              <div className="flex justify-between text-copper font-medium">
                <span>Desconto Pix (5% OFF)</span>
                <span>-{fmt(pixDiscount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-line/60 flex justify-between items-baseline">
              <span className="font-bold text-sm text-ink-deep">Total a Pagar</span>
              <span className="font-serif text-2xl font-bold text-ink-deep">
                {fmt(totalAmount)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cart.length === 0}
            className="w-full rounded-full bg-ink-deep py-4 text-xs tracking-[0.25em] font-semibold text-cream hover:bg-copper transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> PROCESSANDO PEDIDO...
              </>
            ) : (
              <>IR PARA PAGAMENTO SEGURO NA SUMUP</>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-text-secondary">
            <ShieldCheck size={14} className="text-[#2E7D32]" />
            <span>Seus dados são criptografados. Pagamento protegido pelo SumUp Hosted Checkout.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
