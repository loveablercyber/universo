import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  PlayCircle,
  Lock,
  ArrowLeft,
  GraduationCap,
  Award,
  BookOpen,
  Clock,
  Sparkles,
} from "lucide-react";
import { UniverseSwitcher } from "@/components/UniverseSwitcher";

export const Route = createFileRoute("/invisible-academy/aluno")({
  head: () => ({
    meta: [
      { title: "Área do Aluno | Invisible Academy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudentClassroomPage,
});

type Lesson = {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  durationMinutes: number;
  completed: boolean;
};

type Module = {
  id: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
};

type CourseClassroomData = {
  enrollmentId: string;
  course: {
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
  };
  modules: Module[];
};

type StudentCourse = {
  enrollmentId: string;
  enrollmentStatus: "pending" | "active" | "completed";
  amount: string | number;
  slug: string;
  title: string;
  subtitle?: string;
  image?: string;
  badge?: string;
  level?: string;
};

type StudentCertificate = {
  verificationCode: string;
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  workloadHours: number;
  completionPercentage: number;
  issuedAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
};

function StudentClassroomPage() {
  const [data, setData] = useState<CourseClassroomData | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myCourses, setMyCourses] = useState<StudentCourse[]>([]);
  const [myCertificates, setMyCertificates] = useState<StudentCertificate[]>([]);
  const [newCertificateCode, setNewCertificateCode] = useState<string | null>(null);
  const [courseSlug, setCourseSlug] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("course")
      : null,
  );
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [payingEnrollmentId, setPayingEnrollmentId] = useState<string | null>(null);

  useEffect(() => {
    async function loadClassroom() {
      try {
        const session = await fetch("/api/auth");
        const sessionData = await session.json();
        if (!sessionData.user) {
          setAuthenticated(false);
          setLoading(false);
          return;
        }
        setAuthenticated(true);
        if (!courseSlug) {
          const [coursesRes, certificatesRes] = await Promise.all([
            fetch("/api/academy?action=my_courses"),
            fetch("/api/academy?action=my_certificates"),
          ]);
          const [coursesJson, certificatesJson] = await Promise.all([
            coursesRes.json(),
            certificatesRes.json(),
          ]);
          if (!coursesRes.ok || !coursesJson.ok) {
            setError(coursesJson.message || "Não foi possível carregar seus cursos.");
          } else {
            setMyCourses(coursesJson.enrollments || []);
            if (certificatesRes.ok) setMyCertificates(certificatesJson.certificates || []);
          }
          setLoading(false);
          return;
        }
        const res = await fetch(
          `/api/academy?action=classroom&course_slug=${encodeURIComponent(courseSlug)}`,
        );
        const json = await res.json();

        if (res.ok && json.ok) {
          setData(json);
          /* Set initial active lesson to first lesson */
          const firstLesson = json.modules?.[0]?.lessons?.[0];
          if (firstLesson) setActiveLesson(firstLesson);
        } else {
          setError(json.message || "Matrícula não encontrada.");
        }
      } catch (err) {
        setError("Erro de conexão ao carregar sala de aula.");
      } finally {
        setLoading(false);
      }
    }

    void loadClassroom();
  }, [courseSlug]);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
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
    const payload = await response.json();
    if (!response.ok) return setError(payload.message || "Não foi possível entrar.");
    window.location.reload();
  };

  const toggleCompleteLesson = async (lesson: Lesson) => {
    if (!data) return;
    const newCompleted = !lesson.completed;

    /* Optimistic UI update */
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) =>
            l.id === lesson.id ? { ...l, completed: newCompleted } : l,
          ),
        })),
      };
    });

    if (activeLesson?.id === lesson.id) {
      setActiveLesson((prev) => (prev ? { ...prev, completed: newCompleted } : prev));
    }

    try {
      const response = await fetch("/api/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_lesson",
          enrollmentId: data.enrollmentId,
          lessonId: lesson.id,
          completed: newCompleted,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível salvar o progresso.");
      setNewCertificateCode(payload.certificate?.verificationCode ?? null);
    } catch (e) {
      console.error("Erro ao registrar conclusão da aula:", e);
      setError("Não foi possível salvar o progresso da aula. Tente novamente.");
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) =>
              l.id === lesson.id ? { ...l, completed: lesson.completed } : l,
            ),
          })),
        };
      });
      setActiveLesson((prev) =>
        prev?.id === lesson.id ? { ...prev, completed: lesson.completed } : prev,
      );
    }
  };

  const retryPayment = async (enrollmentId: string) => {
    setPayingEnrollmentId(enrollmentId);
    setError("");
    try {
      const response = await fetch("/api/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_payment", enrollmentId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(payload.message || "Não foi possível iniciar o pagamento.");
      window.location.href = payload.checkoutUrl;
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Não foi possível iniciar o pagamento.",
      );
      setPayingEnrollmentId(null);
    }
  };

  /* Calculate Progress % */
  const allLessons = data?.modules.flatMap((m) => m.lessons) || [];
  const completedCount = allLessons.filter((l) => l.completed).length;
  const progressPercent =
    allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#0F0D0C] text-[#FBF6F1] font-sans flex flex-col justify-between">
      <UniverseSwitcher />

      {/* Header Aluno */}
      <header className="border-b border-[#C97945]/20 bg-[#171412] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            to="/invisible-academy"
            className="flex items-center gap-2 text-xs font-semibold tracking-widest text-[#C97945] hover:text-white transition"
          >
            <ArrowLeft size={16} /> ACADEMY
          </Link>
          <div className="flex items-center gap-3">
            <GraduationCap className="text-[#C97945]" size={22} />
            <span className="font-serif text-lg font-bold tracking-wider text-white">
              ÁREA DO ALUNO
            </span>
          </div>
        </div>
      </header>

      {/* Classroom Content */}
      <div className="mx-auto max-w-7xl w-full px-6 py-8 flex-1">
        {authenticated === false ? (
          <div className="mx-auto max-w-md my-16 text-center space-y-4 rounded-3xl border border-[#C97945]/20 bg-[#171412] p-8 shadow-2xl">
            <Lock className="mx-auto text-[#C97945]" size={48} strokeWidth={1.5} />
            <h2 className="font-serif text-3xl font-bold text-white">Acesse a Área do Aluno</h2>
            <p className="text-xs text-[#6F5A50] leading-relaxed">
              Entre com o e-mail e a senha cadastrados na matrícula.
            </p>
            <form onSubmit={login} className="space-y-3 pt-2">
              <input
                name="email"
                type="email"
                required
                placeholder="seu@email.com"
                className="w-full h-11 rounded-xl border border-[#C97945]/30 bg-[#221D1A] px-4 text-xs text-white outline-none focus:border-[#C97945]"
              />
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Sua senha"
                className="w-full h-11 rounded-xl border border-[#C97945]/30 bg-[#221D1A] px-4 text-xs text-white outline-none focus:border-[#C97945]"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#C97945] font-semibold text-xs tracking-wider text-white hover:bg-[#b06638] transition"
              >
                ENTRAR NA SALA DE AULA
              </button>
              <Link
                to="/redefinir-senha"
                className="block text-center text-xs text-[#C97945] hover:underline"
              >
                Esqueci minha senha
              </Link>
            </form>
          </div>
        ) : loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#C97945]/30 border-t-[#C97945]" />
            <h2 className="font-serif text-2xl">Carregando sala de aula...</h2>
          </div>
        ) : authenticated && !courseSlug ? (
          <div className="mx-auto max-w-5xl py-12 space-y-8">
            <div className="text-center space-y-2">
              <GraduationCap className="mx-auto text-[#C97945]" size={48} strokeWidth={1.5} />
              <h1 className="font-serif text-4xl font-bold text-white">Meus cursos</h1>
              <p className="text-sm text-[#8E7569]">
                Escolha um curso para continuar seus estudos.
              </p>
            </div>
            {error ? (
              <p className="text-center text-sm text-red-400">{error}</p>
            ) : myCourses.length === 0 ? (
              <div className="rounded-3xl border border-[#C97945]/20 bg-[#171412] p-10 text-center space-y-4">
                <BookOpen className="mx-auto text-[#C97945]" size={42} strokeWidth={1.5} />
                <h2 className="font-serif text-2xl text-white">Nenhuma matrícula ativa</h2>
                <p className="text-sm text-[#8E7569]">
                  Pagamentos recentes podem levar alguns instantes para serem confirmados.
                </p>
                <Link
                  to="/invisible-academy"
                  className="inline-flex rounded-xl bg-[#C97945] px-6 py-3 text-xs font-bold text-white"
                >
                  VER CURSOS DISPONÍVEIS
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {myCourses.map((course) => (
                  <article
                    key={course.enrollmentId}
                    className="overflow-hidden rounded-3xl border border-[#C97945]/20 bg-[#171412] text-left transition hover:-translate-y-1 hover:border-[#C97945]/60"
                  >
                    {course.image && (
                      <img src={course.image} alt="" className="aspect-video w-full object-cover" />
                    )}
                    <div className="p-5 space-y-3">
                      <span className="text-[10px] font-bold tracking-widest text-[#C97945]">
                        {course.enrollmentStatus === "pending"
                          ? "PAGAMENTO PENDENTE"
                          : course.badge || course.level}
                      </span>
                      <h2 className="font-serif text-xl font-bold text-white">{course.title}</h2>
                      {course.subtitle && (
                        <p className="text-xs text-[#8E7569]">{course.subtitle}</p>
                      )}
                      {course.enrollmentStatus === "pending" ? (
                        <button
                          type="button"
                          disabled={payingEnrollmentId === course.enrollmentId}
                          onClick={() => void retryPayment(course.enrollmentId)}
                          className="w-full rounded-xl bg-[#C97945] px-4 py-3 text-xs font-bold text-white disabled:opacity-60"
                        >
                          {payingEnrollmentId === course.enrollmentId
                            ? "ABRINDO PAGAMENTO..."
                            : `FINALIZAR PAGAMENTO · R$ ${Number(course.amount).toFixed(2).replace(".", ",")}`}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setLoading(true);
                            setCourseSlug(course.slug);
                            window.history.replaceState(
                              null,
                              "",
                              `/invisible-academy/aluno?course=${encodeURIComponent(course.slug)}`,
                            );
                          }}
                          className="w-full rounded-xl border border-[#C97945]/40 px-4 py-3 text-xs font-bold text-[#C97945]"
                        >
                          ACESSAR CURSO
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
            {myCertificates.length > 0 && (
              <section className="space-y-4 border-t border-[#C97945]/20 pt-8">
                <div className="text-center">
                  <Award className="mx-auto text-[#C97945]" size={36} />
                  <h2 className="mt-2 font-serif text-3xl font-bold text-white">
                    Meus certificados
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {myCertificates.map((certificate) => (
                    <article
                      key={certificate.verificationCode}
                      className="rounded-3xl border border-[#C97945]/20 bg-[#171412] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#C97945]">
                            {certificate.certificateNumber}
                          </p>
                          <h3 className="mt-1 font-serif text-xl font-bold text-white">
                            {certificate.courseTitle}
                          </h3>
                          <p className="mt-1 text-xs text-[#8E7569]">
                            {certificate.workloadHours} horas • emitido em{" "}
                            {new Date(certificate.issuedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <Award
                          className={certificate.revokedAt ? "text-red-400" : "text-emerald-400"}
                          size={28}
                        />
                      </div>
                      {certificate.revokedAt ? (
                        <p className="mt-4 rounded-xl bg-red-950/40 p-3 text-xs text-red-300">
                          Revogado: {certificate.revocationReason || "Consulte a administração."}
                        </p>
                      ) : (
                        <div className="mt-4 flex gap-2">
                          <a
                            href={`/api/academy/certificate/${certificate.verificationCode}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 rounded-xl bg-[#C97945] px-4 py-3 text-center text-xs font-bold text-white"
                          >
                            BAIXAR PDF
                          </a>
                          <a
                            href={`/invisible-academy/certificado/${certificate.verificationCode}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-[#C97945]/40 px-4 py-3 text-xs font-bold text-[#C97945]"
                          >
                            VALIDAR
                          </a>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : error || !data ? (
          <div className="mx-auto max-w-md my-16 text-center space-y-4 rounded-3xl border border-[#C97945]/20 bg-[#171412] p-8">
            <Lock className="mx-auto text-amber-500" size={48} strokeWidth={1.5} />
            <h2 className="font-serif text-2xl text-white">Ops! {error}</h2>
            <p className="text-xs text-[#6F5A50]">
              Verifique se a matrícula foi concluída com o e-mail informado.
            </p>
            <Link
              to="/invisible-academy"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#C97945] px-6 text-xs font-bold text-white"
            >
              VER CURSOS DISPONÍVEIS
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Player de Vídeo & Detalhes da Aula */}
            <div className="space-y-6">
              {/* Player Container */}
              <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-[#C97945]/20 bg-black shadow-2xl">
                {activeLesson?.videoUrl ? (
                  activeLesson.videoUrl.includes("youtube") ||
                  activeLesson.videoUrl.includes("vimeo") ? (
                    <iframe
                      src={activeLesson.videoUrl.replace("watch?v=", "embed/")}
                      title={activeLesson.title}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={activeLesson.videoUrl}
                      controls
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-center p-8">
                    <div>
                      <PlayCircle
                        size={64}
                        className="mx-auto text-[#C97945]/40 mb-3"
                        strokeWidth={1}
                      />
                      <p className="text-sm text-[#6F5A50]">
                        Selecione uma aula no índice ao lado para assistir.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Informações da Aula Ativa */}
              {activeLesson && (
                <div className="rounded-3xl border border-[#C97945]/20 bg-[#171412] p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C97945]/15 pb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#C97945]">
                        AULA EM EXIBIÇÃO • {activeLesson.durationMinutes} MINUTOS
                      </span>
                      <h2 className="font-serif text-2xl font-bold text-white mt-1">
                        {activeLesson.title}
                      </h2>
                    </div>

                    <button
                      onClick={() => toggleCompleteLesson(activeLesson)}
                      className={`h-11 px-6 rounded-2xl text-xs font-bold tracking-wider transition flex items-center justify-center gap-2 shrink-0 ${
                        activeLesson.completed
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                          : "bg-[#C97945] text-white hover:bg-[#b06638]"
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      {activeLesson.completed ? "CONCLUÍDA ✓" : "MARCAR COMO CONCLUÍDA"}
                    </button>
                  </div>

                  {activeLesson.description && (
                    <p className="text-xs text-[#6F5A50] leading-relaxed">
                      {activeLesson.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar com Módulos, Aulas e Progresso */}
            <div className="space-y-6">
              {/* Barra de Progresso */}
              <div className="rounded-3xl border border-[#C97945]/20 bg-[#171412] p-6 space-y-3 shadow-sm">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[#C97945] tracking-wider uppercase">
                    Progresso do Curso
                  </span>
                  <span className="text-white font-mono">{progressPercent}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-[#221D1A] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C97945] to-[#E7B08F] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#6F5A50] text-center pt-1">
                  {completedCount} de {allLessons.length} aulas concluídas
                </p>
              </div>
              {newCertificateCode && (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/30 p-6 text-center">
                  <Award className="mx-auto text-emerald-400" size={38} />
                  <h3 className="mt-2 font-serif text-xl font-bold text-white">Curso concluído!</h3>
                  <p className="mt-1 text-xs text-emerald-200/70">
                    Seu certificado já está disponível.
                  </p>
                  <a
                    href={`/api/academy/certificate/${newCertificateCode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white"
                  >
                    BAIXAR CERTIFICADO
                  </a>
                </div>
              )}

              {/* Índice de Módulos & Aulas */}
              <div className="rounded-3xl border border-[#C97945]/20 bg-[#171412] p-5 space-y-4 max-h-[600px] overflow-y-auto">
                <h3 className="font-serif text-lg font-bold text-white border-b border-[#C97945]/15 pb-2">
                  Índice do Curso
                </h3>

                <div className="space-y-4">
                  {data.modules.map((m, mIdx) => (
                    <div key={m.id} className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#C97945]">
                        MÓDULO {mIdx + 1}: {m.title}
                      </p>

                      <div className="space-y-1">
                        {m.lessons.map((l) => (
                          <button
                            key={l.id}
                            onClick={() => setActiveLesson(l)}
                            className={`w-full text-left p-3 rounded-xl text-xs transition flex items-center justify-between border ${
                              activeLesson?.id === l.id
                                ? "bg-[#C97945]/20 border-[#C97945] text-white"
                                : "bg-[#221D1A]/50 border-transparent text-[#6F5A50] hover:bg-[#221D1A] hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <PlayCircle
                                size={15}
                                className={activeLesson?.id === l.id ? "text-[#C97945]" : ""}
                              />
                              <span className="truncate font-medium">{l.title}</span>
                            </div>
                            {l.completed && (
                              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
