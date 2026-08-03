import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { KeyRound, Mail, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha | Universo Carol Sol" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PasswordRecoveryPage,
});

function PasswordRecoveryPage() {
  const token =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("token") || "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (token && password !== confirmation) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          token
            ? { action: "reset-password", token, password }
            : { action: "request-password-reset", email: form.get("email") },
        ),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível concluir.");
      setMessage(token ? "Senha alterada. Você já pode entrar novamente." : payload.message);
      event.currentTarget.reset();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível concluir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 py-10 text-brown">
      <section className="w-full max-w-md rounded-[2rem] border border-copper/20 bg-white p-8 shadow-xl">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-copper/10 text-copper">
          {message ? <CheckCircle2 /> : token ? <KeyRound /> : <Mail />}
        </div>
        <p className="mt-5 text-[10px] tracking-[0.25em] text-copper">UNIVERSO CAROL SOL</p>
        <h1 className="mt-2 font-serif text-3xl">
          {token ? "Criar nova senha" : "Recuperar acesso"}
        </h1>
        <p className="mt-2 text-sm text-brown/65">
          {token
            ? "Escolha uma senha segura com pelo menos 12 caracteres."
            : "Informe seu e-mail para receber um link válido por 30 minutos."}
        </p>
        {message ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            {token ? (
              <>
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  required
                  autoComplete="new-password"
                  placeholder="Nova senha"
                  className="h-11 w-full rounded-xl border border-copper/20 px-4 text-sm"
                />
                <input
                  name="confirmation"
                  type="password"
                  minLength={12}
                  required
                  autoComplete="new-password"
                  placeholder="Confirmar nova senha"
                  className="h-11 w-full rounded-xl border border-copper/20 px-4 text-sm"
                />
              </>
            ) : (
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="h-11 w-full rounded-xl border border-copper/20 px-4 text-sm"
              />
            )}
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              disabled={loading}
              className="h-11 w-full rounded-xl bg-copper text-xs font-semibold tracking-wider text-white disabled:opacity-50"
            >
              {loading ? "PROCESSANDO..." : token ? "SALVAR NOVA SENHA" : "ENVIAR INSTRUÇÕES"}
            </button>
          </form>
        )}
        <Link
          to="/admin"
          className="mt-6 inline-block text-xs font-semibold text-copper hover:underline"
        >
          Voltar ao acesso
        </Link>
      </section>
    </main>
  );
}
