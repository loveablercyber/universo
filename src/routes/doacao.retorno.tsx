import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Heart, Sparkles } from "lucide-react";

export const Route = createFileRoute("/doacao/retorno")({
  head: () => ({
    meta: [
      { title: "Resultado da Doação | Projeto Elo – Universo Carol Sol" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DoacaoRetornoPage,
});

type StatusData = {
  ok: boolean;
  status: "paid" | "failed" | "pending";
  amount?: number;
  donorName?: string;
  message?: string;
};

function DoacaoRetornoPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retries, setRetries] = useState(0);

  const checkoutRef =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("checkout_ref")
      : null;

  useEffect(() => {
    if (!checkoutRef) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function checkStatus() {
      try {
        const response = await fetch(
          `/api/donation?checkout_ref=${encodeURIComponent(checkoutRef!)}`,
        );
        const result = await response.json();

        if (!isMounted) return;

        if (response.ok && result.ok) {
          setData(result);
          if (result.status === "pending" && retries < 5) {
            setTimeout(() => {
              if (isMounted) setRetries((r) => r + 1);
            }, 3000);
          } else {
            setLoading(false);
          }
        } else {
          setData({
            ok: false,
            status: "failed",
            message: result.message || "Erro ao consultar checkout.",
          });
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setData({ ok: false, status: "failed", message: "Erro de conexão ao verificar doação." });
        setLoading(false);
      }
    }

    void checkStatus();

    return () => {
      isMounted = false;
    };
  }, [checkoutRef, retries]);

  return (
    <main className="theme-elo min-h-screen bg-cream text-brown-dark flex flex-col justify-between">
      {/* Top Bar */}
      <div className="bg-warm-white border-b border-border-soft">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
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

      {/* Main Content */}
      <div className="my-auto py-12 px-6">
        <div className="mx-auto max-w-lg rounded-3xl border border-border-soft bg-warm-white p-8 shadow-xl text-center sm:p-10">
          {loading ? (
            <div className="py-8 space-y-4">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-copper/30 border-t-copper" />
              <h2 className="font-serif text-3xl">Verificando pagamento...</h2>
              <p className="text-sm text-text-soft">
                Estamos confirmando a sua doação junto à SumUp. Aguarde um instante.
              </p>
            </div>
          ) : !checkoutRef || !data || data.status === "failed" ? (
            <div className="py-6 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <XCircle size={36} strokeWidth={1.5} />
              </div>
              <h2 className="font-serif text-3xl text-brown-dark">
                Não foi possível concluir a doação
              </h2>
              <p className="text-sm text-text-soft leading-relaxed">
                {data?.message ||
                  "O pagamento foi cancelado ou não pôde ser confirmado pela SumUp."}
              </p>
              <div className="pt-4">
                <Link
                  to="/doacao"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-copper px-6 font-sans-brand text-xs font-semibold tracking-[0.2em] text-white shadow-md transition hover:shadow-lg"
                >
                  TENTAR NOVAMENTE
                </Link>
              </div>
            </div>
          ) : data.status === "pending" ? (
            <div className="py-6 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Clock size={36} strokeWidth={1.5} />
              </div>
              <h2 className="font-serif text-3xl text-brown-dark">Pagamento em processamento</h2>
              <p className="text-sm text-text-soft leading-relaxed">
                O pagamento foi iniciado, mas ainda aguarda a confirmação final da operadora. Se
                você já concluiu no app/SumUp, a confirmação ocorrerá em breve.
              </p>
              <div className="pt-4">
                <Link
                  to="/projeto-elo"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-copper/10 border border-copper/30 px-6 font-sans-brand text-xs font-semibold tracking-[0.2em] text-copper hover:bg-copper/20 transition"
                >
                  VOLTAR AO PROJETO ELO
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-6 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={36} strokeWidth={1.5} />
              </div>
              <h2 className="font-serif text-4xl text-brown-dark">Muito obrigado!</h2>
              <p className="font-script text-3xl text-copper">
                Sua doação foi recebida com sucesso.
              </p>

              {data.amount && (
                <div className="my-4 inline-block rounded-2xl bg-cream/60 px-6 py-3 border border-border-soft">
                  <span className="text-xs uppercase tracking-wider text-text-soft block">
                    Valor doado
                  </span>
                  <span className="font-serif text-3xl font-semibold text-brown-dark">
                    R$ {data.amount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}

              <p className="text-sm text-text-soft leading-relaxed">
                {data.donorName ? `${data.donorName}, seu` : "Seu"} apoio faz toda a diferença para
                continuar transformando vidas através da autoestima e do acolhimento.
              </p>

              <div className="pt-4">
                <Link
                  to="/projeto-elo"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-copper px-8 font-sans-brand text-xs font-semibold tracking-[0.2em] text-white shadow-md transition hover:shadow-lg"
                >
                  <Heart size={16} strokeWidth={1.5} /> VOLTAR AO PROJETO ELO
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-cream border-t border-border-soft">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-2 px-6 py-5 text-center">
          <p className="font-sans-brand text-[10px] tracking-[0.25em] text-brown-mid">
            © {new Date().getFullYear()} Universo Carol Sol · Todos os direitos reservados
          </p>
        </div>
      </div>
    </main>
  );
}
