import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Filter, Download, Activity, Heart, Users, X } from "lucide-react";
import { EloParticipantDetail } from "./EloParticipantDetail";
import { csvCell } from "@/lib/elo";

type Participant = {
  id: string;
  kind: "donor" | "beneficiary" | "volunteer" | "partner";
  fullName: string;
  email?: string;
  phone?: string;
  status: string;
  createdAt: string;
  assignedToName?: string;
  publicReference?: string;
};

type Stats = {
  donors: number;
  beneficiaries: number;
  volunteers: number;
  partners: number;
  totalDonations: number;
  openRequests: number;
  urgentRequests: number;
  pendingCheckouts: number;
};

export function EloManager() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Filters
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set("action", "list");
      if (kindFilter) query.set("kind", kindFilter);
      if (statusFilter) query.set("status", statusFilter);
      if (searchQuery) query.set("search", searchQuery);

      const [resList, resStats] = await Promise.all([
        fetch(`/api/admin/elo?${query.toString()}`),
        fetch(`/api/admin/elo?action=stats`),
      ]);

      const payloadList = await resList.json();
      const payloadStats = await resStats.json();

      if (!resList.ok) throw new Error(payloadList.message || "Erro ao carregar participantes");

      setParticipants(payloadList.participants);
      if (resStats.ok) setStats(payloadStats.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [kindFilter, searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleExport = () => {
    if (participants.length === 0) return;
    const headers = [
      "Tipo",
      "Nome",
      "Email",
      "Telefone",
      "Status",
      "Data de Cadastro",
      "Responsável",
    ];
    const rows = participants.map((p) =>
      [
        p.kind,
        p.fullName,
        p.email,
        p.phone,
        p.status,
        new Date(p.createdAt).toLocaleDateString("pt-BR"),
        p.assignedToName,
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob(["\uFEFF", headers.map(csvCell).join(","), "\n", rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `elo_participantes_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-copper/10 bg-white p-6">
              <Heart className="h-6 w-6 text-copper" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-3xl">{stats.donors}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55">Doadores</p>
            </div>
            <div className="rounded-2xl border border-copper/10 bg-white p-6">
              <Users className="h-6 w-6 text-copper" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-3xl">{stats.beneficiaries}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55">Beneficiários</p>
            </div>
            <div className="rounded-2xl border border-copper/10 bg-white p-6">
              <Activity className="h-6 w-6 text-copper" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-3xl">{stats.volunteers}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55">Voluntários</p>
            </div>
            <div className="rounded-2xl border border-copper/10 bg-white p-6">
              <Users className="h-6 w-6 text-copper" strokeWidth={1.5} />
              <p className="mt-4 font-serif text-3xl">{stats.partners}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55">Parceiros</p>
            </div>
            <div className="rounded-2xl border border-copper/10 bg-white p-6">
              <p className="mt-4 font-serif text-3xl text-emerald-600 text-right">
                <span className="text-sm">R$</span>{" "}
                {stats.totalDonations.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55 text-right mt-1">
                Total Arrecadado
              </p>
            </div>
          </div>
          <div
            className={`rounded-2xl border p-4 text-sm ${stats.urgentRequests ? "border-red-200 bg-red-50 text-red-800" : "border-copper/10 bg-white text-brown/70"}`}
          >
            <strong>{stats.openRequests}</strong> solicitações abertas ou em andamento ·{" "}
            <strong>{stats.urgentRequests}</strong> urgentes ·{" "}
            <strong>{stats.pendingCheckouts}</strong> doações online aguardando pagamento
          </div>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between bg-white p-5 rounded-2xl border border-copper/10">
        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-brown/70 flex items-center gap-2 mb-1">
              <Search size={14} /> Busca
            </label>
            <input
              type="text"
              placeholder="Nome, contato ou protocolo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-copper/20 bg-cream/30 px-4 text-sm outline-none focus:border-copper"
            />
          </div>
          <div className="w-[150px]">
            <label className="text-xs font-medium text-brown/70 flex items-center gap-2 mb-1">
              <Filter size={14} /> Tipo
            </label>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-copper/20 bg-white px-3 text-sm outline-none focus:border-copper"
            >
              <option value="">Todos</option>
              <option value="donor">Doadores</option>
              <option value="beneficiary">Beneficiários</option>
              <option value="volunteer">Voluntários</option>
              <option value="partner">Parceiros</option>
            </select>
          </div>
          <div className="w-[150px]">
            <label className="text-xs font-medium text-brown/70 flex items-center gap-2 mb-1">
              <Filter size={14} /> Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-copper/20 bg-white px-3 text-sm outline-none focus:border-copper"
            >
              <option value="">Todos</option>
              <option value="new">Novo</option>
              <option value="reviewing">Em análise</option>
              <option value="approved">Aprovado</option>
              <option value="active">Ativo</option>
              <option value="completed">Concluído</option>
              <option value="rejected">Recusado</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            className="flex-1 sm:flex-none h-10 px-4 flex items-center justify-center gap-2 rounded-xl border border-copper/20 text-xs font-semibold text-copper hover:bg-copper/5 transition"
          >
            <Download size={16} /> Exportar CSV
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex-1 sm:flex-none h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-copper text-xs font-semibold text-white hover:bg-copper-dark transition"
          >
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-copper/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream/30 text-xs uppercase text-brown/60">
              <tr>
                <th className="px-6 py-4 font-medium">Nome / Contato</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-copper/10">
              {loading && participants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-brown/60">
                    Carregando...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-brown/60">
                    Nenhum participante encontrado.
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedId(p.id);
                    }}
                    tabIndex={0}
                    role="button"
                    className="group cursor-pointer hover:bg-cream/20 transition"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-brown group-hover:text-copper transition">
                        {p.fullName}
                      </p>
                      <p className="text-xs text-brown/55">{p.email || p.phone || "—"}</p>
                      {p.publicReference && (
                        <p className="mt-1 font-mono text-[10px] text-copper">
                          {p.publicReference.slice(0, 16)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] uppercase tracking-wider text-copper bg-copper/5 px-2 py-1 rounded-full">
                        {p.kind}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-brown/80">{p.status}</td>
                    <td className="px-6 py-4 text-brown/60">
                      {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-brown/60">{p.assignedToName || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        <EloParticipantDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={loadData}
        />
      )}
      {creating && (
        <ParticipantEditor
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void loadData();
          }}
        />
      )}
    </div>
  );
}

function ParticipantEditor({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/elo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-participant",
          kind: form.get("kind"),
          fullName: form.get("fullName"),
          email: form.get("email"),
          phone: form.get("phone"),
          document: form.get("document"),
          address: form.get("address"),
          status: form.get("status"),
          notes: form.get("notes"),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(payload.message || "Não foi possível salvar.");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-7 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-copper">PROJETO ELO</p>
            <h2 className="font-serif text-3xl">Novo participante</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <EditorField name="fullName" label="Nome completo" required />
          <label className="text-xs font-medium">
            Tipo
            <select
              name="kind"
              className="mt-1 h-11 w-full rounded-xl border border-copper/20 px-3"
            >
              <option value="donor">Doador</option>
              <option value="beneficiary">Beneficiário</option>
              <option value="volunteer">Voluntário</option>
              <option value="partner">Parceiro</option>
            </select>
          </label>
          <EditorField name="email" label="E-mail" type="email" />
          <EditorField name="phone" label="Telefone" />
          <EditorField name="document" label="Documento" />
          <EditorField name="address" label="Endereço" />
          <label className="text-xs font-medium">
            Status
            <select
              name="status"
              defaultValue="new"
              className="mt-1 h-11 w-full rounded-xl border border-copper/20 px-3"
            >
              <option value="new">Novo</option>
              <option value="reviewing">Em análise</option>
              <option value="approved">Aprovado</option>
              <option value="active">Ativo</option>
              <option value="completed">Concluído</option>
              <option value="rejected">Recusado</option>
            </select>
          </label>
          <label className="text-xs font-medium sm:col-span-2">
            Observações
            <textarea
              name="notes"
              rows={4}
              maxLength={5000}
              className="mt-1 w-full rounded-xl border border-copper/20 p-3"
            />
          </label>
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border px-5 py-3 text-xs">
            Cancelar
          </button>
          <button
            disabled={saving}
            className="rounded-xl bg-copper px-5 py-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Criar participante"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditorField(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string },
) {
  const { label, ...inputProps } = props;
  return (
    <label className="text-xs font-medium">
      {label}
      <input {...inputProps} className="mt-1 h-11 w-full rounded-xl border border-copper/20 px-3" />
    </label>
  );
}
