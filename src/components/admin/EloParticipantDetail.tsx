import { useState, useEffect } from "react";
import { X, Save, FileText, File, Download, UserPlus, Heart, FileArchive } from "lucide-react";

type ParticipantDetailProps = {
  id: string;
  onClose: () => void;
  onUpdate: () => void;
};

export function EloParticipantDetail({ id, onClose, onUpdate }: ParticipantDetailProps) {
  const [data, setData] = useState<{
    participant: Record<string, unknown>;
    history: Record<string, unknown>[];
    donations: Record<string, unknown>[];
    requests: Record<string, unknown>[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "history" | "donations" | "requests">("info");

  async function loadData() {
    try {
      const res = await fetch(`/api/admin/elo?action=detail&id=${id}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao carregar detalhes");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Carregando detalhes...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return null;

  const { participant, history, donations, requests } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-copper/20">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-brown">{participant.fullName}</h2>
            <p className="text-xs text-brown/60 uppercase tracking-wider">
              {participant.kind} • {participant.status}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-brown/50 hover:bg-copper/10 hover:text-brown transition"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex border-b border-copper/10 bg-cream/10 px-4">
          {[
            { id: "info", label: "Dados Pessoais", icon: FileText },
            { id: "history", label: "Histórico", icon: FileArchive },
            { id: "donations", label: "Doações", icon: Heart },
            { id: "requests", label: "Solicitações", icon: UserPlus },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "info" | "history" | "donations" | "requests")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition ${
                activeTab === tab.id
                  ? "border-copper text-copper"
                  : "border-transparent text-brown/60 hover:text-brown"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === "info" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-serif text-xl border-b border-copper/10 pb-2">Informações</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-xs text-brown/60">E-mail</span>
                    {participant.email || "—"}
                  </div>
                  <div>
                    <span className="block text-xs text-brown/60">Telefone</span>
                    {participant.phone || "—"}
                  </div>
                  <div>
                    <span className="block text-xs text-brown/60">Documento</span>
                    {participant.document || "—"}
                  </div>
                  <div>
                    <span className="block text-xs text-brown/60">Endereço</span>
                    {participant.address || "—"}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-serif text-xl border-b border-copper/10 pb-2">Sistema</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-xs text-brown/60">Criado em</span>
                    {new Date(participant.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                  <div>
                    <span className="block text-xs text-brown/60">Responsável</span>
                    {participant.assignedToName || "Nenhum"}
                  </div>
                  <div className="col-span-2">
                    <span className="block text-xs text-brown/60">LGPD</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-wider ${participant.lgpdAccepted ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                    >
                      {participant.lgpdAccepted ? "Aceito" : "Pendente"}
                    </span>
                  </div>
                </div>
              </div>

              {participant.notes && (
                <div className="col-span-2 mt-4 rounded-xl bg-cream/30 p-4">
                  <span className="block text-xs font-semibold text-brown/60 mb-1">
                    Observações internas
                  </span>
                  <p className="text-sm whitespace-pre-wrap">{participant.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-sm text-brown/60">Nenhum histórico registrado.</p>
              ) : (
                <div className="relative border-l-2 border-copper/20 ml-3 space-y-6">
                  {history.map((h) => (
                    <div key={h.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-copper" />
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{h.action}</span>
                        <span className="text-xs text-brown/50">
                          {new Date(h.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-xs text-brown/60 mt-1">Por {h.createdBy}</p>
                      {h.notes && (
                        <p className="mt-2 text-sm bg-cream/30 p-3 rounded-xl">{h.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "donations" && (
            <div className="space-y-4">
              {donations.length === 0 ? (
                <p className="text-sm text-brown/60">Nenhuma doação registrada.</p>
              ) : (
                <div className="divide-y divide-copper/10 border border-copper/10 rounded-xl overflow-hidden">
                  {donations.map((d) => (
                    <div key={d.id} className="p-4 grid gap-2 sm:grid-cols-3 text-sm">
                      <div>
                        <span className="block font-medium">R$ {Number(d.amount).toFixed(2)}</span>
                        <span className="text-xs text-brown/60">
                          {new Date(d.donationDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div>
                        <span className="block">{d.paymentMethod}</span>
                        <span
                          className={`text-[10px] uppercase tracking-wider ${
                            d.status === "completed" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <div className="text-right">
                        {d.receiptUrl && (
                          <a
                            href={d.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-copper hover:underline text-xs flex items-center justify-end gap-1"
                          >
                            <Download size={14} /> Recibo
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "requests" && (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <p className="text-sm text-brown/60">Nenhuma solicitação pendente.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="border border-copper/10 rounded-xl p-4 bg-white shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-brown">{r.title}</h4>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                            r.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : r.priority === "high"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-cream text-brown"
                          }`}
                        >
                          {r.priority}
                        </span>
                      </div>
                      <p className="text-xs text-brown/70 mb-3">{r.description}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-brown/50">
                          {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="font-medium text-copper uppercase tracking-wider">
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
