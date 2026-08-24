import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type OperationsPayload = {
  ok: true;
  generatedAt: string;
  qualityStatus: "healthy" | "attention" | "critical";
  summary: {
    activeCourses: number;
    draftCourses: number;
    publishedLessons: number;
    enrollments: number;
    activeEnrollments: number;
    pendingEnrollments: number;
    completedEnrollments: number;
    cancelledEnrollments: number;
    revenue: number;
    validCertificates: number;
    revokedCertificates: number;
  };
  alerts: Array<{
    severity: "critical" | "warning";
    code: string;
    title: string;
    detail: string;
    entityId?: string;
  }>;
  inactiveStudents: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    courseTitle: string;
    lastActivityAt: string;
  }>;
  coursePerformance: Array<{
    id: string;
    title: string;
    status: string;
    enrollments: number;
    completed: number;
    revenue: number;
    averageProgress: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    actor: string;
    createdAt: string;
  }>;
};

const exports = [
  { type: "enrollments", label: "Matrículas" },
  { type: "progress", label: "Progresso" },
  { type: "certificates", label: "Certificados" },
] as const;

export function AcademyOperationsPanel() {
  const [data, setData] = useState<OperationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/academy-operations");
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(payload.message || "Não foi possível carregar a operação.");
      setData(payload);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Falha ao carregar a operação.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  if (loading && !data)
    return (
      <div className="rounded-2xl border border-copper/10 bg-white p-12 text-center text-sm text-brown/60">
        Verificando a operação da Academy...
      </div>
    );

  if (!data)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>{error || "Não foi possível carregar os indicadores."}</p>
        <button
          type="button"
          onClick={() => void loadOperations()}
          className="mt-3 font-bold underline"
        >
          Tentar novamente
        </button>
      </div>
    );

  const status = {
    healthy: {
      label: "Operação saudável",
      description: "Nenhuma pendência operacional detectada.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      icon: <ShieldCheck size={22} />,
    },
    attention: {
      label: "Operação requer atenção",
      description: "Existem acompanhamentos preventivos a realizar.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
      icon: <AlertTriangle size={22} />,
    },
    critical: {
      label: "Pendência crítica",
      description: "Há uma inconsistência que pode afetar alunas ou certificados.",
      className: "border-red-200 bg-red-50 text-red-800",
      icon: <AlertTriangle size={22} />,
    },
  }[data.qualityStatus];

  return (
    <div className="space-y-5">
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-col gap-3 rounded-2xl border border-copper/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${status.className}`}>
          {status.icon}
          <div>
            <p className="text-sm font-bold">{status.label}</p>
            <p className="text-xs opacity-75">{status.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exports.map((item) => (
            <a
              key={item.type}
              href={`/api/admin/academy-operations?action=export&type=${item.type}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-copper/20 px-3 py-2 text-xs font-semibold text-brown hover:bg-cream"
            >
              <FileDown size={14} /> {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => void loadOperations()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-copper px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OperationMetric
          label="Cursos ativos"
          value={data.summary.activeCourses}
          detail={`${data.summary.publishedLessons} aulas publicadas`}
        />
        <OperationMetric
          label="Matrículas ativas"
          value={data.summary.activeEnrollments}
          detail={`${data.summary.pendingEnrollments} aguardando pagamento`}
        />
        <OperationMetric
          label="Conclusões"
          value={data.summary.completedEnrollments}
          detail={`${data.summary.validCertificates} certificados válidos`}
        />
        <OperationMetric
          label="Receita confirmada"
          value={formatMoney(data.summary.revenue)}
          detail={`${data.summary.enrollments} matrículas no histórico`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-copper/10 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={17} className="text-copper" />
            <h3 className="font-serif text-lg font-bold text-brown">Alertas operacionais</h3>
          </div>
          <div className="space-y-2">
            {data.alerts.length ? (
              data.alerts.map((alert) => (
                <div
                  key={`${alert.code}-${alert.entityId ?? "global"}`}
                  className={`rounded-xl border p-3 ${alert.severity === "critical" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
                >
                  <p className="text-xs font-bold text-brown">{alert.title}</p>
                  <p className="mt-0.5 text-[11px] text-brown/65">{alert.detail}</p>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 size={18} /> Nenhuma pendência detectada.
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-copper/10 bg-white">
          <div className="border-b border-copper/10 p-5">
            <h3 className="font-serif text-lg font-bold text-brown">Desempenho por curso</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream/30 uppercase text-brown/55">
                <tr>
                  <th className="px-4 py-3">Curso</th>
                  <th className="px-4 py-3">Matrículas</th>
                  <th className="px-4 py-3">Conclusões</th>
                  <th className="px-4 py-3">Progresso médio</th>
                  <th className="px-4 py-3">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-copper/10">
                {data.coursePerformance.map((course) => (
                  <tr key={course.id}>
                    <td className="px-4 py-3 font-semibold text-brown">{course.title}</td>
                    <td className="px-4 py-3">{course.enrollments}</td>
                    <td className="px-4 py-3">{course.completed}</td>
                    <td className="px-4 py-3">{course.averageProgress}%</td>
                    <td className="px-4 py-3">{formatMoney(course.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-copper/10 bg-white p-5">
          <h3 className="font-serif text-lg font-bold text-brown">
            Alunas sem atividade há 14 dias
          </h3>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {data.inactiveStudents.length ? (
              data.inactiveStudents.map((student) => (
                <div key={student.id} className="rounded-xl bg-cream/30 p-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold text-brown">{student.studentName}</p>
                    <span className="text-brown/50">{formatDate(student.lastActivityAt)}</span>
                  </div>
                  <p className="text-brown/60">{student.courseTitle}</p>
                  <a
                    href={`mailto:${student.studentEmail}`}
                    className="text-copper hover:underline"
                  >
                    {student.studentEmail}
                  </a>
                </div>
              ))
            ) : (
              <p className="text-xs text-brown/50">Nenhuma aluna inativa neste período.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-copper/10 bg-white p-5">
          <div className="flex items-center gap-2">
            <Activity size={17} className="text-copper" />
            <h3 className="font-serif text-lg font-bold text-brown">
              Atividade administrativa recente
            </h3>
          </div>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {data.recentActivity.length ? (
              data.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 border-b border-copper/10 pb-2 text-xs last:border-0"
                >
                  <div>
                    <p className="font-semibold text-brown">{actionLabel(item.action)}</p>
                    <p className="text-[10px] text-brown/50">{item.actor}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-brown/50">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-brown/50">Nenhuma atividade registrada.</p>
            )}
          </div>
        </section>
      </div>

      <p className="text-right text-[10px] text-brown/45">
        Indicadores atualizados em {formatDateTime(data.generatedAt)}
      </p>
    </div>
  );
}

function OperationMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-copper/10 bg-white p-4">
      <p className="text-xs text-brown/50">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold text-brown">{value}</p>
      <p className="mt-1 text-[10px] text-brown/50">{detail}</p>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function actionLabel(value: string) {
  return value
    .replace(/^academy\./, "")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" · ");
}
