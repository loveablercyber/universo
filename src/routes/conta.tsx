import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  HeartHandshake,
  Loader2,
  LogIn,
  LogOut,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { UniverseSwitcher } from "@/components/UniverseSwitcher";

type AccountUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  platformRole?: "admin" | "professional" | "client";
};

export const Route = createFileRoute("/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta | CarolSol" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountHub,
});

async function payload(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação.");
  return data;
}

function agendaPanel(role?: AccountUser["platformRole"]) {
  if (role === "admin") return "https://agenda.carolsol.com.br/admin/dashboard";
  if (role === "professional") return "https://agenda.carolsol.com.br/profissional/dashboard";
  return "https://agenda.carolsol.com.br/cliente/inicio";
}

function isCentralHost() {
  return typeof window === "undefined" || ["carolsol.com.br", "www.carolsol.com.br", "localhost"].includes(window.location.hostname);
}

function ssoUrl(targetOrigin: string, returnTo: string) {
  return `/api/auth?sso_start=${encodeURIComponent(targetOrigin)}&returnTo=${encodeURIComponent(returnTo)}`;
}

function AccountHub() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/auth")
      .then(payload)
      .then((data) => {
        const nextUser = data.user ?? null;
        setUser(nextUser);
        if (nextUser && !isCentralHost()) {
          window.location.replace(ssoUrl("https://carolsol.com.br", "/conta"));
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          identifier: form.get("identifier"),
          password: form.get("password"),
        }),
      }).then(payload);
      setUser(data.user);
      if (!isCentralHost()) {
        window.location.replace(ssoUrl("https://carolsol.com.br", "/conta"));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f3ed] text-[#3d2418]">
        <Loader2 className="animate-spin" aria-label="Carregando conta" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f3ed] text-[#3d2418]">
      <UniverseSwitcher />
      <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#b2744f]">
          UNIVERSO CAROL SOL
        </p>
        <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl">Minha conta CarolSol</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d2418]/65">
              Um único acesso para agendamentos, loja, cursos e Projeto Elo.
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#3d2418]/15 bg-white px-5 text-xs font-semibold"
            >
              <LogOut size={15} /> Sair
            </button>
          )}
        </div>

        {!user ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <form onSubmit={login} className="rounded-[2rem] border border-[#b2744f]/20 bg-white p-7 shadow-sm sm:p-9">
              <h2 className="font-serif text-3xl">Entrar</h2>
              <p className="mt-2 text-sm text-[#3d2418]/60">
                Use o mesmo e-mail, WhatsApp e senha de qualquer painel CarolSol.
              </p>
              <div className="mt-7 space-y-4">
                <label className="block text-xs font-semibold">
                  E-mail ou WhatsApp
                  <input
                    name="identifier"
                    required
                    autoComplete="username"
                    className="mt-2 h-12 w-full rounded-xl border border-[#3d2418]/15 bg-[#f8f3ed]/50 px-4 outline-none focus:border-[#b2744f]"
                  />
                </label>
                <label className="block text-xs font-semibold">
                  Senha
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="mt-2 h-12 w-full rounded-xl border border-[#3d2418]/15 bg-[#f8f3ed]/50 px-4 outline-none focus:border-[#b2744f]"
                  />
                </label>
              </div>
              {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button
                disabled={submitting}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#20130d] text-xs font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                Entrar na minha conta
              </button>
            </form>
            <aside className="rounded-[2rem] bg-[#20130d] p-7 text-white sm:p-9">
              <h2 className="font-serif text-3xl">Ainda não tem acesso?</h2>
              <p className="mt-4 text-sm leading-6 text-white/70">
                O cadastro único pode ser criado no Agenda. Depois, a mesma conta funciona em todos os módulos.
              </p>
              <a
                href="https://agenda.carolsol.com.br/cadastro"
                className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-[#c69255] px-6 text-xs font-semibold uppercase tracking-[0.14em] text-white"
              >
                Criar conta CarolSol
              </a>
            </aside>
          </div>
        ) : (
          <>
            <div className="mt-9 rounded-[2rem] border border-[#b2744f]/20 bg-white p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-[#b2744f]">Conta conectada</p>
              <h2 className="mt-2 font-serif text-3xl">Olá, {user.fullName}</h2>
              <p className="mt-1 text-sm text-[#3d2418]/60">{user.email}</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ModuleCard
                href={ssoUrl("https://agenda.carolsol.com.br", new URL(agendaPanel(user.platformRole)).pathname)}
                icon={<CalendarDays />}
                title="Agenda"
                description="Agendamentos, clientes e rotina de atendimento."
              />
              <ModuleCard
                href={ssoUrl("https://loja.carolsol.com.br", "/sol-hair-closet/conta")}
                icon={<ShoppingBag />}
                title="Sol Hair Closet"
                description="Pedidos, favoritos, endereços e compras."
              />
              <ModuleCard
                href={ssoUrl("https://academy.carolsol.com.br", "/invisible-academy/aluno")}
                icon={<BookOpen />}
                title="Invisible Academy"
                description="Cursos, aulas, progresso e certificados."
              />
              <ModuleCard
                href={ssoUrl("https://elo.carolsol.com.br", "/projeto-elo")}
                icon={<HeartHandshake />}
                title="Projeto Elo"
                description="Doações, participação e ações sociais."
              />
              {(user.role === "admin" || user.role === "manager") && (
                <ModuleCard
                  href="/admin"
                  icon={<Settings />}
                  title="Admin Universo"
                  description="Gestão da loja, Academy, Elo, conteúdo e usuários."
                />
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function ModuleCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  const className =
    "group rounded-[1.6rem] border border-[#3d2418]/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b2744f]/50";
  const content = (
    <>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f4e8dc] text-[#b2744f]">
        {icon}
      </span>
      <h3 className="mt-5 font-serif text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#3d2418]/60">{description}</p>
      <span className="mt-5 inline-block text-xs font-semibold uppercase tracking-[0.14em] text-[#b2744f]">
        Acessar →
      </span>
    </>
  );
  return <a href={href} className={className}>{content}</a>;
}
