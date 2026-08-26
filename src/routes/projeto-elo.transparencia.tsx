import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, HandHeart, Heart, Users } from "lucide-react";

type ImpactStats = {
  completedDonations: number;
  totalRaised: number;
  beneficiariesSupported: number;
  activeVolunteers: number;
  activePartners: number;
};

export const Route = createFileRoute("/projeto-elo/transparencia")({
  head: () => ({
    meta: [
      { title: "Transparência | Projeto Elo – Universo Carol Sol" },
      { name: "description", content: "Indicadores operacionais públicos do Projeto Elo." },
    ],
  }),
  component: EloTransparencyPage,
});

function EloTransparencyPage() {
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/elo", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.message || "Falha ao carregar.");
        setStats(payload.stats);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Falha ao carregar.");
      });
    return () => controller.abort();
  }, []);

  const cards = [
    { label: "Doações financeiras confirmadas", value: stats?.completedDonations, icon: Heart },
    {
      label: "Total arrecadado",
      value: stats
        ? stats.totalRaised.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : undefined,
      icon: HandHeart,
    },
    {
      label: "Beneficiárias com ciclo concluído",
      value: stats?.beneficiariesSupported,
      icon: Users,
    },
    { label: "Voluntários ativos", value: stats?.activeVolunteers, icon: Users },
    { label: "Parceiros ativos", value: stats?.activePartners, icon: HandHeart },
  ];

  return (
    <main className="theme-elo min-h-screen bg-cream px-6 py-10 text-brown-dark">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/projeto-elo"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-copper"
        >
          <ArrowLeft size={15} /> VOLTAR AO PROJETO ELO
        </Link>
        <header className="mt-9 text-center">
          <p className="text-xs tracking-[0.28em] text-copper">PRESTAÇÃO DE CONTAS</p>
          <h1 className="mt-3 font-serif text-5xl">Transparência que fortalece elos</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text-soft">
            Os indicadores abaixo vêm dos registros confirmados no sistema. Cadastros em análise e
            pagamentos pendentes não entram nos totais.
          </p>
        </header>

        {error ? (
          <p className="mt-10 rounded-2xl bg-red-50 p-5 text-center text-sm text-red-700">
            {error}
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-border-soft bg-warm-white p-6 text-center shadow-sm"
              >
                <card.icon className="mx-auto h-7 w-7 text-copper" strokeWidth={1.4} />
                <strong className="mt-4 block font-serif text-3xl">{card.value ?? "—"}</strong>
                <span className="mt-2 block text-[11px] leading-relaxed text-text-soft">
                  {card.label}
                </span>
              </article>
            ))}
          </div>
        )}

        <section className="mt-10 rounded-3xl border border-border-soft bg-warm-white p-8 sm:p-10">
          <h2 className="font-serif text-3xl">Critérios dos indicadores</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-text-soft">
            <li>• Valores financeiros incluem somente doações com pagamento concluído.</li>
            <li>
              • Beneficiárias são contabilizadas após o ciclo de atendimento ser marcado como
              concluído.
            </li>
            <li>
              • Voluntários e parceiros aparecem somente enquanto estiverem com cadastro ativo.
            </li>
            <li>• Informações pessoais, documentos e relatos nunca são publicados nesta página.</li>
          </ul>
          <p className="mt-6 text-sm text-text-soft">
            Para solicitar relatórios ou esclarecer a utilização dos recursos, escreva para{" "}
            <a className="text-copper underline" href="mailto:ola@carolsol.com.br">
              ola@carolsol.com.br
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
