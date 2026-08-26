import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Heart, Send, ShieldCheck } from "lucide-react";
import {
  eloParticipationLabels,
  eloParticipationTypes,
  type EloParticipationType,
} from "@/lib/elo";

export const Route = createFileRoute("/projeto-elo/participar")({
  validateSearch: (search: Record<string, unknown>) => ({
    tipo: eloParticipationTypes.includes(search.tipo as EloParticipationType)
      ? (search.tipo as EloParticipationType)
      : ("hair_donation" as EloParticipationType),
  }),
  head: () => ({
    meta: [
      { title: "Participar | Projeto Elo – Universo Carol Sol" },
      {
        name: "description",
        content: "Doe cabelo, solicite atendimento, seja voluntário ou parceiro do Projeto Elo.",
      },
    ],
  }),
  component: EloParticipationPage,
});

function EloParticipationPage() {
  const search = Route.useSearch();
  const [type, setType] = useState<EloParticipationType>(search.tipo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/elo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participationType: type,
          fullName: form.get("fullName"),
          email: form.get("email"),
          phone: form.get("phone"),
          city: form.get("city"),
          state: form.get("state"),
          availability: form.get("availability"),
          message: form.get("message"),
          website: form.get("website"),
          lgpdAccepted: form.get("lgpdAccepted") === "on",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(payload.message || "Não foi possível enviar.");
      setReference(payload.reference);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="theme-elo min-h-screen bg-cream px-5 py-10 text-brown-dark sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/projeto-elo"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-copper"
        >
          <ArrowLeft size={15} /> VOLTAR AO PROJETO ELO
        </Link>

        <section className="mt-7 overflow-hidden rounded-3xl border border-border-soft bg-warm-white shadow-xl">
          <header className="bg-gradient-copper px-7 py-10 text-center text-white sm:px-12">
            <Heart className="mx-auto h-9 w-9" strokeWidth={1.3} />
            <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Faça parte desta história</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/90">
              Sua solicitação entra diretamente na central do Projeto Elo e recebe acompanhamento da
              equipe.
            </p>
          </header>

          {reference ? (
            <div className="px-7 py-14 text-center sm:px-12">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" strokeWidth={1.4} />
              <h2 className="mt-5 font-serif text-3xl">Cadastro recebido</h2>
              <p className="mt-3 text-sm text-text-soft">
                Nossa equipe analisará as informações e entrará em contato pelos dados informados.
              </p>
              <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-copper/20 bg-cream/50 px-5 py-4">
                <span className="block text-[10px] tracking-[0.2em] text-text-soft">PROTOCOLO</span>
                <strong className="mt-1 block font-mono text-lg text-copper">{reference}</strong>
              </div>
              <Link
                to="/projeto-elo"
                className="mt-8 inline-flex rounded-full bg-copper px-7 py-3 text-xs font-semibold tracking-[0.18em] text-white"
              >
                VOLTAR AO PROJETO
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6 px-7 py-9 sm:px-12">
              <div>
                <label className="text-xs font-semibold tracking-wide">
                  COMO DESEJA PARTICIPAR?
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {eloParticipationTypes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setType(option)}
                      className={`rounded-2xl border px-4 py-4 text-left text-sm transition ${
                        type === option
                          ? "border-copper bg-copper/10 font-semibold text-copper"
                          : "border-border-soft hover:border-copper/40"
                      }`}
                    >
                      {eloParticipationLabels[option]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome completo" name="fullName" required maxLength={160} />
                <Field label="Telefone/WhatsApp" name="phone" inputMode="tel" maxLength={40} />
                <Field label="E-mail" name="email" type="email" maxLength={254} />
                <div className="grid grid-cols-[1fr_90px] gap-3">
                  <Field label="Cidade" name="city" maxLength={100} />
                  <Field label="UF" name="state" maxLength={2} />
                </div>
              </div>

              {type === "volunteer" && (
                <Field
                  label="Disponibilidade ou área em que deseja ajudar"
                  name="availability"
                  maxLength={500}
                />
              )}

              <label className="block">
                <span className="text-xs font-semibold tracking-wide">
                  {type === "beneficiary_request"
                    ? "CONTE COMO PODEMOS AJUDAR"
                    : "CONTE UM POUCO SOBRE SUA PARTICIPAÇÃO"}
                </span>
                <textarea
                  name="message"
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-border-soft bg-cream/25 p-4 text-sm outline-none focus:border-copper"
                />
              </label>

              <input name="website" tabIndex={-1} autoComplete="off" className="hidden" />

              <label className="flex items-start gap-3 rounded-2xl bg-cream/45 p-4 text-xs leading-relaxed text-text-soft">
                <input
                  name="lgpdAccepted"
                  type="checkbox"
                  required
                  className="mt-1 accent-copper"
                />
                <span>
                  Autorizo o tratamento dos dados para análise e contato sobre o Projeto Elo,
                  conforme a{" "}
                  <Link to="/politica-de-privacidade" className="text-copper underline">
                    Política de Privacidade
                  </Link>
                  .
                </span>
              </label>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-copper text-xs font-semibold tracking-[0.2em] text-white disabled:opacity-60"
              >
                <Send size={16} /> {loading ? "ENVIANDO..." : "ENVIAR PARA O PROJETO ELO"}
              </button>
              <p className="flex items-center justify-center gap-2 text-center text-[11px] text-text-soft">
                <ShieldCheck size={14} /> Dados protegidos e acessíveis somente à equipe autorizada.
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-wide">{label.toUpperCase()}</span>
      <input
        name={name}
        {...props}
        className="mt-2 h-12 w-full rounded-xl border border-border-soft bg-cream/25 px-4 text-sm outline-none focus:border-copper"
      />
    </label>
  );
}
