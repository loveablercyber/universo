import { useCallback, useEffect, useState } from "react";
import {
  Download,
  FileArchive,
  FileText,
  Heart,
  Paperclip,
  Plus,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

type Participant = {
  id: string;
  kind: "donor" | "beneficiary" | "volunteer" | "partner";
  fullName: string;
  email?: string;
  phone?: string;
  document?: string;
  address?: string;
  status: "new" | "reviewing" | "approved" | "active" | "completed" | "rejected";
  notes?: string;
  consentText?: string;
  lgpdAccepted: boolean;
  assignedTo?: string;
  assignedToName?: string;
  publicReference?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
};

type HistoryItem = {
  id: string;
  action: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
};
type Donation = {
  id: string;
  amount: number;
  donationDate: string;
  paymentMethod: string;
  status: "pending" | "completed" | "failed" | "refunded";
  receiptUrl?: string;
  notes?: string;
};
type EloRequest = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
};
type Attachment = {
  id: string;
  fileName: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};
type Assignee = { id: string; fullName: string; role: string };
type DetailData = {
  participant: Participant;
  history: HistoryItem[];
  donations: Donation[];
  requests: EloRequest[];
  attachments: Attachment[];
};

type Tab = "info" | "history" | "donations" | "requests" | "attachments";

export function EloParticipantDetail({
  id,
  onClose,
  onUpdate,
}: {
  id: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [detailResponse, assigneesResponse] = await Promise.all([
        fetch(`/api/admin/elo?action=detail&id=${id}`),
        fetch("/api/admin/elo?action=assignees"),
      ]);
      const payload = await detailResponse.json();
      if (!detailResponse.ok || !payload.ok)
        throw new Error(payload.message || "Erro ao carregar detalhes.");
      setData(payload);
      if (assigneesResponse.ok) {
        const assigneesPayload = await assigneesResponse.json();
        setAssignees(assigneesPayload.assignees || []);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar detalhes.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function mutate(body: Record<string, unknown> | FormData, successMessage: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const isForm = body instanceof FormData;
      const response = await fetch("/api/admin/elo", {
        method: "POST",
        headers: isForm ? undefined : { "Content-Type": "application/json" },
        body: isForm ? body : JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(payload.message || "Operação não concluída.");
      setNotice(successMessage);
      await loadData();
      onUpdate();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operação não concluída.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <Overlay>
        <p className="p-10 text-center">Carregando detalhes...</p>
      </Overlay>
    );
  if (!data)
    return (
      <Overlay>
        <div className="p-10 text-center text-red-700">
          {error || "Participante não encontrado."}
        </div>
      </Overlay>
    );

  const participant = data.participant;
  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "info", label: "Dados", icon: FileText },
    { id: "history", label: "Histórico", icon: FileArchive },
    { id: "donations", label: "Doações", icon: Heart },
    { id: "requests", label: "Solicitações", icon: UserPlus },
    { id: "attachments", label: "Anexos", icon: Paperclip },
  ];

  return (
    <Overlay>
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-copper/20">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-brown">{participant.fullName}</h2>
            <p className="text-xs uppercase tracking-wider text-brown/60">
              {participant.kind} • {participant.status}{" "}
              {participant.publicReference ? `• ${participant.publicReference.slice(0, 16)}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-2 hover:bg-copper/10"
          >
            <X size={20} />
          </button>
        </header>

        <nav className="flex overflow-x-auto border-b border-copper/10 bg-cream/10 px-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium ${
                activeTab === tab.id
                  ? "border-copper text-copper"
                  : "border-transparent text-brown/60"
              }`}
            >
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-auto p-6">
          {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && (
            <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>
          )}

          {activeTab === "info" && (
            <InfoTab
              key={participant.updatedAt}
              participant={participant}
              assignees={assignees}
              busy={busy}
              mutate={mutate}
              onDeleted={onClose}
            />
          )}
          {activeTab === "history" && (
            <HistoryTab participantId={id} history={data.history} busy={busy} mutate={mutate} />
          )}
          {activeTab === "donations" && (
            <DonationsTab
              participantId={id}
              donations={data.donations}
              busy={busy}
              mutate={mutate}
            />
          )}
          {activeTab === "requests" && (
            <RequestsTab participantId={id} requests={data.requests} busy={busy} mutate={mutate} />
          )}
          {activeTab === "attachments" && (
            <AttachmentsTab
              participantId={id}
              attachments={data.attachments}
              busy={busy}
              mutate={mutate}
            />
          )}
        </div>
      </div>
    </Overlay>
  );
}

type Mutate = (body: Record<string, unknown> | FormData, message: string) => Promise<boolean>;

function InfoTab({
  participant,
  assignees,
  busy,
  mutate,
  onDeleted,
}: {
  participant: Participant;
  assignees: Assignee[];
  busy: boolean;
  mutate: Mutate;
  onDeleted: () => void;
}) {
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate(
      {
        action: "save-participant",
        id: participant.id,
        kind: form.get("kind"),
        fullName: form.get("fullName"),
        email: form.get("email"),
        phone: form.get("phone"),
        document: form.get("document"),
        address: form.get("address"),
        status: form.get("status"),
        notes: form.get("notes"),
      },
      "Dados atualizados.",
    );
  }
  async function remove() {
    if (!window.confirm("Arquivar este participante? O histórico será preservado.")) return;
    if (
      await mutate({ action: "delete-participant", id: participant.id }, "Participante arquivado.")
    )
      onDeleted();
  }
  return (
    <div className="space-y-6">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Input name="fullName" label="Nome completo" defaultValue={participant.fullName} required />
        <Select name="kind" label="Tipo" defaultValue={participant.kind} options={kindOptions} />
        <Input name="email" label="E-mail" type="email" defaultValue={participant.email} />
        <Input name="phone" label="Telefone" defaultValue={participant.phone} />
        <Input name="document" label="Documento" defaultValue={participant.document} />
        <Input name="address" label="Endereço" defaultValue={participant.address} />
        <Select
          name="status"
          label="Status"
          defaultValue={participant.status}
          options={participantStatusOptions}
        />
        <label className="text-xs font-medium">
          Responsável
          <select
            value={participant.assignedTo || ""}
            onChange={(event) =>
              void mutate(
                {
                  action: "assign",
                  participantId: participant.id,
                  userId: event.target.value || null,
                },
                "Responsável atualizado.",
              )
            }
            disabled={busy}
            className="mt-1 h-11 w-full rounded-xl border border-copper/20 px-3"
          >
            <option value="">Sem responsável</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium sm:col-span-2">
          Observações internas
          <textarea
            name="notes"
            rows={4}
            maxLength={5000}
            defaultValue={participant.notes}
            className="mt-1 w-full rounded-xl border border-copper/20 p-3"
          />
        </label>
        <div className="flex flex-wrap justify-between gap-3 sm:col-span-2">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-xs text-red-700"
          >
            <Trash2 size={14} /> Arquivar
          </button>
          <button
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-copper px-5 py-3 text-xs font-semibold text-white"
          >
            <Save size={14} /> Salvar dados
          </button>
        </div>
      </form>
      <div className="rounded-2xl border border-copper/10 bg-cream/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold">Consentimento LGPD</p>
            <p className="mt-1 text-xs text-text-soft">
              {participant.lgpdAccepted ? "Aceito" : "Pendente"} • origem:{" "}
              {participant.source || "admin"}
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() =>
              void mutate(
                {
                  action: "update-consent",
                  participantId: participant.id,
                  consentText:
                    participant.consentText || "Consentimento administrativo registrado.",
                  lgpdAccepted: !participant.lgpdAccepted,
                },
                "Consentimento atualizado.",
              )
            }
            className="rounded-xl border border-copper/30 px-4 py-2 text-xs text-copper"
          >
            Marcar como {participant.lgpdAccepted ? "pendente" : "aceito"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({
  participantId,
  history,
  busy,
  mutate,
}: {
  participantId: string;
  history: HistoryItem[];
  busy: boolean;
  mutate: Mutate;
}) {
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      await mutate(
        { action: "add-note", participantId, note: form.get("note") },
        "Observação adicionada.",
      )
    )
      event.currentTarget.reset();
  }
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex gap-3">
        <input
          name="note"
          required
          minLength={2}
          maxLength={5000}
          placeholder="Nova observação de acompanhamento"
          className="h-11 flex-1 rounded-xl border border-copper/20 px-4 text-sm"
        />
        <button disabled={busy} className="rounded-xl bg-copper px-4 text-xs text-white">
          <Plus size={15} />
        </button>
      </form>
      {history.length ? (
        <div className="space-y-4 border-l-2 border-copper/20 pl-5">
          {history.map((item) => (
            <article key={item.id}>
              <div className="flex flex-wrap gap-2">
                <strong className="text-sm">{item.action}</strong>
                <span className="text-xs text-text-soft">
                  {new Date(item.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              {item.notes && (
                <p className="mt-2 rounded-xl bg-cream/30 p-3 text-sm">{item.notes}</p>
              )}
              <p className="mt-1 text-[11px] text-text-soft">{item.createdBy || "Sistema"}</p>
            </article>
          ))}
        </div>
      ) : (
        <Empty text="Nenhum histórico registrado." />
      )}
    </div>
  );
}

function DonationsTab({
  participantId,
  donations,
  busy,
  mutate,
}: {
  participantId: string;
  donations: Donation[];
  busy: boolean;
  mutate: Mutate;
}) {
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      await mutate(
        {
          action: "save-donation",
          participantId,
          amount: Number(form.get("amount")),
          donationDate: form.get("donationDate"),
          paymentMethod: form.get("paymentMethod"),
          status: form.get("status"),
          notes: form.get("notes"),
        },
        "Doação registrada.",
      )
    )
      event.currentTarget.reset();
  }
  return (
    <div className="space-y-6">
      <form
        onSubmit={add}
        className="grid gap-3 rounded-2xl border border-copper/10 bg-cream/20 p-4 sm:grid-cols-5"
      >
        <Input name="amount" label="Valor" type="number" min="0.01" step="0.01" required />
        <Input name="donationDate" label="Data" type="date" required />
        <Select
          name="paymentMethod"
          label="Forma"
          options={[
            ["pix", "PIX"],
            ["cash", "Dinheiro"],
            ["transfer", "Transferência"],
            ["card", "Cartão"],
            ["material", "Material"],
          ]}
        />
        <Select name="status" label="Status" options={donationStatusOptions} />
        <div className="flex items-end">
          <button disabled={busy} className="h-11 w-full rounded-xl bg-copper text-xs text-white">
            Adicionar
          </button>
        </div>
        <textarea
          name="notes"
          placeholder="Observações"
          maxLength={1000}
          className="rounded-xl border border-copper/20 p-3 text-sm sm:col-span-5"
        />
      </form>
      {donations.length ? (
        <div className="divide-y rounded-xl border">
          {donations.map((donation) => (
            <div
              key={donation.id}
              className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_180px] sm:items-center"
            >
              <div>
                <strong>
                  R$ {Number(donation.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </strong>
                <p className="text-xs text-text-soft">
                  {new Date(`${donation.donationDate}T12:00:00`).toLocaleDateString("pt-BR")} •{" "}
                  {donation.paymentMethod}
                </p>
              </div>
              <p className="text-xs text-text-soft">{donation.notes || "Sem observações"}</p>
              <select
                value={donation.status}
                disabled={busy}
                onChange={(event) =>
                  void mutate(
                    {
                      action: "update-donation",
                      id: donation.id,
                      participantId,
                      status: event.target.value,
                    },
                    "Status atualizado.",
                  )
                }
                className="h-10 rounded-xl border px-3 text-xs"
              >
                {donationStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Nenhuma doação registrada." />
      )}
    </div>
  );
}

function RequestsTab({
  participantId,
  requests,
  busy,
  mutate,
}: {
  participantId: string;
  requests: EloRequest[];
  busy: boolean;
  mutate: Mutate;
}) {
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      await mutate(
        {
          action: "save-request",
          participantId,
          title: form.get("title"),
          description: form.get("description"),
          status: "open",
          priority: form.get("priority"),
        },
        "Solicitação criada.",
      )
    )
      event.currentTarget.reset();
  }
  return (
    <div className="space-y-6">
      <form
        onSubmit={add}
        className="grid gap-3 rounded-2xl border border-copper/10 bg-cream/20 p-4 sm:grid-cols-[1fr_180px]"
      >
        <Input name="title" label="Título" required />
        <Select name="priority" label="Prioridade" options={priorityOptions} />
        <textarea
          name="description"
          required
          minLength={2}
          maxLength={2000}
          placeholder="Descrição"
          className="rounded-xl border border-copper/20 p-3 text-sm sm:col-span-2"
        />
        <button
          disabled={busy}
          className="rounded-xl bg-copper px-4 py-3 text-xs text-white sm:col-span-2"
        >
          Criar solicitação
        </button>
      </form>
      {requests.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {requests.map((request) => (
            <article key={request.id} className="rounded-xl border p-4">
              <h4 className="font-semibold">{request.title}</h4>
              <p className="mt-2 text-xs text-text-soft">{request.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <select
                  value={request.status}
                  disabled={busy}
                  onChange={(event) =>
                    void mutate(
                      {
                        action: "update-request",
                        id: request.id,
                        participantId,
                        status: event.target.value,
                        priority: request.priority,
                      },
                      "Solicitação atualizada.",
                    )
                  }
                  className="h-9 rounded-lg border px-2 text-xs"
                >
                  {requestStatusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={request.priority}
                  disabled={busy}
                  onChange={(event) =>
                    void mutate(
                      {
                        action: "update-request",
                        id: request.id,
                        participantId,
                        status: request.status,
                        priority: event.target.value,
                      },
                      "Prioridade atualizada.",
                    )
                  }
                  className="h-9 rounded-lg border px-2 text-xs"
                >
                  {priorityOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty text="Nenhuma solicitação registrada." />
      )}
    </div>
  );
}

function AttachmentsTab({
  participantId,
  attachments,
  busy,
  mutate,
}: {
  participantId: string;
  attachments: Attachment[];
  busy: boolean;
  mutate: Mutate;
}) {
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("participantId", participantId);
    if (await mutate(form, "Anexo enviado.")) event.currentTarget.reset();
  }
  return (
    <div className="space-y-6">
      <form
        onSubmit={upload}
        className="flex flex-col gap-3 rounded-2xl border border-copper/10 bg-cream/20 p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-xs font-medium">
          PDF ou imagem (até 10 MB)
          <input
            name="file"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="mt-2 block w-full text-sm"
          />
        </label>
        <button disabled={busy} className="rounded-xl bg-copper px-5 py-3 text-xs text-white">
          Enviar anexo
        </button>
      </form>
      {attachments.length ? (
        <div className="divide-y rounded-xl border">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{attachment.fileName}</p>
                <p className="text-xs text-text-soft">
                  {(attachment.sizeBytes / 1024).toFixed(1)} KB •{" "}
                  {new Date(attachment.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/admin/elo?action=attachment&id=${encodeURIComponent(attachment.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Baixar"
                  className="rounded-lg border p-2 text-copper"
                >
                  <Download size={15} />
                </a>
                <button
                  disabled={busy}
                  aria-label="Excluir"
                  onClick={() =>
                    void mutate(
                      { action: "delete-attachment", id: attachment.id, participantId },
                      "Anexo removido.",
                    )
                  }
                  className="rounded-lg border border-red-200 p-2 text-red-700"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Nenhum anexo enviado." />
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm sm:p-6"
    >
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed p-8 text-center text-sm text-text-soft">{text}</p>
  );
}
function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="text-xs font-medium">
      {label}
      <input {...props} className="mt-1 h-11 w-full rounded-xl border border-copper/20 px-3" />
    </label>
  );
}
function Select({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="text-xs font-medium">
      {label}
      <select {...props} className="mt-1 h-11 w-full rounded-xl border border-copper/20 px-3">
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

const kindOptions = [
  ["donor", "Doador"],
  ["beneficiary", "Beneficiário"],
  ["volunteer", "Voluntário"],
  ["partner", "Parceiro"],
] as const;
const participantStatusOptions = [
  ["new", "Novo"],
  ["reviewing", "Em análise"],
  ["approved", "Aprovado"],
  ["active", "Ativo"],
  ["completed", "Concluído"],
  ["rejected", "Recusado"],
] as const;
const donationStatusOptions = [
  ["pending", "Pendente"],
  ["completed", "Concluída"],
  ["failed", "Falhou"],
  ["refunded", "Estornada"],
] as const;
const requestStatusOptions = [
  ["open", "Aberta"],
  ["in_progress", "Em andamento"],
  ["resolved", "Resolvida"],
  ["cancelled", "Cancelada"],
] as const;
const priorityOptions = [
  ["low", "Baixa"],
  ["medium", "Média"],
  ["high", "Alta"],
  ["urgent", "Urgente"],
] as const;
