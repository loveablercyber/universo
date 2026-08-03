import { useState, useEffect } from "react";
import { Search, ShieldAlert, Key, UserX, Shield, Edit3, X, Save } from "lucide-react";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  permissions: string[];
  createdAt: string;
  lastLoginAt: string;
};

export function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users?action=list");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao carregar usuários");
      setUsers(payload.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between bg-white p-5 rounded-2xl border border-copper/10">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <label className="text-xs font-medium text-brown/70 flex items-center gap-2 mb-1">
            <Search size={14} /> Busca
          </label>
          <input
            type="text"
            placeholder="Nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-copper/20 bg-cream/30 px-4 text-sm outline-none focus:border-copper"
          />
        </div>
        <button
          onClick={() => setEditingUser({} as User)}
          className="h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-copper text-xs font-semibold text-white hover:bg-copper-dark transition"
        >
          Novo Usuário
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-copper/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream/30 text-xs uppercase text-brown/60">
              <tr>
                <th className="px-6 py-4 font-medium">Usuário</th>
                <th className="px-6 py-4 font-medium">Perfil</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Último Acesso</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-copper/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-brown/60">
                    Carregando...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-brown/60">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-cream/20 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-brown">{u.fullName}</p>
                      <p className="text-xs text-brown/55">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] uppercase tracking-wider text-copper bg-copper/5 px-2 py-1 rounded-full">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                          u.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-brown/60">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("pt-BR") : "Nunca"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-2 text-brown/50 hover:text-copper transition rounded-full hover:bg-copper/10"
                      >
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <UserEditorModal
          user={editingUser.id ? editingUser : null}
          onClose={() => setEditingUser(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

function UserEditorModal({
  user,
  onClose,
  onUpdate,
}: {
  user: User | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);

    try {
      let res;
      if (user) {
        // Atualizar
        res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-user",
            id: user.id,
            fullName: form.get("fullName"),
            role: form.get("role"),
          }),
        });
      } else {
        // Criar
        res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-user",
            email: form.get("email"),
            fullName: form.get("fullName"),
            role: form.get("role"),
            password: form.get("password"),
            permissions: [],
          }),
        });
      }

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao salvar");
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    if (!user) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          id: user.id,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro");
      onUpdate();
      if (action !== "update-permissions") onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro desconhecido");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-copper/20">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <h2 className="font-serif text-2xl text-brown">
            {user ? "Editar Usuário" : "Novo Usuário"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-brown/50 hover:bg-copper/10 hover:text-brown transition"
          >
            <X size={20} />
          </button>
        </header>

        <div className="overflow-auto p-6">
          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

          <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nome Completo</label>
              <input
                name="fullName"
                defaultValue={user?.fullName}
                required
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper"
              />
            </div>
            {!user && (
              <div className="space-y-1">
                <label className="text-xs font-medium">E-mail</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium">Perfil de Acesso</label>
              <select
                name="role"
                defaultValue={user?.role || "operator"}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper"
              >
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="operator">Operador</option>
                <option value="donor">Doador</option>
                <option value="volunteer">Voluntário</option>
                <option value="beneficiary">Beneficiário</option>
              </select>
            </div>
            {!user && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Senha Provisória</label>
                <input
                  name="password"
                  required
                  minLength={12}
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper"
                />
              </div>
            )}
          </form>

          {user && (
            <div className="mt-8 pt-6 border-t border-copper/10 space-y-4">
              <h3 className="font-serif text-lg">Ações Avançadas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const newPassword = window.prompt(
                      "Digite uma nova senha provisória com pelo menos 12 caracteres:",
                    );
                    if (!newPassword) return;
                    if (newPassword.length < 12) {
                      window.alert("A senha precisa ter pelo menos 12 caracteres.");
                      return;
                    }
                    if (
                      !window.confirm("Confirmar a redefinição e encerrar as sessões do usuário?")
                    )
                      return;
                    void handleAction("reset-password", { newPassword });
                  }}
                  className="flex items-center gap-2 text-xs font-medium bg-cream/30 hover:bg-cream/50 p-3 rounded-xl transition"
                >
                  <Key size={16} className="text-copper" /> Resetar Senha
                </button>
                <button
                  onClick={() =>
                    handleAction(user.status === "blocked" ? "reactivate-user" : "block-user")
                  }
                  className="flex items-center gap-2 text-xs font-medium bg-cream/30 hover:bg-cream/50 p-3 rounded-xl transition"
                >
                  {user.status === "blocked" ? (
                    <>
                      <Shield size={16} className="text-emerald-600" /> Reativar Acesso
                    </>
                  ) : (
                    <>
                      <UserX size={16} className="text-red-600" /> Bloquear Acesso
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleAction("revoke-sessions")}
                  className="flex items-center gap-2 text-xs font-medium bg-cream/30 hover:bg-cream/50 p-3 rounded-xl transition sm:col-span-2"
                >
                  <ShieldAlert size={16} className="text-amber-600" /> Revogar Sessões Ativas
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-copper/10 bg-cream/10 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-brown/70 hover:text-brown transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-copper px-6 py-2 text-sm font-semibold text-white hover:bg-copper-dark transition"
          >
            <Save size={16} /> Salvar
          </button>
        </footer>
      </div>
    </div>
  );
}
