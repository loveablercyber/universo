import { useState, useEffect } from "react";
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
};

type Module = {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  lessons: Array<{
    id: string;
    title: string;
    description?: string;
    videoUrl: string;
    durationMinutes: number;
    sortOrder: number;
    isPreview: boolean;
  }>;
};

type Enrollment = {
  id: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  amountPaid: number;
  status: string;
  enrolledAt: string;
  courseTitle: string;
};

export function AcademyManager() {
  const [activeTab, setActiveTab] = useState<"courses" | "content" | "enrollments">("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
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

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resC, resE] = await Promise.all([
        fetch("/api/admin/academy?action=courses"),
        fetch("/api/admin/academy?action=enrollments"),
      ]);

      const dataC = await resC.json();
      const dataE = await resE.json();

      if (!resC.ok) throw new Error(dataC.message || "Erro ao carregar cursos");

      setCourses(dataC.courses || []);
      setEnrollments(dataE.enrollments || []);
      if (!selectedCourseId && dataC.courses?.[0]?.id) {
        setSelectedCourseId(dataC.courses[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados EAD");
    } finally {
      setLoading(false);
    }
  };

  const loadCourseContent = async (courseId: string) => {
    try {
      const res = await fetch(`/api/admin/academy?action=modules_lessons&courseId=${courseId}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setModules(data.modules || []);
      }
    } catch (e) {
      console.error("Erro ao carregar aulas do curso:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseContent(selectedCourseId);
    }
  }, [selectedCourseId]);

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
          {/* Seletor de Curso */}
          <div className="rounded-2xl border border-copper/10 bg-white p-4 space-y-3 h-fit">
            <h3 className="font-serif text-lg font-bold text-brown border-b border-copper/10 pb-2">
              Selecione o Curso
            </h3>
            <div className="space-y-1">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition ${
                    selectedCourseId === c.id
                      ? "bg-copper text-white"
                      : "text-brown/80 hover:bg-cream"
                  }`}
                >
                  {c.title} ({c.subtitle})
                </button>
              ))}
            </div>
          </div>

          {/* Gerenciador de Módulos e Aulas */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-copper/10">
              <h3 className="font-serif text-xl font-bold text-brown">Currículo de Videoaulas</h3>
              {selectedCourseId && (
                <button
                  onClick={() => setEditingModule({ courseId: selectedCourseId })}
                  className="h-9 px-4 flex items-center gap-2 rounded-xl bg-copper text-xs font-semibold text-white hover:bg-copper-dark transition"
                >
                  <Plus size={15} /> Novo Módulo
                </button>
              )}
            </div>

            {modules.length === 0 ? (
              <div className="rounded-2xl border border-copper/10 bg-white p-8 text-center text-brown/60">
                Nenhum módulo cadastrado para este curso. Clique em "Novo Módulo" para iniciar.
              </div>
            ) : (
              modules.map((m, idx) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-copper/10 bg-white p-5 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-center border-b border-copper/10 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-copper">
                        Módulo {idx + 1}
                      </span>
                      <h4 className="font-serif text-lg font-bold text-brown">{m.title}</h4>
                      {m.description && <p className="text-xs text-brown/60">{m.description}</p>}
                    </div>
                    <button
                      onClick={() => setEditingLesson({ moduleId: m.id })}
                      className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-copper/20 text-xs font-semibold text-copper hover:bg-copper/5 transition"
                    >
                      <Plus size={14} /> Add Aula
                    </button>
                  </div>

                  {/* Lista de Aulas do Módulo */}
                  <div className="space-y-2">
                    {m.lessons.length === 0 ? (
                      <p className="text-xs text-brown/50 italic py-2">
                        Nenhuma aula cadastrada neste módulo.
                      </p>
                    ) : (
                      m.lessons.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-cream/30 text-xs border border-copper/10"
                        >
                          <div className="flex items-center gap-3">
                            <Video size={16} className="text-copper shrink-0" />
                            <div>
                              <p className="font-medium text-brown">{l.title}</p>
                              <p className="text-[10px] text-brown/55">
                                {l.durationMinutes} min • {l.videoUrl}
                              </p>
                            </div>
                          </div>
                          {l.isPreview && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                              Gratuito
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
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
                  <th className="px-6 py-4 font-medium">Data de Inscrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-copper/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-brown/60">
                      Carregando matrículas...
                    </td>
                  </tr>
                ) : filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-brown/60">
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
                      </td>
                      <td className="px-6 py-4 font-semibold text-copper">{e.courseTitle}</td>
                      <td className="px-6 py-4 font-semibold text-brown">
                        R$ {e.amountPaid.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          {e.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-brown/60">
                        {new Date(e.enrolledAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
  onClose,
  onUpdate,
}: {
  courseId: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/admin/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-module",
          courseId,
          title: form.get("title"),
          description: form.get("description"),
          sortOrder: parseInt(String(form.get("sortOrder")), 10),
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar módulo");
      onUpdate();
      onClose();
    } catch (err) {
      alert("Erro ao salvar módulo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="font-serif text-2xl text-brown">Novo Módulo</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium">Título do Módulo</label>
            <input
              name="title"
              required
              placeholder="Ex: Módulo 1: Introdução à Técnica"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Ordem</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={1}
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
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
  onClose,
  onUpdate,
}: {
  moduleId: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/admin/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-lesson",
          moduleId,
          title: form.get("title"),
          videoUrl: form.get("videoUrl"),
          durationMinutes: parseInt(String(form.get("durationMinutes")), 10),
          isPreview: form.get("isPreview") === "on",
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar aula");
      onUpdate();
      onClose();
    } catch (err) {
      alert("Erro ao salvar aula");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="font-serif text-2xl text-brown">Nova Aula</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium">Título da Aula</label>
            <input
              name="title"
              required
              placeholder="Ex: Aula 1 - Biossegurança e Higienização"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div>
            <label className="text-xs font-medium">URL do Vídeo (Vimeo, YouTube ou MP4)</label>
            <input
              name="videoUrl"
              required
              placeholder="https://vimeo.com/123456789"
              className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Duração (minutos)</label>
              <input
                name="durationMinutes"
                type="number"
                defaultValue={15}
                className="w-full h-10 rounded-xl border border-copper/20 px-3 text-sm outline-none focus:border-copper"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" name="isPreview" id="isPreview" className="accent-copper" />
              <label htmlFor="isPreview" className="text-xs font-medium">
                Aula Grátis
              </label>
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
              Salvar Aula
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
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
        }),
      });

      if (!res.ok) throw new Error("Erro ao matricular aluna");
      onUpdate();
      onClose();
    } catch (err) {
      alert("Erro ao matricular aluna");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="font-serif text-2xl text-brown">Matricular Aluna Manualmente</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
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
