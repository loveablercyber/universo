import { useState, useEffect } from "react";
import { Plus, Search, Filter, Download, Activity, Heart, Users } from "lucide-react";
import { EloParticipantDetail } from "./EloParticipantDetail";

type Participant = {
  id: string;
  kind: "donor" | "beneficiary" | "volunteer" | "partner";
  fullName: string;
  email?: string;
  phone?: string;
  status: string;
  createdAt: string;
  assignedToName?: string;
};

type Stats = {
  donors: number;
  beneficiaries: number;
  volunteers: number;
  partners: number;
  totalDonations: number;
};

export function EloManager() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filters
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [kindFilter, statusFilter, searchQuery]);

  const handleExport = () => {
    // Generate simple CSV
    if (participants.length === 0) return;
    const headers = ["Tipo,Nome,Email,Telefone,Status,Data de Cadastro,Responsavel"];
    const rows = participants.map(
      (p) =>
        `${p.kind},"${p.fullName}","${p.email || ""}","${p.phone || ""}",${p.status},${new Date(p.createdAt).toLocaleDateString("pt-BR")},"${p.assignedToName || ""}"`,
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `elo_participantes_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="mt-4 font-serif text-3xl text-emerald-600 text-right">
              <span className="text-sm">R$</span>{" "}
              {stats.totalDonations.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-brown/55 text-right mt-1">
              Total Arrecadado
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between bg-white p-5 rounded-2xl border border-copper/10">
        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
          <div className="flex-1 min-w-[200px]">
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
          <button className="flex-1 sm:flex-none h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-copper text-xs font-semibold text-white hover:bg-copper-dark transition">
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
                    className="group cursor-pointer hover:bg-cream/20 transition"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-brown group-hover:text-copper transition">
                        {p.fullName}
                      </p>
                      <p className="text-xs text-brown/55">{p.email || p.phone || "—"}</p>
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
    </div>
  );
}
