import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { User, LogIn, UserPlus, LogOut, Package, MapPin, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { StoreLayout } from "@/components/store/StoreLayout";

export const Route = createFileRoute("/sol-hair-closet/conta")({
  component: CustomerAccountPage,
});

function CustomerAccountPage() {
  const store = useStore();

  const [customer, setCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    document: "",
  });

  const loadCustomer = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store-customer");
      const data = await res.json();
      if (res.ok && data.ok && data.customer) {
        setCustomer(data.customer);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomer();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/store-customer?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess("Login realizado com sucesso!");
        await loadCustomer();
      } else {
        setError(data.message || "E-mail ou senha incorretos.");
      }
    } catch {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/store-customer?action=register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess("Conta criada com sucesso!");
        await loadCustomer();
      } else {
        setError(data.message || "Erro ao criar conta.");
      }
    } catch {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/store-customer?action=logout", { method: "POST" });
      setCustomer(null);
      setSuccess("Você saiu da sua conta.");
    } catch {
      /* ignore */
    }
  };

  return (
    <StoreLayout storeState={store}>
      <div className="container-shell py-12">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-text-secondary">
              <Loader2 size={32} className="animate-spin text-copper mb-3" />
              <p className="text-xs font-medium">Carregando dados da conta...</p>
            </div>
          ) : customer ? (
            /* Painel do Cliente Logado */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-line">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-copper text-warm-white grid place-items-center font-serif text-2xl font-bold shadow-md">
                    {customer.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="font-serif text-2xl text-ink-deep font-bold">
                      Olá, {customer.fullName}!
                    </h1>
                    <p className="text-xs text-text-secondary">{customer.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-text-secondary hover:text-[#B7476A] hover:bg-blush transition flex items-center gap-1.5"
                >
                  <LogOut size={14} /> Sair
                </button>
              </div>

              {/* Ações Rápidas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  to="/sol-hair-closet/pedidos"
                  className="p-6 rounded-3xl border border-line bg-warm-white hover:border-copper transition group shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-full bg-blush grid place-items-center text-copper">
                      <Package size={20} />
                    </div>
                    <span className="text-xs text-copper group-hover:translate-x-1 transition font-bold">
                      Acessar →
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink-deep">Meus Pedidos</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Acompanhe o status e rastreamento de suas encomendas.
                    </p>
                  </div>
                </Link>

                <Link
                  to="/sol-hair-closet/favoritos"
                  className="p-6 rounded-3xl border border-line bg-warm-white hover:border-copper transition group shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-full bg-blush grid place-items-center text-[#B7476A]">
                      <User size={20} />
                    </div>
                    <span className="text-xs text-copper group-hover:translate-x-1 transition font-bold">
                      Acessar →
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink-deep">Lista de Favoritos</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Produtos que você salvou para comprar.
                    </p>
                  </div>
                </Link>
              </div>

              {/* Informações Cadastrais */}
              <div className="rounded-3xl border border-line bg-warm-white p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold tracking-wider uppercase text-ink-deep">
                  Dados de Cadastro
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-text-secondary">Nome:</p>
                    <p className="font-semibold text-ink-deep mt-0.5">{customer.fullName}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">E-mail:</p>
                    <p className="font-semibold text-ink-deep mt-0.5">{customer.email}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Telefone / WhatsApp:</p>
                    <p className="font-semibold text-ink-deep mt-0.5">{customer.phone || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">CPF:</p>
                    <p className="font-semibold text-ink-deep mt-0.5">{customer.document || "Não informado"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Telas de Login / Cadastro */
            <div className="rounded-3xl border border-line bg-warm-white p-8 shadow-sm">
              <div className="flex justify-center border-b border-line mb-8">
                <button
                  onClick={() => {
                    setActiveTab("login");
                    setError("");
                    setSuccess("");
                  }}
                  className={`pb-4 px-6 text-xs tracking-wider uppercase font-bold transition border-b-2 ${
                    activeTab === "login"
                      ? "border-copper text-copper"
                      : "border-transparent text-text-secondary hover:text-ink-deep"
                  }`}
                >
                  <LogIn size={16} className="inline mr-2" /> Entrar
                </button>
                <button
                  onClick={() => {
                    setActiveTab("register");
                    setError("");
                    setSuccess("");
                  }}
                  className={`pb-4 px-6 text-xs tracking-wider uppercase font-bold transition border-b-2 ${
                    activeTab === "register"
                      ? "border-copper text-copper"
                      : "border-transparent text-text-secondary hover:text-ink-deep"
                  }`}
                >
                  <UserPlus size={16} className="inline mr-2" /> Criar Conta
                </button>
              </div>

              {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-[#2E7D32] flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {activeTab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">E-mail</label>
                    <input
                      required
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      placeholder="seuemail@exemplo.com"
                      className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-4 py-3 text-xs outline-none focus:border-copper"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Senha</label>
                    <input
                      required
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="Sua senha"
                      className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-4 py-3 text-xs outline-none focus:border-copper"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-ink-deep py-3.5 text-xs tracking-widest font-semibold text-cream hover:bg-copper transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                    ENTRAR NA CONTA
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Nome Completo *</label>
                    <input
                      required
                      value={registerForm.fullName}
                      onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                      placeholder="Nome e Sobrenome"
                      className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-4 py-3 text-xs outline-none focus:border-copper"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">E-mail *</label>
                    <input
                      required
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      placeholder="seuemail@exemplo.com"
                      className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-4 py-3 text-xs outline-none focus:border-copper"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">WhatsApp / Telefone *</label>
                    <input
                      required
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-4 py-3 text-xs outline-none focus:border-copper"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">CPF *</label>
                    <input
                      required
                      value={registerForm.document}
                      onChange={(e) => setRegisterForm({ ...registerForm, document: e.target.value })}
                      placeholder="000.000.000-00"
                      className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-4 py-3 text-xs outline-none focus:border-copper"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Senha * (mínimo 12 caracteres)</label>
                    <input
                      required
                      type="password"
                      minLength={12}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      placeholder="Crie uma senha segura (mínimo 12 caracteres)"
                      className="mt-1 w-full rounded-xl border border-line bg-blush/30 px-4 py-3 text-xs outline-none focus:border-copper"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-ink-deep py-3.5 text-xs tracking-widest font-semibold text-cream hover:bg-copper transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    CRIAR MINHA CONTA
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
