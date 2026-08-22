import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  PlayCircle,
} from "lucide-react";

type CourseDetail = {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  price: number;
  promotionalPrice?: number | null;
  image_url: string;
  badge?: string;
  level: string;
  workload_hours: number;
  modules: Array<{
    id: string;
    title: string;
    description?: string;
    lessons: Array<{
      id: string;
      title: string;
      description?: string;
      durationMinutes: number;
      isPreview: boolean;
    }>;
  }>;
};

export const Route = createFileRoute("/invisible-academy/curso/$slug")({
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { slug } = useParams({ from: "/invisible-academy/curso/$slug" });
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/academy?action=course&slug=${encodeURIComponent(slug)}`)
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload.ok)
          throw new Error(payload.message || "Curso não encontrado.");
        setCourse(payload.course);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar o curso."),
      );
  }, [slug]);

  if (error)
    return (
      <main className="min-h-screen bg-[#FBF6F1] p-10 text-center text-[#4B2C1E]">{error}</main>
    );
  if (!course)
    return (
      <main className="min-h-screen bg-[#FBF6F1] p-10 text-center text-[#4B2C1E]">
        Carregando curso...
      </main>
    );

  const lessons = course.modules.flatMap((module) => module.lessons);
  const price = course.promotionalPrice ?? course.price;
  return (
    <main className="min-h-screen bg-[#FBF6F1] text-[#4B2C1E]">
      <header className="border-b border-[#C97945]/15 bg-[#FFFDFC] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            to="/invisible-academy"
            className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#C97945]"
          >
            <ArrowLeft size={16} /> ACADEMY
          </Link>
          <GraduationCap className="text-[#C97945]" />
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <span className="rounded-full bg-[#C97945] px-3 py-1 text-[10px] font-bold tracking-widest text-white">
            {course.badge}
          </span>
          <h1 className="mt-5 font-display text-5xl leading-tight">
            {course.title}
            <span className="block text-[#C97945]">{course.subtitle}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#6F5B52]">{course.description}</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric icon={Layers} label={`${course.modules.length} módulos`} />
            <Metric icon={PlayCircle} label={`${lessons.length} aulas`} />
            <Metric icon={Clock} label={`${course.workload_hours} horas`} />
            <Metric icon={Award} label="Certificado" />
          </div>
        </div>
        <aside className="overflow-hidden rounded-3xl border border-[#C97945]/15 bg-white shadow-xl">
          <img
            src={course.image_url}
            alt={`${course.title} ${course.subtitle ?? ""}`}
            className="aspect-video w-full object-cover"
          />
          <div className="p-7">
            <p className="text-xs tracking-widest text-[#6F5B52]">INVESTIMENTO</p>
            <p className="mt-1 font-serif text-4xl">R$ {price.toFixed(2).replace(".", ",")}</p>
            <a
              href={`/invisible-academy?curso=${encodeURIComponent(course.slug)}#cursos`}
              className="mt-5 flex w-full items-center justify-center rounded-full bg-[#C97945] px-6 py-4 text-xs font-bold tracking-widest text-white"
            >
              QUERO ME MATRICULAR
            </a>
            <p className="mt-4 text-center text-[11px] text-[#6F5B52]">
              Acesso liberado após confirmação do pagamento.
            </p>
          </div>
        </aside>
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-7 flex items-center gap-3">
          <BookOpen className="text-[#C97945]" />
          <h2 className="font-display text-3xl">Conteúdo programático</h2>
        </div>
        <div className="space-y-4">
          {course.modules.map((module, index) => (
            <article
              key={module.id}
              className="rounded-3xl border border-[#C97945]/15 bg-white p-6"
            >
              <p className="text-[10px] font-bold tracking-widest text-[#C97945]">
                MÓDULO {index + 1}
              </p>
              <h3 className="mt-2 font-serif text-2xl">{module.title}</h3>
              {module.description ? (
                <p className="mt-2 text-sm text-[#6F5B52]">{module.description}</p>
              ) : null}
              <ul className="mt-5 grid gap-2 md:grid-cols-2">
                {module.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center gap-3 rounded-xl bg-[#F5ECE5]/55 p-3 text-sm"
                  >
                    <CheckCircle2 size={16} className="text-[#C97945]" />
                    {lesson.title}
                    <span className="ml-auto text-xs text-[#6F5B52]">
                      {lesson.durationMinutes} min
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {course.modules.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-sm text-[#6F5B52]">
              A grade deste curso está sendo configurada pela equipe.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#C97945]/15 bg-white p-3 text-xs font-semibold">
      <Icon size={17} className="text-[#C97945]" />
      {label}
    </div>
  );
}
