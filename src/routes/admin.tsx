import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { Activity, Database, LogOut, ShieldCheck, Users } from "lucide-react";

type User = { id: string; email: string; fullName: string; role: string };
type Summary = {
  users: { total: number; active: number };
  sessions: { active: number };
  audit: { total: number };
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração | Universo Carol Sol" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSummary() {
    const response = await fetch("/api/admin/summary");
    if (!response.ok) {
      setSummary(null);
      return;
    }
    const payload = await response.json();
    setSummary(payload.summary);
  }

  useEffect(() => {
    async function initialize() {
      try {
        const response = await fetch("/api/auth");
        const payload = await response.json();
        setUser(payload.user ?? null);
        if (payload.user) {
          const summaryResponse = await fetch("/api/admin/summary");
          if (summaryResponse.ok) {
            const summaryPayload = await summaryResponse.json();
            setSummary(summaryPayload.summary);
          }
        }
      } catch {
        setError("O backend ainda não está conectado ao PostgreSQL.");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login",
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.message ?? "Não foi possível entrar.");
      return;
    }
    setUser(payload.user);
    await loadSummary();
  }

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    setSummary(null);
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-cream">Carregando…</main>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream px-5">
        <section className="w-full max-w-md rounded-[2rem] border border-copper/20 bg-white p-8 shadow-xl">
          <p className="text-[10px] tracking-[0.3em] text-copper">UNIVERSO CAROL SOL</p>
          <h1 className="mt-3 font-serif text-4xl text-brown">Painel administrativo</h1>
          <p className="mt-3 text-sm leading-relaxed text-brown/70">
            Entre com a conta administrativa criada na configuração do banco.
          </p>
          <form className="mt-8 space-y-4" onSubmit={login}>
            <label className="block text-xs font-medium text-brown">
              E-mail
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="mt-2 h-12 w-full rounded-xl border border-copper/25 bg-cream/40 px-4 outline-none focus:border-copper"
              />
            </label>
            <label className="block text-xs font-medium text-brown">
              Senha
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="current-password"
                className="mt-2 h-12 w-full rounded-xl border border-copper/25 bg-cream/40 px-4 outline-none focus:border-copper"
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button className="h-12 w-full rounded-xl bg-copper text-xs font-semibold tracking-[0.18em] text-white">
              ENTRAR
            </button>
          </form>
        </section>
      </main>
    );
  }

  const cards = [
    { label: "Usuários", value: summary?.users.total ?? "—", icon: Users },
    { label: "Usuários ativos", value: summary?.users.active ?? "—", icon: ShieldCheck },
    { label: "Sessões ativas", value: summary?.sessions.active ?? "—", icon: Activity },
    { label: "Registros de auditoria", value: summary?.audit.total ?? "—", icon: Database },
  ];

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-copper/15 bg-ink text-white">
        <div className="container-cs flex min-h-20 items-center justify-between gap-4">
          <div>
            <p className="text-[9px] tracking-[0.28em] text-copper-light">UNIVERSO CAROL SOL</p>
            <h1 className="font-serif text-2xl">Administração</h1>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 text-xs text-white/80">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>
      <div className="container-cs py-10">
        <p className="text-sm text-brown/70">
          Olá, {user.fullName}. Esta é a fundação administrativa dos novos módulos.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-copper/15 bg-white p-6">
              <card.icon className="h-6 w-6 text-copper" strokeWidth={1.5} />
              <p className="mt-5 font-serif text-4xl text-brown">{card.value}</p>
              <p className="mt-1 text-[10px] tracking-[0.18em] text-brown/60">{card.label}</p>
            </article>
          ))}
        </div>
        <section className="mt-8 rounded-2xl border border-copper/15 bg-white p-6">
          <h2 className="font-serif text-2xl text-brown">Próximos módulos</h2>
          <p className="mt-2 text-sm leading-relaxed text-brown/70">
            Catálogo e pedidos da Loja, cursos e matrículas da Academy e gestão de participantes do
            Projeto Elo serão conectados a esta base.
          </p>
        </section>
      </div>
    </main>
  );
}
