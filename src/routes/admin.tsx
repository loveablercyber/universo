import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Database,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  KeyRound,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";

type User = { id: string; email: string; fullName: string; role: string };
type Summary = {
  users: { total: number; active: number };
  sessions: { active: number };
  audit: { total: number };
};
type Section =
  | "overview"
  | "pages"
  | "media"
  | "elo"
  | "store"
  | "academy"
  | "notifications"
  | "modules"
  | "settings"
  | "audit"
  | "users";
import { CmsEditor } from "@/components/admin/CmsEditor";
import { CmsVersionHistory } from "@/components/admin/CmsVersionHistory";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { EloManager } from "@/components/admin/EloManager";
import { UserManager } from "@/components/admin/UserManager";
import { StoreManager } from "@/components/admin/StoreManager";
import { AcademyManager } from "@/components/admin/AcademyManager";
import { NotificationManager } from "@/components/admin/NotificationManager";
import { Image as ImageIcon, GraduationCap, Bell } from "lucide-react";
type Page = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  content: Record<string, unknown>;
  seo: Record<string, unknown>;
};

type Module = {
  key: "site" | "elo" | "store" | "academy";
  name: string;
  description?: string;
  status: "planned" | "development" | "active" | "paused";
  baseUrl?: string;
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

async function readPayload(response: Response) {
  const type = response.headers.get("content-type") ?? "";
  return type.includes("application/json")
    ? response.json()
    : { ok: false, message: await response.text() };
}

function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [sectionData, setSectionData] = useState<Record<string, unknown>>({});
  const [sectionLoading, setSectionLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  async function loadSummary() {
    const response = await fetch("/api/admin/summary");
    if (!response.ok) return setSummary(null);
    const payload = await response.json();
    setSummary(payload.summary);
  }

  async function loadSection(nextSection: Section) {
    setSection(nextSection);
    setNotice("");
    setError("");
    if (nextSection === "overview") return loadSummary();

    // These modules load their own data and must not be sent to the generic
    // admin endpoint, which only serves settings, modules and audit records.
    if (["media", "elo", "store", "academy", "notifications", "users"].includes(nextSection)) {
      setSectionData({});
      setSectionLoading(false);
      return;
    }

    setSectionLoading(true);
    try {
      const endpoint =
        nextSection === "pages" ? "/api/admin/cms" : `/api/admin/data?section=${nextSection}`;
      const response = await fetch(endpoint);
      const payload = await readPayload(response);
      if (!response.ok) throw new Error(payload.message);
      setSectionData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Não foi possível carregar os dados.",
      );
    } finally {
      setSectionLoading(false);
    }
  }

  async function save(body: Record<string, unknown>) {
    setNotice("");
    setError("");
    const isCmsAction = body.action === "save-page" || body.action === "restore-version";
    const response = await fetch(isCmsAction ? "/api/admin/cms" : "/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(payload.message ?? "Não foi possível salvar.");
    setNotice("Alterações salvas com segurança.");
    await loadSection(section);
    return payload;
  }

  useEffect(() => {
    async function initialize() {
      try {
        const response = await fetch("/api/auth");
        const payload = await readPayload(response);
        setUser(payload.user ?? null);
        if (payload.user) await loadSummary();
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
    try {
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
      const payload = await readPayload(response);
      if (!response.ok) return setError(payload.message ?? "Não foi possível entrar.");
      setUser(payload.user);
      await loadSummary();
    } catch {
      setError("Não foi possível conectar ao painel. Tente novamente.");
    }
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

  if (loading)
    return <main className="grid min-h-screen place-items-center bg-cream">Carregando…</main>;

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream px-5">
        <section className="w-full max-w-md rounded-[2rem] border border-copper/20 bg-white p-8 shadow-xl">
          <p className="text-[10px] tracking-[0.3em] text-copper">UNIVERSO CAROL SOL</p>
          <h1 className="mt-3 font-serif text-4xl text-brown">Painel administrativo</h1>
          <p className="mt-3 text-sm leading-relaxed text-brown/70">
            Acesse a gestão segura do ecossistema Carol Sol.
          </p>
          <form className="mt-8 space-y-4" onSubmit={login} autoComplete="off">
            <Field
              label="E-mail"
              name="email"
              type="email"
              autoComplete="off"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              data-1p-ignore
              data-lpignore="true"
              required
            />
            <Field
              label="Senha"
              name="password"
              type="password"
              autoComplete="new-password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              data-1p-ignore
              data-lpignore="true"
              required
            />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-copper text-xs font-semibold tracking-[0.18em] text-white"
            >
              ENTRAR
            </button>
            <Link
              to="/redefinir-senha"
              className="block text-center text-xs text-copper hover:underline"
            >
              Esqueci minha senha
            </Link>
          </form>
        </section>
      </main>
    );
  }

  const navigation = [
    { key: "overview" as const, label: "Visão geral", icon: LayoutDashboard },
    { key: "pages" as const, label: "Conteúdo do site", icon: FileText },
    { key: "media" as const, label: "Mídias", icon: ImageIcon },
    { key: "elo" as const, label: "Projeto Elo", icon: HeartHandshake },
    { key: "store" as const, label: "Loja Virtual", icon: ShoppingBag },
    { key: "academy" as const, label: "Academy / EAD", icon: GraduationCap },
    { key: "notifications" as const, label: "Notificações", icon: Bell },
    { key: "modules" as const, label: "Módulos", icon: Database },
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "settings" as const, label: "Configurações", icon: Settings },
    { key: "audit" as const, label: "Auditoria", icon: ShieldCheck },
  ];

  return (
    <main className="min-h-screen bg-[#f6f1eb] text-brown">
      <div className="min-h-screen lg:grid lg:grid-cols-[270px_1fr]">
        <aside className="bg-ink px-5 py-6 text-white lg:min-h-screen">
          <p className="text-[9px] tracking-[0.28em] text-copper-light">UNIVERSO CAROL SOL</p>
          <h1 className="mt-1 font-serif text-2xl">Administração</h1>
          <nav className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {navigation.map((item) => (
              <button
                key={item.key}
                onClick={() => void loadSection(item.key)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-xs transition ${
                  section === item.key ? "bg-copper text-white" : "text-white/70 hover:bg-white/10"
                }`}
              >
                <item.icon size={17} /> {item.label}
              </button>
            ))}
          </nav>
          <button
            onClick={logout}
            className="mt-8 inline-flex items-center gap-2 text-xs text-white/60"
          >
            <LogOut size={16} /> Sair
          </button>
        </aside>
        <div className="min-w-0 px-5 py-7 sm:px-8 lg:px-10">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-brown/55">Olá, {user.fullName}</p>
              <h2 className="font-serif text-3xl">
                {navigation.find((item) => item.key === section)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPasswordChange(true)}
                className="inline-flex items-center gap-2 rounded-full border border-copper/20 bg-white px-4 py-2 text-[10px] uppercase tracking-wider transition hover:border-copper hover:text-copper"
              >
                <KeyRound size={14} /> Alterar minha senha
              </button>
              <span className="rounded-full border border-copper/20 bg-white px-4 py-2 text-[10px] uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          </header>
          {error && <Message tone="error">{error}</Message>}
          {notice && <Message>{notice}</Message>}
          <div className="mt-7">
            {sectionLoading ? (
              <div className="rounded-2xl bg-white p-8">Carregando dados…</div>
            ) : (
              <SectionContent section={section} summary={summary} data={sectionData} save={save} />
            )}
          </div>
        </div>
      </div>
      {showPasswordChange && (
        <ChangePasswordModal
          onClose={() => setShowPasswordChange(false)}
          onChanged={() => {
            setShowPasswordChange(false);
            setUser(null);
            setSummary(null);
          }}
        />
      )}
    </main>
  );
}

function ChangePasswordModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (newPassword !== confirmation)
      return setError("A confirmação não corresponde à nova senha.");
    if (currentPassword === newPassword)
      return setError("A nova senha deve ser diferente da senha atual.");

    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change-own-password", currentPassword, newPassword }),
      });
      const payload = await readPayload(response);
      if (!response.ok) throw new Error(payload.message || "Não foi possível alterar a senha.");
      window.alert("Senha alterada. Entre novamente com sua nova senha.");
      onChanged();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-copper">Segurança</p>
            <h3 className="font-serif text-2xl text-brown">Alterar minha senha</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-brown/50 hover:bg-copper/10"
          >
            <X size={19} />
          </button>
        </header>
        <form onSubmit={submit} className="space-y-4 p-6">
          <Field
            label="Senha atual"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <Field
            label="Nova senha"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          <Field
            label="Confirmar nova senha"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          <p className="text-xs leading-relaxed text-brown/55">
            Use pelo menos 12 caracteres. Após a alteração, todas as sessões serão encerradas.
          </p>
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-brown/60">
              Cancelar
            </button>
            <button
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-copper px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <KeyRound size={16} /> {loading ? "Alterando..." : "Alterar senha"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SectionContent({
  section,
  summary,
  data,
  save,
}: {
  section: Section;
  summary: Summary | null;
  data: Record<string, unknown>;
  save: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  if (section === "overview") {
    const cards = [
      { label: "Usuários", value: summary?.users.total ?? "—", icon: Users },
      { label: "Usuários ativos", value: summary?.users.active ?? "—", icon: ShieldCheck },
      { label: "Sessões ativas", value: summary?.sessions.active ?? "—", icon: Activity },
      { label: "Eventos auditados", value: summary?.audit.total ?? "—", icon: Database },
    ];
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-copper/10 bg-white p-6">
              <card.icon className="h-6 w-6 text-copper" strokeWidth={1.5} />
              <p className="mt-5 font-serif text-4xl">{card.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-brown/55">
                {card.label}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <StatusCard
            icon={HeartHandshake}
            title="Projeto Elo"
            text="Gestão de participantes disponível."
          />
          <StatusCard
            icon={ShoppingBag}
            title="Loja"
            text="Estrutura isolada preparada para evolução."
          />
          <StatusCard
            icon={BookOpen}
            title="Academy"
            text="Estrutura isolada preparada para evolução."
          />
        </div>
      </>
    );
  }

  if (section === "media") {
    return <MediaLibrary />;
  }

  if (section === "pages") {
    return <CmsSectionView data={data} save={save} />;
  }

  if (section === "elo") {
    return <EloManager />;
  }

  if (section === "store") {
    return <StoreManager />;
  }

  if (section === "academy") {
    return <AcademyManager />;
  }

  if (section === "notifications") {
    return <NotificationManager />;
  }

  if (section === "users") {
    return <UserManager />;
  }

  if (section === "modules") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {((data.modules ?? []) as Module[]).map((module) => (
          <form
            key={module.key}
            className="rounded-2xl border border-copper/10 bg-white p-6"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void save({
                action: "save-module",
                key: module.key,
                status: form.get("status"),
                baseUrl: form.get("baseUrl"),
              });
            }}
          >
            <h3 className="font-serif text-2xl">{module.name}</h3>
            <p className="mt-1 min-h-10 text-sm text-brown/60">{module.description}</p>
            <div className="mt-5 grid gap-4">
              <Select
                label="Fase"
                name="status"
                defaultValue={module.status}
                options={moduleOptions}
              />
              <Field
                label="Endereço do módulo"
                name="baseUrl"
                type="url"
                defaultValue={module.baseUrl ?? ""}
              />
            </div>
            <SaveButton />
          </form>
        ))}
      </div>
    );
  }

  if (section === "settings") {
    return (
      <div className="grid gap-4">
        {(
          (data.settings ?? []) as Array<{ key: string; value: unknown; description?: string }>
        ).map((setting) => (
          <form
            key={setting.key}
            className="rounded-2xl border border-copper/10 bg-white p-6"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              try {
                void save({
                  action: "save-setting",
                  key: setting.key,
                  value: JSON.parse(String(form.get("value"))),
                });
              } catch {
                window.alert("O conteúdo precisa estar em formato JSON válido.");
              }
            }}
          >
            <h3 className="font-serif text-xl">{setting.key}</h3>
            <p className="mt-1 text-xs text-brown/55">{setting.description}</p>
            <TextArea
              label="Configuração"
              name="value"
              defaultValue={JSON.stringify(setting.value, null, 2)}
              className="font-mono"
            />
            <SaveButton />
          </form>
        ))}
      </div>
    );
  }

  const audit = (data.audit ?? []) as Array<{
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    actorName?: string;
    createdAt: string;
  }>;
  return (
    <div className="overflow-hidden rounded-2xl border border-copper/10 bg-white">
      <div className="divide-y divide-copper/10">
        {audit.length === 0 && (
          <p className="p-5 text-sm text-brown/60">Nenhum evento registrado.</p>
        )}
        {audit.map((event) => (
          <div key={event.id} className="grid gap-2 p-5 md:grid-cols-[1fr_auto]">
            <div>
              <p className="font-medium">{event.action}</p>
              <p className="text-xs text-brown/55">
                {event.entityType} {event.entityId ? `· ${event.entityId}` : ""}
              </p>
            </div>
            <p className="text-xs text-brown/55">
              {event.actorName ?? "Sistema"} · {new Date(event.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <input
        {...props}
        className={`mt-2 h-11 w-full rounded-xl border border-copper/20 bg-cream/30 px-4 outline-none focus:border-copper ${className}`}
      />
    </label>
  );
}

function TextArea({
  label,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="mt-4 block text-xs font-medium">
      {label}
      <textarea
        {...props}
        rows={5}
        className={`mt-2 w-full rounded-xl border border-copper/20 bg-cream/30 p-4 outline-none focus:border-copper ${className}`}
      />
    </label>
  );
}

function Select({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <select
        {...props}
        className="mt-2 h-11 w-full rounded-xl border border-copper/20 bg-white px-3 outline-none focus:border-copper"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveButton({ label = "SALVAR" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-copper px-5 text-[10px] font-semibold tracking-wider text-white"
    >
      <Save size={14} /> {label}
    </button>
  );
}

function Message({
  children,
  tone = "success",
}: {
  children: React.ReactNode;
  tone?: "success" | "error";
}) {
  return (
    <p
      className={`mt-5 rounded-xl px-4 py-3 text-sm ${tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}
    >
      {children}
    </p>
  );
}

function StatusCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Database;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-copper/10 bg-white p-6">
      <Icon className="text-copper" />
      <h3 className="mt-4 font-serif text-xl">{title}</h3>
      <p className="mt-1 text-sm text-brown/60">{text}</p>
    </article>
  );
}

function CmsSectionView({
  data,
  save,
}: {
  data: Record<string, unknown>;
  save: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const pages = (data.pages ?? []) as Page[];
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const activePage = selectedPage || pages[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {pages.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPage(p)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activePage?.id === p.id
                ? "bg-copper text-white"
                : "bg-white text-brown/70 hover:bg-cream/40"
            }`}
          >
            {p.title} ({p.slug})
          </button>
        ))}
      </div>

      {activePage && (
        <CmsEditor
          key={activePage.id}
          pageId={activePage.id}
          initialTitle={activePage.title}
          initialStatus={activePage.status}
          initialContent={(activePage.content as Record<string, unknown>) || { sections: [] }}
          initialSeo={activePage.seo || {}}
          onSave={save}
          onViewHistory={() => setShowHistory(true)}
        />
      )}

      {showHistory && activePage && (
        <CmsVersionHistory
          pageId={activePage.id}
          onClose={() => setShowHistory(false)}
          onRestore={async (versionNumber) => {
            await save({
              action: "restore-version",
              pageId: activePage.id,
              versionId: versionNumber,
            });
          }}
        />
      )}
    </div>
  );
}

const statusOptions = [
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" },
];
const moduleOptions = [
  { value: "planned", label: "Planejado" },
  { value: "development", label: "Em desenvolvimento" },
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
];
