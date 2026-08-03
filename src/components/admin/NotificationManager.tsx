import { useState, useEffect } from "react";
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Filter,
  Search,
  Server,
} from "lucide-react";

type NotificationLog = {
  id: string;
  channel: "email" | "whatsapp";
  recipient: string;
  subject?: string;
  templateName: string;
  status: "sent" | "failed" | "queued";
  payload: Record<string, unknown>;
  errorMessage?: string;
  sentAt: string;
};

type Stats = {
  total: number;
  email: number;
  whatsapp: number;
  failed: number;
  emailDriver: string;
  whatsappDriver: string;
};

export function NotificationManager() {
  const [history, setHistory] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "email" | "whatsapp">("all");
  const [showTestModal, setShowTestModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resH, resS] = await Promise.all([
        fetch("/api/admin/notifications?action=history"),
        fetch("/api/admin/notifications?action=stats"),
      ]);

      const dataH = await resH.json();
      const dataS = await resS.json();

      if (!resH.ok) throw new Error(dataH.message || "Erro ao carregar histórico");

      setHistory(dataH.history || []);
      setStats(dataS.stats || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredHistory = history.filter((item) => {
    const matchesChannel = channelFilter === "all" || item.channel === channelFilter;
    const matchesQuery =
      item.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subject && item.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.templateName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesChannel && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-copper/10">
        <div>
          <h2 className="font-serif text-2xl font-bold text-brown">
            Central de Notificações Transacionais
          </h2>
          <p className="text-xs text-brown/60">
            Envio e histórico de e-mails e mensagens de WhatsApp em tempo real
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="h-10 px-4 flex items-center gap-2 rounded-xl border border-copper/20 text-xs font-semibold text-brown hover:bg-cream/40 transition"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <button
            onClick={() => setShowTestModal(true)}
            className="h-10 px-4 flex items-center gap-2 rounded-xl bg-copper text-xs font-semibold text-white hover:bg-copper-dark transition"
          >
            <Send size={15} /> Disparar Teste
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-copper/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brown/50">
            Total de Envíos
          </span>
          <p className="font-serif text-3xl font-bold text-brown">{stats?.total ?? 0}</p>
          <span className="text-[10px] text-brown/50">Histórico acumulado</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-copper/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-copper">
            E-mails Disparados
          </span>
          <p className="font-serif text-3xl font-bold text-copper">{stats?.email ?? 0}</p>
          <span className="text-[10px] text-copper/70 font-mono">Driver: {stats?.emailDriver}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-copper/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            WhatsApp Enviados
          </span>
          <p className="font-serif text-3xl font-bold text-emerald-600">{stats?.whatsapp ?? 0}</p>
          <span className="text-[10px] text-emerald-700/70 font-mono">
            Driver: {stats?.whatsappDriver}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-copper/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
            Falhas / Erros
          </span>
          <p className="font-serif text-3xl font-bold text-amber-600">{stats?.failed ?? 0}</p>
          <span className="text-[10px] text-amber-700/70">Falhas de conexão</span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-copper/10">
        <div className="flex gap-2">
          <button
            onClick={() => setChannelFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              channelFilter === "all"
                ? "bg-copper text-white"
                : "bg-cream/40 text-brown/70 hover:bg-cream"
            }`}
          >
            Todos os Canais
          </button>
          <button
            onClick={() => setChannelFilter("email")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              channelFilter === "email"
                ? "bg-copper text-white"
                : "bg-cream/40 text-brown/70 hover:bg-cream"
            }`}
          >
            <Mail size={14} /> E-mail
          </button>
          <button
            onClick={() => setChannelFilter("whatsapp")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              channelFilter === "whatsapp"
                ? "bg-copper text-white"
                : "bg-cream/40 text-brown/70 hover:bg-cream"
            }`}
          >
            <MessageSquare size={14} /> WhatsApp
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brown/40" size={15} />
          <input
            type="text"
            placeholder="Buscar por e-mail, telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-copper/20 bg-cream/30 pl-9 pr-4 text-xs outline-none focus:border-copper"
          />
        </div>
      </div>

      {/* Tabela de Histórico de Notificações */}
      <div className="overflow-hidden rounded-2xl border border-copper/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream/30 text-xs uppercase text-brown/60">
              <tr>
                <th className="px-6 py-4 font-medium">Canal</th>
                <th className="px-6 py-4 font-medium">Destinatário</th>
                <th className="px-6 py-4 font-medium">Template / Assunto</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Data / Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-copper/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-brown/60">
                    Carregando histórico...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-brown/60">
                    Nenhuma notificação encontrada no histórico.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-cream/20 transition">
                    <td className="px-6 py-4">
                      {item.channel === "email" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                          <Mail size={13} /> E-mail
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                          <MessageSquare size={13} /> WhatsApp
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-brown">{item.recipient}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-brown">
                        {item.subject || item.templateName}
                      </p>
                      <p className="text-[10px] text-brown/50 uppercase font-mono">
                        {item.templateName}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {item.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                          <CheckCircle2 size={15} /> Enviado
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-red-600 text-xs font-bold"
                          title={item.errorMessage}
                        >
                          <AlertCircle size={15} /> Falha
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-brown/60">
                      {new Date(item.sentAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Disparar Teste */}
      {showTestModal && (
        <SendTestModal
          onClose={() => setShowTestModal(false)}
          onSuccess={() => {
            loadData();
            setShowTestModal(false);
          }}
        />
      )}
    </div>
  );
}

function SendTestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test",
          channel,
          recipient: form.get("recipient"),
          subject: form.get("subject"),
          message: form.get("message"),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || json.message || "Erro no envio");

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no envio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="font-serif text-2xl text-brown">Disparar Notificação de Teste</h3>

        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">Canal de Envio</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`py-2 rounded-xl text-xs font-bold border ${
                  channel === "email"
                    ? "bg-copper text-white border-copper"
                    : "border-copper/20 text-brown/70"
                }`}
              >
                E-mail
              </button>
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`py-2 rounded-xl text-xs font-bold border ${
                  channel === "whatsapp"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-copper/20 text-brown/70"
                }`}
              >
                WhatsApp
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">
              {channel === "email" ? "E-mail do Destinatário" : "Número de WhatsApp (com DDD)"}
            </label>
            <input
              name="recipient"
              required
              placeholder={channel === "email" ? "teste@carolsol.com.br" : "14999999999"}
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-xs outline-none focus:border-copper"
            />
          </div>

          {channel === "email" && (
            <div>
              <label className="text-xs font-medium block mb-1">Assunto do E-mail</label>
              <input
                name="subject"
                defaultValue="Teste de Notificação | Universo Carol Sol"
                className="w-full h-10 rounded-xl border border-copper/20 px-3 text-xs outline-none focus:border-copper"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1">Mensagem do Teste</label>
            <textarea
              name="message"
              required
              rows={3}
              defaultValue="Esta é uma mensagem de teste enviada pela Central de Notificações do Universo Carol Sol."
              className="w-full rounded-xl border border-copper/20 p-3 text-xs outline-none focus:border-copper"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-copper text-white text-xs font-bold disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Confirmar Envio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
