import { useCallback, useState, useEffect } from "react";
import {
  Plus,
  Search,
  GraduationCap,
  PlayCircle,
  Users,
  BookOpen,
  Edit3,
  X,
  Save,
  Video,
  Layers,
  CheckCircle2,
  Copy,
  Archive,
  ArchiveRestore,
  ArrowUp,
  ArrowDown,
  Eye,
  UserCog,
  KeyRound,
  ShieldBan,
  ShieldCheck,
  Award,
  Download,
} from "lucide-react";

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  price: number;
  promotionalPrice?: number | null;
  imageUrl: string;
  badge: string;
  level: string;
  workloadHours: number;
  status: "active" | "draft" | "archived";
  studentsCount: number;
  certificateEnabled: boolean;
  completionPercentage: number;
  certificateSignatory: string;
  certificateSignatoryRole: string;
};

type Module = {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  status: "draft" | "published" | "archived";
  lessons: Array<{
    id: string;
    title: string;
    description?: string;
    videoUrl: string;
    durationMinutes: number;
    sortOrder: number;
    isPreview: boolean;
    status: "draft" | "published" | "archived";
  }>;
};

type Lesson = Module["lessons"][number];

type Enrollment = {
  id: string;
  userId?: string | null;
  courseId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  amountPaid: number;
  status: string;
  source: string;
  adminNotes?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  userStatus?: string | null;
  lastLoginAt?: string | null;
  enrolledAt: string;
  courseTitle: string;
  courseSubtitle?: string;
  paymentConfirmedAt?: string | null;
  completedLessons: number;
  totalLessons: number;
};

type AdminCertificate = {
  enrollmentId: string;
  studentName: string;
  studentEmail: string;
  enrollmentStatus: string;
  courseTitle: string;
  courseSubtitle?: string;
  certificateEnabled: boolean;
  requiredPercentage: number;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  certificateId?: string | null;
  verificationCode?: string | null;
  certificateNumber?: string | null;
  issuedAt?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
};

export function AcademyManager() {
  const [activeTab, setActiveTab] = useState<
    "courses" | "content" | "enrollments" | "certificates"
  >("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<{ courseId: string; module?: Module } | null>(
    null,
  );
  const [editingLesson, setEditingLesson] = useState<{
    moduleId: string;
    lesson?: Module["lessons"][0];
  } | null>(null);
  const [showManualEnrollModal, setShowManualEnrollModal] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [contentBusy, setContentBusy] = useState(false);
  const [managingEnrollment, setManagingEnrollment] = useState<Enrollment | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [resC, resE, resCert] = await Promise.all([
        fetch("/api/admin/academy?action=courses"),
        fetch("/api/admin/academy?action=enrollments"),
        fetch("/api/admin/academy-certificates"),
      ]);

      const dataC = await resC.json();
      const dataE = await resE.json();
      const dataCert = await resCert.json();

      if (!resC.ok) throw new Error(dataC.message || "Erro ao carregar cursos");

      setCourses(dataC.courses || []);
      setEnrollments(dataE.enrollments || []);
      setCertificates(dataCert.certificates || []);
      setSelectedCourseId((current) => current ?? dataC.courses?.[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados EAD");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCourseContent = useCallback(async (courseId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/academy?action=modules_lessons&courseId=${courseId}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Erro ao carregar o currículo");
      setModules(data.modules || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar o currículo");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseContent(selectedCourseId);
    }
  }, [loadCourseContent, selectedCourseId]);

  const mutateContent = async (body: Record<string, unknown>) => {
    setContentBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Não foi possível atualizar o conteúdo");
      if (selectedCourseId) await loadCourseContent(selectedCourseId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar o conteúdo");
    } finally {
      setContentBusy(false);
    }
  };

  const moveItem = (
    items: Array<{ id: string }>,
    index: number,
    direction: -1 | 1,
    action: "reorder-modules" | "reorder-lessons",
    parentId: string,
  ) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const ids = items.map((item) => item.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    void mutateContent({ action, parentId, ids });
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredEnrollments = enrollments.filter(
    (e) =>
      e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const visibleModules = showArchived
    ? modules
    : modules.filter((module) => module.status !== "archived");

  return (
    <div className="space-y-6">
      {/* Top Header & Abas */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-copper/10">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("courses")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "courses"
                ? "bg-copper text-white shadow-sm"
                : "bg-cream/40 text-brown/70 hover:bg-cream"
            }`}
          >
            <GraduationCap size={16} /> Cursos ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "content"
                ? "bg-copper text-white shadow-sm"
                : "bg-cream/40 text-brown/70 hover:bg-cream"
            }`}
          >
            <PlayCircle size={16} /> Módulos & Aulas
          </button>
          <button
            onClick={() => setActiveTab("enrollments")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "enrollments"
                ? "bg-copper text-white shadow-sm"
                : "bg-cream/40 text-brown/70 hover:bg-cream"
            }`}
          >
            <Users size={16} /> Alunas ({enrollments.length})
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition ${activeTab === "certificates" ? "bg-copper text-white shadow-sm" : "bg-cream/40 text-brown/70 hover:bg-cream"}`}
          >
            <Award size={16} /> Certificados (
            {certificates.filter((item) => item.certificateId).length})
          </button>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brown/40" size={15} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-copper/20 bg-cream/30 pl-9 pr-4 text-xs outline-none focus:border-copper"
            />
          </div>

          {activeTab === "courses" && (
            <button
              onClick={() => setEditingCourse({} as Course)}
              className="h-10 px-4 flex items-center gap-2 rounded-xl bg-copper text-xs font-semibold text-white hover:bg-copper-dark transition shrink-0"
            >
              <Plus size={16} /> Novo Curso
            </button>
          )}

          {activeTab === "enrollments" && (
            <button
              onClick={() => setShowManualEnrollModal(true)}
              className="h-10 px-4 flex items-center gap-2 rounded-xl bg-copper text-xs font-semibold text-white hover:bg-copper-dark transition shrink-0"
            >
              <Plus size={16} /> Matricular Aluna
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {/* Aba 1: Cursos */}
      {activeTab === "courses" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="col-span-full p-8 text-center text-brown/60">Carregando cursos...</p>
          ) : filteredCourses.length === 0 ? (
            <p className="col-span-full p-8 text-center text-brown/60">Nenhum curso cadastrado.</p>
          ) : (
            filteredCourses.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-copper/10 bg-white overflow-hidden flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="relative h-44 w-full overflow-hidden bg-cream">
                    <img src={c.imageUrl} alt={c.title} className="h-full w-full object-cover" />
                    <span className="absolute top-3 right-3 rounded-full bg-copper px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                      {c.badge}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
                      {c.level} • {c.workloadHours}h
                    </p>
                    <h3 className="font-serif text-xl font-bold text-brown">
                      {c.title} - {c.subtitle}
                    </h3>
                    <p className="text-xs text-brown/70 line-clamp-2">{c.description}</p>
                  </div>
                </div>

                <div className="border-t border-copper/10 p-4 bg-cream/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-brown/50 block">Valor do investimento</span>
                    <span className="font-serif text-lg font-bold text-brown">
                      R$ {c.price.toFixed(2).replace(".", ",")}
                    </span>
                    {c.promotionalPrice && (
                      <span className="ml-2 text-xs font-semibold text-emerald-600">
                        (Promo R$ {c.promotionalPrice.toFixed(2)})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedCourseId(c.id);
                        setActiveTab("content");
                      }}
                      title="Ver Aulas"
                      className="p-2 text-copper hover:bg-copper/10 rounded-xl transition"
                    >
                      <PlayCircle size={18} />
                    </button>
                    <button
                      onClick={() => setEditingCourse(c)}
                      title="Editar Curso"
                      className="p-2 text-brown/60 hover:text-copper hover:bg-copper/10 rounded-xl transition"
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Aba 2: Módulos e Aulas */}
      {activeTab === "content" && (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="rounded-2xl border border-copper/10 bg-white p-4 space-y-3 h-fit">
            <h3 className="font-serif text-lg font-bold text-brown border-b border-copper/10 pb-2">
              Selecione o Curso
            </h3>
            <div className="space-y-1">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition ${selectedCourseId === c.id ? "bg-copper text-white" : "text-brown/80 hover:bg-cream"}`}
                >
                  {c.title} ({c.subtitle})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap justify-between gap-3 items-center bg-white p-4 rounded-2xl border border-copper/10">
              <div>
                <h3 className="font-serif text-xl font-bold text-brown">Currículo de Videoaulas</h3>
                <label className="mt-1 flex items-center gap-2 text-xs text-brown/60">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="accent-copper"
                  />
                  Mostrar itens arquivados
                </label>
              </div>
              {selectedCourseId && (
                <button
                  onClick={() => setEditingModule({ courseId: selectedCourseId })}
                  disabled={contentBusy}
                  className="h-9 px-4 flex items-center gap-2 rounded-xl bg-copper text-xs font-semibold text-white hover:bg-copper-dark disabled:opacity-50 transition"
                >
                  <Plus size={15} /> Novo Módulo
                </button>
              )}
            </div>

            {visibleModules.length === 0 ? (
              <div className="rounded-2xl border border-copper/10 bg-white p-8 text-center text-brown/60">
                Nenhum módulo encontrado para este curso.
              </div>
            ) : (
              visibleModules.map((m, idx) => {
                const visibleLessons = showArchived
                  ? m.lessons
                  : m.lessons.filter((lesson) => lesson.status !== "archived");
                const moduleIndex = visibleModules.findIndex((module) => module.id === m.id);
                return (
                  <section
                    key={m.id}
                    className={`rounded-2xl border bg-white p-5 space-y-4 shadow-sm ${m.status === "archived" ? "border-slate-300 opacity-70" : "border-copper/10"}`}
                  >
                    <div className="flex flex-wrap justify-between gap-3 items-start border-b border-copper/10 pb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-copper">
                            Módulo {idx + 1}
                          </span>
                          <StatusBadge status={m.status} />
                        </div>
                        <h4 className="font-serif text-lg font-bold text-brown">{m.title}</h4>
                        {m.description && <p className="text-xs text-brown/60">{m.description}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <IconButton
                          label="Mover módulo para cima"
                          disabled={contentBusy || moduleIndex === 0}
                          onClick={() =>
                            moveItem(
                              visibleModules,
                              moduleIndex,
                              -1,
                              "reorder-modules",
                              selectedCourseId!,
                            )
                          }
                        >
                          <ArrowUp size={16} />
                        </IconButton>
                        <IconButton
                          label="Mover módulo para baixo"
                          disabled={contentBusy || moduleIndex === visibleModules.length - 1}
                          onClick={() =>
                            moveItem(
                              visibleModules,
                              moduleIndex,
                              1,
                              "reorder-modules",
                              selectedCourseId!,
                            )
                          }
                        >
                          <ArrowDown size={16} />
                        </IconButton>
                        <IconButton
                          label="Editar módulo"
                          onClick={() =>
                            setEditingModule({ courseId: selectedCourseId!, module: m })
                          }
                        >
                          <Edit3 size={16} />
                        </IconButton>
                        <IconButton
                          label="Duplicar módulo"
                          disabled={contentBusy}
                          onClick={() =>
                            void mutateContent({
                              action: "duplicate-content",
                              entity: "module",
                              id: m.id,
                            })
                          }
                        >
                          <Copy size={16} />
                        </IconButton>
                        <IconButton
                          label={m.status === "archived" ? "Restaurar módulo" : "Arquivar módulo"}
                          disabled={contentBusy}
                          onClick={() => {
                            if (
                              m.status === "archived" ||
                              window.confirm(
                                `Arquivar o módulo “${m.title}”? O progresso das alunas será preservado.`,
                              )
                            )
                              void mutateContent({
                                action:
                                  m.status === "archived" ? "restore-content" : "archive-content",
                                entity: "module",
                                id: m.id,
                              });
                          }}
                        >
                          {m.status === "archived" ? (
                            <ArchiveRestore size={16} />
                          ) : (
                            <Archive size={16} />
                          )}
                        </IconButton>
                        {m.status !== "archived" && (
                          <button
                            onClick={() => setEditingLesson({ moduleId: m.id })}
                            className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-copper/20 text-xs font-semibold text-copper hover:bg-copper/5"
                          >
                            <Plus size={14} /> Nova aula
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {visibleLessons.length === 0 ? (
                        <p className="text-xs text-brown/50 italic py-2">
                          Nenhuma aula cadastrada neste módulo.
                        </p>
                      ) : (
                        visibleLessons.map((l) => {
                          const lessonIndex = visibleLessons.findIndex(
                            (lesson) => lesson.id === l.id,
                          );
                          return (
                            <div
                              key={l.id}
                              className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl text-xs border ${l.status === "archived" ? "bg-slate-50 border-slate-200 opacity-70" : "bg-cream/30 border-copper/10"}`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <Video size={16} className="text-copper shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-brown">{l.title}</p>
                                    <StatusBadge status={l.status} />
                                    {l.isPreview && (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-800">
                                        Gratuita
                                      </span>
                                    )}
                                  </div>
                                  <p className="truncate text-[10px] text-brown/55">
                                    {l.durationMinutes} min • {l.videoUrl}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <IconButton
                                  label="Pré-visualizar aula"
                                  onClick={() => setPreviewLesson(l)}
                                >
                                  <Eye size={15} />
                                </IconButton>
                                <IconButton
                                  label="Mover aula para cima"
                                  disabled={contentBusy || lessonIndex === 0}
                                  onClick={() =>
                                    moveItem(
                                      visibleLessons,
                                      lessonIndex,
                                      -1,
                                      "reorder-lessons",
                                      m.id,
                                    )
                                  }
                                >
                                  <ArrowUp size={15} />
                                </IconButton>
                                <IconButton
                                  label="Mover aula para baixo"
                                  disabled={
                                    contentBusy || lessonIndex === visibleLessons.length - 1
                                  }
                                  onClick={() =>
                                    moveItem(
                                      visibleLessons,
                                      lessonIndex,
                                      1,
                                      "reorder-lessons",
                                      m.id,
                                    )
                                  }
                                >
                                  <ArrowDown size={15} />
                                </IconButton>
                                <IconButton
                                  label="Editar aula"
                                  onClick={() => setEditingLesson({ moduleId: m.id, lesson: l })}
                                >
                                  <Edit3 size={15} />
                                </IconButton>
                                <IconButton
                                  label="Duplicar aula"
                                  disabled={contentBusy}
                                  onClick={() =>
                                    void mutateContent({
                                      action: "duplicate-content",
                                      entity: "lesson",
                                      id: l.id,
                                    })
                                  }
                                >
                                  <Copy size={15} />
                                </IconButton>
                                <IconButton
                                  label={
                                    l.status === "archived" ? "Restaurar aula" : "Arquivar aula"
                                  }
                                  disabled={contentBusy}
                                  onClick={() => {
                                    if (
                                      l.status === "archived" ||
                                      window.confirm(
                                        `Arquivar a aula “${l.title}”? O progresso será preservado.`,
                                      )
                                    )
                                      void mutateContent({
                                        action:
                                          l.status === "archived"
                                            ? "restore-content"
                                            : "archive-content",
                                        entity: "lesson",
                                        id: l.id,
                                      });
                                  }}
                                >
                                  {l.status === "archived" ? (
                                    <ArchiveRestore size={15} />
                                  ) : (
                                    <Archive size={15} />
                                  )}
                                </IconButton>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Aba 3: Alunas Matriculadas */}
      {activeTab === "enrollments" && (
        <div className="overflow-hidden rounded-2xl border border-copper/10 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream/30 text-xs uppercase text-brown/60">
                <tr>
                  <th className="px-6 py-4 font-medium">Aluna</th>
                  <th className="px-6 py-4 font-medium">Curso</th>
                  <th className="px-6 py-4 font-medium">Valor Pago</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Progresso</th>
                  <th className="px-6 py-4 font-medium">Data de Inscrição</th>
                  <th className="px-6 py-4 font-medium text-right">Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-copper/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-brown/60">
                      Carregando matrículas...
                    </td>
                  </tr>
                ) : filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-brown/60">
                      Nenhuma aluna encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredEnrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-cream/20 transition">
                      <td className="px-6 py-4">
                        <p className="font-medium text-brown">{e.studentName}</p>
                        <p className="text-xs text-brown/55">
                          {e.studentEmail} • {e.studentPhone || "Sem telefone"}
                        </p>
                        {e.userStatus === "blocked" && (
                          <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase text-red-700">
                            Conta bloqueada
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-copper">{e.courseTitle}</td>
                      <td className="px-6 py-4 font-semibold text-brown">
                        R$ {e.amountPaid.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${
                            e.status === "active" || e.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : e.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-28">
                          <div className="mb-1 flex justify-between text-[10px] text-brown/55">
                            <span>
                              {e.completedLessons}/{e.totalLessons}
                            </span>
                            <span>
                              {e.totalLessons
                                ? Math.round((e.completedLessons / e.totalLessons) * 100)
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-cream">
                            <div
                              className="h-full bg-copper"
                              style={{
                                width: `${e.totalLessons ? (e.completedLessons / e.totalLessons) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-brown/60">
                        {new Date(e.enrolledAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setManagingEnrollment(e)}
                          className="inline-flex items-center gap-2 rounded-xl border border-copper/20 px-3 py-2 text-xs font-semibold text-copper transition hover:bg-copper/5"
                        >
                          <UserCog size={15} /> Gerenciar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "certificates" && (
        <CertificatesPanel
          certificates={certificates}
          searchQuery={searchQuery}
          onUpdate={loadData}
        />
      )}

      {/* Modal Edição de Curso */}
      {editingCourse && (
        <CourseEditorModal
          course={editingCourse.id ? editingCourse : null}
          onClose={() => setEditingCourse(null)}
          onUpdate={loadData}
        />
      )}

      {/* Modal Edição de Módulo */}
      {editingModule && (
        <ModuleEditorModal
          courseId={editingModule.courseId}
          module={editingModule.module}
          onClose={() => setEditingModule(null)}
          onUpdate={() => {
            if (selectedCourseId) loadCourseContent(selectedCourseId);
          }}
        />
      )}

      {/* Modal Edição de Aula */}
      {editingLesson && (
        <LessonEditorModal
          moduleId={editingLesson.moduleId}
          lesson={editingLesson.lesson}
          onClose={() => setEditingLesson(null)}
          onUpdate={() => {
            if (selectedCourseId) loadCourseContent(selectedCourseId);
          }}
        />
      )}

      {/* Modal Matrícula Manual */}
      {showManualEnrollModal && (
        <ManualEnrollModal
          courses={courses}
          onClose={() => setShowManualEnrollModal(false)}
          onUpdate={loadData}
        />
      )}

      {managingEnrollment && (
        <EnrollmentManagerModal
          enrollment={managingEnrollment}
          onClose={() => setManagingEnrollment(null)}
          onUpdate={loadData}
        />
      )}

      {previewLesson && (
        <LessonPreviewModal lesson={previewLesson} onClose={() => setPreviewLesson(null)} />
      )}
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className="rounded-lg p-2 text-brown/60 transition hover:bg-copper/10 hover:text-copper disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" | "archived" }) {
  const label =
    status === "published" ? "Publicado" : status === "draft" ? "Rascunho" : "Arquivado";
  const colors =
    status === "published"
      ? "bg-emerald-100 text-emerald-800"
      : status === "draft"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-200 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${colors}`}>
      {label}
    </span>
  );
}

function CertificatesPanel({
  certificates,
  searchQuery,
  onUpdate,
}: {
  certificates: AdminCertificate[];
  searchQuery: string;
  onUpdate: () => void | Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visible = certificates.filter(
    (item) =>
      !normalizedSearch ||
      item.studentName.toLowerCase().includes(normalizedSearch) ||
      item.studentEmail.toLowerCase().includes(normalizedSearch) ||
      item.courseTitle.toLowerCase().includes(normalizedSearch) ||
      item.certificateNumber?.toLowerCase().includes(normalizedSearch),
  );
  const mutate = async (body: Record<string, unknown>, id: string) => {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/admin/academy-certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message || "Não foi possível atualizar o certificado");
      await onUpdate();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Não foi possível atualizar o certificado",
      );
    } finally {
      setBusyId(null);
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Emitidos"
          value={certificates.filter((item) => item.certificateId).length}
        />
        <MetricCard
          label="Válidos"
          value={certificates.filter((item) => item.certificateId && !item.revokedAt).length}
        />
        <MetricCard
          label="Elegíveis sem emissão"
          value={
            certificates.filter(
              (item) =>
                !item.certificateId &&
                item.certificateEnabled &&
                item.totalLessons > 0 &&
                item.progressPercentage >= item.requiredPercentage,
            ).length
          }
        />
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-copper/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream/30 text-xs uppercase text-brown/60">
              <tr>
                <th className="px-5 py-4">Aluna</th>
                <th className="px-5 py-4">Curso</th>
                <th className="px-5 py-4">Conclusão</th>
                <th className="px-5 py-4">Certificado</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-copper/10">
              {visible.length ? (
                visible.map((item) => {
                  const eligible =
                    item.certificateEnabled &&
                    item.totalLessons > 0 &&
                    item.progressPercentage >= item.requiredPercentage;
                  return (
                    <tr key={item.enrollmentId} className="hover:bg-cream/20">
                      <td className="px-5 py-4">
                        <p className="font-medium text-brown">{item.studentName}</p>
                        <p className="text-xs text-brown/50">{item.studentEmail}</p>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-copper">
                        {item.courseTitle}
                        <br />
                        <span className="font-normal text-brown/50">{item.courseSubtitle}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-brown">
                          {item.progressPercentage}% ({item.completedLessons}/{item.totalLessons})
                        </p>
                        <p className="text-[10px] text-brown/50">
                          Critério: {item.requiredPercentage}%
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {item.certificateId ? (
                          <div>
                            <span
                              className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${item.revokedAt ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                            >
                              {item.revokedAt ? "Revogado" : "Válido"}
                            </span>
                            <p className="mt-1 font-mono text-[10px] text-brown/50">
                              {item.certificateNumber}
                            </p>
                          </div>
                        ) : (
                          <span
                            className={`text-xs ${eligible ? "text-emerald-700" : "text-brown/40"}`}
                          >
                            {eligible ? "Pronto para emitir" : "Ainda não elegível"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {item.certificateId && item.verificationCode ? (
                            <>
                              <a
                                title="Baixar PDF"
                                aria-label="Baixar certificado PDF"
                                href={`/api/academy/certificate/${item.verificationCode}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg p-2 text-copper hover:bg-copper/10"
                              >
                                <Download size={16} />
                              </a>
                              <a
                                title="Verificar certificado"
                                aria-label="Verificar certificado"
                                href={`/invisible-academy/certificado/${item.verificationCode}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg p-2 text-copper hover:bg-copper/10"
                              >
                                <Eye size={16} />
                              </a>
                            </>
                          ) : null}
                          {item.certificateId && !item.revokedAt ? (
                            <button
                              type="button"
                              disabled={busyId === item.enrollmentId}
                              onClick={() => {
                                const reason = window.prompt("Informe o motivo da revogação:");
                                if (reason?.trim())
                                  void mutate(
                                    {
                                      action: "revoke",
                                      certificateId: item.certificateId,
                                      reason: reason.trim(),
                                    },
                                    item.enrollmentId,
                                  );
                              }}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                              title="Revogar certificado"
                              aria-label="Revogar certificado"
                            >
                              <Archive size={16} />
                            </button>
                          ) : eligible ? (
                            <button
                              type="button"
                              disabled={busyId === item.enrollmentId}
                              onClick={() =>
                                void mutate(
                                  {
                                    action: item.revokedAt ? "restore" : "issue",
                                    enrollmentId: item.enrollmentId,
                                  },
                                  item.enrollmentId,
                                )
                              }
                              className="rounded-xl bg-copper px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                            >
                              {item.revokedAt ? "REVALIDAR" : "EMITIR"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-brown/50">
                    Nenhuma matrícula encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-copper/10 bg-white p-4">
      <p className="text-xs text-brown/50">{label}</p>
      <p className="font-serif text-3xl font-bold text-brown">{value}</p>
    </div>
  );
}

function CourseEditorModal({
  course,
  onClose,
  onUpdate,
}: {
  course: Course | null;
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
      const body = {
        action: "save-course",
        id: course?.id,
        slug: form.get("slug"),
        title: form.get("title"),
        subtitle: form.get("subtitle"),
        description: form.get("description"),
        price: parseFloat(String(form.get("price"))),
        promotionalPrice: form.get("promotionalPrice")
          ? parseFloat(String(form.get("promotionalPrice")))
          : null,
        imageUrl: form.get("imageUrl"),
        badge: form.get("badge") || "EXCLUSIVO",
        level: form.get("level") || "Iniciante",
        workloadHours: parseInt(String(form.get("workloadHours")), 10),
        status: form.get("status"),
        certificateEnabled: form.get("certificateEnabled") === "on",
        completionPercentage: parseInt(String(form.get("completionPercentage")), 10),
        certificateSignatory: form.get("certificateSignatory"),
        certificateSignatoryRole: form.get("certificateSignatoryRole"),
      };

      const res = await fetch("/api/admin/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao salvar curso");

      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-copper/20">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <h2 className="font-serif text-2xl text-brown">
            {course ? "Editar Curso" : "Novo Curso"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-brown/50 hover:bg-copper/10 hover:text-brown transition"
          >
            <X size={20} />
          </button>
        </header>

        <form
          id="course-form"
          onSubmit={handleSubmit}
          className="overflow-auto p-6 space-y-4 max-h-[80vh]"
        >
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Título Principal</label>
              <input
                name="title"
                defaultValue={course?.title || "MEGA HAIR"}
                required
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Subtítulo / Técnica</label>
              <input
                name="subtitle"
                defaultValue={course?.subtitle || "MÉTODOS CLÁSSICOS"}
                required
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Slug (URL)</label>
              <input
                name="slug"
                defaultValue={course?.slug || "mega-hair-novo-curso"}
                required
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Selo / Badge</label>
              <input
                name="badge"
                defaultValue={course?.badge || "EXCLUSIVO"}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Preço (R$)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                defaultValue={course?.price ?? 497}
                required
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Preço Promo (R$)</label>
              <input
                name="promotionalPrice"
                type="number"
                step="0.01"
                defaultValue={course?.promotionalPrice ?? ""}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Carga Horária (h)</label>
              <input
                name="workloadHours"
                type="number"
                defaultValue={course?.workloadHours ?? 15}
                required
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nível</label>
              <select
                name="level"
                defaultValue={course?.level || "Iniciante"}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              >
                <option value="Iniciante">Iniciante</option>
                <option value="Intermediário">Intermediário</option>
                <option value="Avançado">Avançado</option>
                <option value="Todos os níveis">Todos os níveis</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <select
                name="status"
                defaultValue={course?.status || "active"}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
              >
                <option value="active">Ativo</option>
                <option value="draft">Rascunho</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">URL da Capa do Curso</label>
            <input
              name="imageUrl"
              defaultValue={course?.imageUrl || "/images/curso-metodos-classicos.jpg"}
              required
              className="w-full h-10 rounded-xl border border-copper/20 px-3 outline-none focus:border-copper text-sm"
            />
          </div>

          <div className="rounded-2xl border border-copper/15 bg-cream/20 p-4 space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-brown">
              <input
                name="certificateEnabled"
                type="checkbox"
                defaultChecked={course?.certificateEnabled ?? true}
                className="accent-copper"
              />
              Emitir certificado automaticamente
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Conclusão mínima (%)</label>
                <input
                  name="completionPercentage"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={course?.completionPercentage ?? 100}
                  required
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Assinatura</label>
                <input
                  name="certificateSignatory"
                  defaultValue={course?.certificateSignatory ?? "Carol Sol"}
                  required
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Cargo da assinatura</label>
                <input
                  name="certificateSignatoryRole"
                  defaultValue={course?.certificateSignatoryRole ?? "Diretora da Invisible Academy"}
                  required
                  className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Descrição Completa</label>
            <textarea
              name="description"
              defaultValue={course?.description ?? ""}
              rows={3}
              required
              className="w-full rounded-xl border border-copper/20 p-3 outline-none focus:border-copper text-sm"
            />
          </div>
        </form>

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
            form="course-form"
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

function ModuleEditorModal({
  courseId,
  module,
  onClose,
  onUpdate,
}: {
  courseId: string;
  module?: Module;
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
      const res = await fetch("/api/admin/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-module",
          id: module?.id,
          courseId,
          title: form.get("title"),
          description: form.get("description"),
          sortOrder: parseInt(String(form.get("sortOrder")), 10),
          status: form.get("status"),
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao salvar módulo");
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar módulo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl text-brown">
            {module ? "Editar Módulo" : "Novo Módulo"}
          </h3>
          <IconButton label="Fechar" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div>
            <label className="text-xs font-medium">Título do Módulo</label>
            <input
              name="title"
              required
              defaultValue={module?.title ?? ""}
              placeholder="Ex: Módulo 1: Introdução à Técnica"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Descrição</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={module?.description ?? ""}
              placeholder="Resumo do conteúdo e objetivos deste módulo"
              className="w-full rounded-xl border border-copper/20 p-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Ordem</label>
              <input
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={module?.sortOrder ?? 1}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <select
                name="status"
                defaultValue={module?.status ?? "published"}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
              >
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-copper text-white text-xs font-bold"
            >
              Salvar Módulo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LessonEditorModal({
  moduleId,
  lesson,
  onClose,
  onUpdate,
}: {
  moduleId: string;
  lesson?: Lesson;
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
      const res = await fetch("/api/admin/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-lesson",
          id: lesson?.id,
          moduleId,
          title: form.get("title"),
          description: form.get("description"),
          videoUrl: form.get("videoUrl"),
          durationMinutes: parseInt(String(form.get("durationMinutes")), 10),
          sortOrder: parseInt(String(form.get("sortOrder")), 10),
          isPreview: form.get("isPreview") === "on",
          status: form.get("status"),
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao salvar aula");
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar aula");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl text-brown">{lesson ? "Editar Aula" : "Nova Aula"}</h3>
          <IconButton label="Fechar" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div>
            <label className="text-xs font-medium">Título da Aula</label>
            <input
              name="title"
              required
              defaultValue={lesson?.title ?? ""}
              placeholder="Ex: Aula 1 - Biossegurança e Higienização"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Descrição da aula</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={lesson?.description ?? ""}
              placeholder="Objetivos, materiais e conteúdo abordado"
              className="w-full rounded-xl border border-copper/20 p-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div>
            <label className="text-xs font-medium">URL do Vídeo (Vimeo, YouTube ou MP4)</label>
            <input
              name="videoUrl"
              required
              defaultValue={lesson?.videoUrl ?? ""}
              placeholder="https://vimeo.com/123456789"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium">Duração (minutos)</label>
              <input
                name="durationMinutes"
                type="number"
                min={1}
                defaultValue={lesson?.durationMinutes ?? 15}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Ordem</label>
              <input
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={lesson?.sortOrder ?? 1}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                name="isPreview"
                id="isPreview"
                defaultChecked={lesson?.isPreview ?? false}
                className="accent-copper"
              />
              <label htmlFor="isPreview" className="text-xs font-medium">
                Aula Grátis
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Status</label>
            <select
              name="status"
              defaultValue={lesson?.status ?? "published"}
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            >
              <option value="published">Publicado</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-copper text-white text-xs font-bold"
            >
              Salvar Aula
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LessonPreviewModal({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const embedUrl = getVideoEmbedUrl(lesson.videoUrl);
  const isDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(lesson.videoUrl);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Prévia de ${lesson.title}`}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-copper/10 p-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-brown">{lesson.title}</h3>
            <p className="text-xs text-brown/60">{lesson.durationMinutes} minutos</p>
          </div>
          <IconButton label="Fechar prévia" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        <div className="aspect-video bg-black">
          {isDirectVideo ? (
            <video src={lesson.videoUrl} controls className="h-full w-full" />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              title={lesson.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-white">
              <div>
                <p>Esta URL não oferece prévia incorporada.</p>
                <a
                  href={lesson.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-copper-light underline"
                >
                  Abrir vídeo em nova aba
                </a>
              </div>
            </div>
          )}
        </div>
        {lesson.description && <p className="p-5 text-sm text-brown/70">{lesson.description}</p>}
      </div>
    </div>
  );
}

function getVideoEmbedUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("youtu.be"))
      return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname
        .split("/")
        .filter(Boolean)
        .find((part) => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

type EnrollmentDetails = Enrollment & {
  accountCreatedAt?: string | null;
  sumupCheckoutId?: string | null;
};

type EnrollmentDetailsPayload = {
  enrollment: EnrollmentDetails;
  progress: Array<{
    lessonId: string;
    lessonTitle: string;
    moduleTitle: string;
    completedAt: string;
  }>;
  otherEnrollments: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    courseTitle: string;
    courseSubtitle?: string;
  }>;
};

function EnrollmentManagerModal({
  enrollment,
  onClose,
  onUpdate,
}: {
  enrollment: Enrollment;
  onClose: () => void;
  onUpdate: () => void | Promise<void>;
}) {
  const [details, setDetails] = useState<EnrollmentDetailsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/academy?action=enrollment_details&enrollmentId=${enrollment.id}`,
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao carregar a matrícula");
      setDetails(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar a matrícula");
    } finally {
      setLoading(false);
    }
  }, [enrollment.id]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const runAction = async (body: Record<string, unknown>, successMessage: string) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Não foi possível salvar as alterações");
      setMessage(successMessage);
      await Promise.all([loadDetails(), Promise.resolve(onUpdate())]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as alterações");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runAction(
      {
        action: "save-enrollment",
        id: enrollment.id,
        studentName: form.get("studentName"),
        studentEmail: form.get("studentEmail"),
        studentPhone: form.get("studentPhone"),
        amountPaid: Number(form.get("amountPaid")),
        status: form.get("status"),
        adminNotes: form.get("adminNotes"),
        cancellationReason: form.get("cancellationReason"),
      },
      "Cadastro e matrícula atualizados.",
    );
  };

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const success = await runAction(
      {
        action: "reset-student-password",
        enrollmentId: enrollment.id,
        password: form.get("password"),
      },
      "Senha provisória definida e sessões anteriores encerradas.",
    );
    if (success) formElement.reset();
  };

  const current = details?.enrollment ?? enrollment;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Gerenciar ${current.studentName}`}
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-copper/10 bg-cream/30 px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-copper">
              Gestão de aluna
            </p>
            <h2 className="font-serif text-2xl font-bold text-brown">{current.studentName}</h2>
            <p className="text-xs text-brown/60">
              {current.courseTitle} {current.courseSubtitle ? `— ${current.courseSubtitle}` : ""}
            </p>
          </div>
          <IconButton label="Fechar gestão da aluna" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>

        <div className="overflow-y-auto p-6">
          {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && (
            <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>
          )}
          {loading && !details ? (
            <p className="py-12 text-center text-sm text-brown/60">Carregando dados da aluna...</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <form
                onSubmit={handleSave}
                className="space-y-4 rounded-2xl border border-copper/10 p-5"
              >
                <h3 className="font-serif text-lg font-bold text-brown">Cadastro e matrícula</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nome completo">
                    <input
                      name="studentName"
                      defaultValue={current.studentName}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field label="E-mail de acesso">
                    <input
                      name="studentEmail"
                      type="email"
                      defaultValue={current.studentEmail}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Telefone / WhatsApp">
                    <input
                      name="studentPhone"
                      defaultValue={current.studentPhone ?? ""}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Valor pago">
                    <input
                      name="amountPaid"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={current.amountPaid}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Situação da matrícula">
                    <select name="status" defaultValue={current.status} className={inputClass}>
                      <option value="pending">Pendente</option>
                      <option value="active">Ativa</option>
                      <option value="completed">Concluída</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </Field>
                  <Field label="Origem">
                    <input
                      value={sourceLabel(current.source)}
                      readOnly
                      className={`${inputClass} bg-slate-50 text-brown/60`}
                    />
                  </Field>
                </div>
                <Field label="Observações administrativas">
                  <textarea
                    name="adminNotes"
                    rows={3}
                    defaultValue={current.adminNotes ?? ""}
                    placeholder="Informações internas sobre atendimento, pagamento ou acompanhamento"
                    className={textareaClass}
                  />
                </Field>
                <Field label="Motivo do cancelamento (obrigatório ao cancelar)">
                  <textarea
                    name="cancellationReason"
                    rows={2}
                    defaultValue={current.cancellationReason ?? ""}
                    className={textareaClass}
                  />
                </Field>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-copper px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <Save size={15} /> Salvar alterações
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                <section className="rounded-2xl border border-copper/10 p-5">
                  <h3 className="font-serif text-lg font-bold text-brown">Acesso à plataforma</h3>
                  <dl className="mt-3 space-y-2 text-xs text-brown/70">
                    <InfoRow
                      label="Conta"
                      value={current.userStatus === "blocked" ? "Bloqueada" : "Ativa"}
                    />
                    <InfoRow label="Último acesso" value={formatDateTime(current.lastLoginAt)} />
                    <InfoRow
                      label="Conta criada"
                      value={formatDateTime(current.accountCreatedAt)}
                    />
                    <InfoRow label="Matrícula" value={formatDateTime(current.enrolledAt)} />
                    <InfoRow
                      label="Checkout SumUp"
                      value={current.sumupCheckoutId || "Matrícula manual/sem checkout"}
                    />
                  </dl>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        const blocked = current.userStatus === "blocked";
                        if (
                          blocked ||
                          window.confirm(
                            "Bloquear toda a conta desta aluna e encerrar as sessões atuais?",
                          )
                        )
                          void runAction(
                            {
                              action: "set-student-access",
                              enrollmentId: enrollment.id,
                              userStatus: blocked ? "active" : "blocked",
                            },
                            blocked ? "Conta reativada." : "Conta bloqueada e sessões encerradas.",
                          );
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-copper/20 px-4 py-2.5 text-xs font-semibold text-brown hover:bg-cream disabled:opacity-50"
                    >
                      {current.userStatus === "blocked" ? (
                        <ShieldCheck size={15} />
                      ) : (
                        <ShieldBan size={15} />
                      )}
                      {current.userStatus === "blocked" ? "Reativar conta" : "Bloquear conta"}
                    </button>
                  </div>
                  <form
                    onSubmit={handlePasswordReset}
                    className="mt-4 space-y-2 border-t border-copper/10 pt-4"
                  >
                    <label htmlFor="temporary-password" className="text-xs font-medium text-brown">
                      Nova senha provisória
                    </label>
                    <input
                      id="temporary-password"
                      name="password"
                      type="password"
                      minLength={12}
                      required
                      autoComplete="new-password"
                      placeholder="Mínimo de 12 caracteres"
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-copper/20 px-4 py-2.5 text-xs font-semibold text-copper hover:bg-copper/5 disabled:opacity-50"
                    >
                      <KeyRound size={15} /> Redefinir senha e encerrar sessões
                    </button>
                  </form>
                </section>

                <section className="rounded-2xl border border-copper/10 p-5">
                  <h3 className="font-serif text-lg font-bold text-brown">Progresso concluído</h3>
                  <p className="mt-1 text-xs text-brown/60">
                    {current.completedLessons}/{current.totalLessons} aulas
                  </p>
                  <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                    {details?.progress.length ? (
                      details.progress.map((item) => (
                        <div key={item.lessonId} className="rounded-xl bg-cream/30 p-2 text-xs">
                          <p className="font-medium text-brown">{item.lessonTitle}</p>
                          <p className="text-[10px] text-brown/55">
                            {item.moduleTitle} • {formatDateTime(item.completedAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-brown/50">Nenhuma aula concluída.</p>
                    )}
                  </div>
                </section>
                {details?.otherEnrollments.length ? (
                  <section className="rounded-2xl border border-copper/10 p-5">
                    <h3 className="font-serif text-lg font-bold text-brown">Outros cursos</h3>
                    <div className="mt-3 space-y-2">
                      {details.otherEnrollments.map((item) => (
                        <div key={item.id} className="flex justify-between gap-3 text-xs">
                          <span>
                            {item.courseTitle} {item.courseSubtitle}
                          </span>
                          <span className="font-semibold uppercase text-copper">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper";
const textareaClass =
  "w-full rounded-xl border border-copper/20 p-3 text-sm outline-none focus:border-copper";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-brown">
      <span>{label}</span>
      {children}
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-right font-medium text-brown">{value}</dd>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "Ainda não registrado";
}

function sourceLabel(source?: string) {
  return source === "manual"
    ? "Manual"
    : source === "import"
      ? "Importação"
      : source === "admin"
        ? "Administrativa"
        : "Checkout online";
}

function ManualEnrollModal({
  courses,
  onClose,
  onUpdate,
}: {
  courses: Course[];
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
      const res = await fetch("/api/admin/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual-enrollment",
          courseId: form.get("courseId"),
          studentName: form.get("studentName"),
          studentEmail: form.get("studentEmail"),
          studentPhone: form.get("studentPhone"),
          password: form.get("password"),
          adminNotes: form.get("adminNotes"),
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Erro ao matricular aluna");
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao matricular aluna");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="font-serif text-2xl text-brown">Matricular Aluna Manualmente</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div>
            <label className="text-xs font-medium">Curso</label>
            <select
              name="courseId"
              required
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.subtitle})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Nome Completo da Aluna</label>
            <input
              name="studentName"
              required
              placeholder="Nome completo"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div>
            <label className="text-xs font-medium">E-mail</label>
            <input
              name="studentEmail"
              type="email"
              required
              placeholder="aluna@email.com"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Telefone / WhatsApp</label>
            <input
              name="studentPhone"
              placeholder="(14) 99999-9999"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Senha provisória</label>
            <input
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
              placeholder="Mínimo de 12 caracteres"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Observações administrativas</label>
            <textarea
              name="adminNotes"
              rows={3}
              placeholder="Origem do contato, condição especial ou informação interna"
              className="w-full rounded-xl border border-copper/20 p-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-copper text-white text-xs font-bold"
            >
              Confirmar Matrícula
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
