import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ArrowLeft, Shield, Lock, CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/doacao")({
  head: () => ({
    meta: [
      { title: "Fazer uma Doação | Projeto Elo – Universo Carol Sol" },
      {
        name: "description",
        content:
          "Doe para o Projeto Elo e ajude a transformar vidas através da autoestima, acolhimento e cuidado capilar.",
      },
      { property: "og:title", content: "Doar ao Projeto Elo | Universo Carol Sol" },
      {
        property: "og:description",
        content: "Sua doação transforma vidas. Contribua com qualquer valor via pagamento seguro.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.carolsol.com.br/doacao" }],
  }),
  component: DoacaoPage,
});

const PRESET_VALUES = [20, 50, 100, 200];

function DoacaoPage() {
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorMessage, setDonorMessage] = useState("");
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedAmount = amount ?? (customAmount ? parseFloat(customAmount) : 0);
  const canSubmit = selectedAmount >= 5 && lgpdAccepted && !loading;

  async function handleDonate() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/donation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedAmount,
          donorName: donorName || undefined,
          donorEmail: donorEmail || undefined,
          donorMessage: donorMessage || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Não foi possível iniciar o pagamento.");
      }

      /* Redirect to SumUp hosted checkout */
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar doação.");
      setLoading(false);
    }
  }

  return (
    <main className="theme-elo min-h-screen bg-cream text-brown-dark">
      {/* ── Top bar ── */}
      <div className="bg-warm-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-3">
          <Link
            to="/projeto-elo"
            className="flex items-center gap-2 font-sans-brand text-[11px] tracking-[0.2em] text-copper transition hover:text-brown-dark"
          >
            <ArrowLeft size={14} /> VOLTAR AO PROJETO ELO
          </Link>
          <p className="font-sans-brand text-[10px] tracking-[0.3em] text-copper/70">
            UNIVERSO <Sparkles className="mx-0.5 inline h-2.5 w-2.5" strokeWidth={1.5} /> CAROL SOL
          </p>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-copper py-16 text-white sm:py-20">
        <Heart
          className="pointer-events-none absolute -left-10 top-1/2 h-48 w-48 -translate-y-1/2 text-white/10"
          strokeWidth={0.6}
        />
        <Heart
          className="pointer-events-none absolute -right-8 bottom-0 h-32 w-32 text-white/10"
          strokeWidth={0.6}
        />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <p className="font-sans-brand text-[11px] tracking-[0.3em]">
            SUA DOAÇÃO TRANSFORMA VIDAS
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">
            Faça parte desta
            <br />
            corrente do bem
          </h1>
          <p className="mt-4 font-sans-brand text-sm leading-relaxed text-white/90">
            Cada contribuição ao Projeto Elo ajuda a devolver autoestima, acolhimento e dignidade a
            pessoas em situação de vulnerabilidade.
          </p>
        </div>
      </section>

      {/* ── Donation form ── */}
      <section className="relative -mt-8 pb-16">
        <div className="mx-auto max-w-xl px-6">
          <div className="rounded-3xl border border-border-soft bg-warm-white p-8 shadow-xl sm:p-10">
            {/* Amount presets */}
            <p className="text-center font-sans-brand text-[11px] tracking-[0.25em] text-brown-mid">
              ESCOLHA O VALOR DA SUA DOAÇÃO
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PRESET_VALUES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setAmount(v);
                    setCustomAmount("");
                  }}
                  className={`rounded-2xl border-2 py-4 text-center font-serif text-2xl transition ${
                    amount === v
                      ? "border-copper bg-copper/10 text-copper"
                      : "border-border-soft bg-cream/30 text-brown-dark hover:border-copper/40"
                  }`}
                >
                  <span className="text-sm">R$</span> {v}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="mt-4">
              <label className="block text-center text-xs text-text-soft">
                ou digite um valor personalizado
              </label>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-soft">
                  R$
                </span>
                <input
                  type="number"
                  min="5"
                  max="10000"
                  step="0.01"
                  placeholder="0,00"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setAmount(null);
                  }}
                  className="h-14 w-full rounded-2xl border-2 border-border-soft bg-cream/30 pl-12 pr-4 text-center font-serif text-3xl outline-none transition focus:border-copper"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="mx-auto my-8 flex items-center justify-center gap-2">
              <span className="block h-px w-12 bg-line-soft" />
              <Heart className="h-3 w-3 text-copper" strokeWidth={1.5} />
              <span className="block h-px w-12 bg-line-soft" />
            </div>

            {/* Optional fields */}
            <p className="text-center font-sans-brand text-[11px] tracking-[0.25em] text-brown-mid">
              SEUS DADOS <span className="text-text-soft">(OPCIONAL)</span>
            </p>

            <div className="mt-5 space-y-4">
              <input
                type="text"
                placeholder="Seu nome"
                maxLength={160}
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="h-12 w-full rounded-xl border border-border-soft bg-cream/30 px-4 text-sm outline-none transition focus:border-copper"
              />
              <input
                type="email"
                placeholder="Seu e-mail"
                maxLength={254}
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-border-soft bg-cream/30 px-4 text-sm outline-none transition focus:border-copper"
              />
              <textarea
                placeholder="Deixe uma mensagem de carinho para o projeto..."
                maxLength={500}
                rows={3}
                value={donorMessage}
                onChange={(e) => setDonorMessage(e.target.value)}
                className="w-full rounded-xl border border-border-soft bg-cream/30 p-4 text-sm outline-none transition focus:border-copper"
              />
            </div>

            {/* LGPD consent */}
            <label className="mt-6 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={lgpdAccepted}
                onChange={(e) => setLgpdAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 accent-copper"
              />
              <span className="text-xs leading-relaxed text-text-soft">
                Concordo com a{" "}
                <Link to="/politica-de-privacidade" className="text-copper underline">
                  Política de Privacidade
                </Link>{" "}
                e autorizo o tratamento dos dados informados conforme a LGPD, exclusivamente para
                fins de registro e comunicação desta doação.
              </span>
            </label>

            {/* Error */}
            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            {/* Submit */}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleDonate}
              className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-copper font-sans-brand text-[12px] font-semibold tracking-[0.2em] text-white shadow-lg transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  PROCESSANDO...
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4" strokeWidth={1.5} />
                  DOAR R$ {selectedAmount > 0 ? selectedAmount.toFixed(2).replace(".", ",") : "—"}
                </>
              )}
            </button>

            {/* Trust badges */}
            <div className="mt-6 flex items-center justify-center gap-6 text-text-soft">
              <span className="flex items-center gap-1.5 text-[10px] tracking-wider">
                <Lock size={13} strokeWidth={1.5} /> PAGAMENTO SEGURO
              </span>
              <span className="flex items-center gap-1.5 text-[10px] tracking-wider">
                <Shield size={13} strokeWidth={1.5} /> VIA SUMUP
              </span>
              <span className="flex items-center gap-1.5 text-[10px] tracking-wider">
                <CheckCircle2 size={13} strokeWidth={1.5} /> LGPD
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom bar ── */}
      <div className="bg-cream">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-2 px-6 py-5 text-center">
          <p className="font-sans-brand text-[10px] tracking-[0.25em] text-brown-mid">
            © {new Date().getFullYear()} Universo Carol Sol · Todos os direitos reservados
          </p>
        </div>
      </div>
    </main>
  );
}
