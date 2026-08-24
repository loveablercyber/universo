import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { query } from "@/lib/db.server";
import { createSumUpCheckout, getSumUpCheckoutStatus } from "@/lib/sumup.server";
import { sendAcademyEnrollmentNotification } from "@/lib/notifications.server";
import { createSession, readSession, sessionCookie, type SessionUser } from "@/lib/auth.server";
import bcrypt from "bcryptjs";

const enrollSchema = z.object({
  action: z.literal("enroll"),
  courseId: z.string().uuid(),
  studentName: z.string().min(2, "Nome é obrigatório."),
  studentEmail: z.string().email("E-mail inválido."),
  studentPhone: z.string().optional(),
  password: z.string().min(12, "A senha precisa ter pelo menos 12 caracteres."),
});

const completeLessonSchema = z.object({
  action: z.literal("complete_lesson"),
  enrollmentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  completed: z.boolean().default(true),
});

const retryPaymentSchema = z.object({
  action: z.literal("retry_payment"),
  enrollmentId: z.string().uuid(),
});

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  const message = error instanceof Error ? error.message : "Erro ao processar requisição EAD.";
  console.error("[Academy API]", error);
  return Response.json({ ok: false, message }, { status: 503 });
}

async function requireStudent(request: Request) {
  const user = await readSession(request);
  if (!user)
    throw new Response(
      JSON.stringify({ ok: false, message: "Faça login para acessar a Academy." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  return user;
}

async function confirmPendingPayments(userId: string) {
  const pending = await query<{
    id: string;
    sumup_checkout_id: string | null;
    student_name: string;
    student_email: string;
    student_phone: string | null;
    course_title: string;
  }>(
    `SELECT e.id, e.sumup_checkout_id, e.student_name, e.student_email, e.student_phone,
            c.title as course_title
       FROM universe.academy_enrollments e
       JOIN universe.academy_courses c ON c.id=e.course_id
      WHERE e.user_id=$1 AND e.status='pending'`,
    [userId],
  );
  for (const enrollment of pending.rows) {
    if (!enrollment.sumup_checkout_id) continue;
    try {
      const checkout = await getSumUpCheckoutStatus(enrollment.sumup_checkout_id);
      if (checkout.status === "PAID") {
        const activated = await query<{ id: string }>(
          `UPDATE universe.academy_enrollments
              SET status='active', payment_confirmed_at=now()
            WHERE id=$1 AND status='pending'
          RETURNING id`,
          [enrollment.id],
        );
        if (activated.rowCount) {
          void sendAcademyEnrollmentNotification(
            enrollment.student_name,
            enrollment.student_email,
            enrollment.student_phone ?? undefined,
            enrollment.course_title,
          );
        }
      } else if (["FAILED", "EXPIRED"].includes(checkout.status)) {
        await query(
          `UPDATE universe.academy_enrollments
              SET sumup_checkout_id=NULL
            WHERE id=$1 AND status='pending'`,
          [enrollment.id],
        );
      }
    } catch (error) {
      console.error("[Academy API] Não foi possível conciliar matrícula", enrollment.id, error);
    }
  }
}

export const Route = createFileRoute("/api/academy")({
  server: {
    handlers: {
      /* ───── GET: Courses, Course Details, Student Classroom ───── */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "courses";

          if (action === "courses") {
            const { rows } = await query(
              `SELECT id, slug, title, subtitle, description,
                      price::float as price, promotional_price::float as "promotionalPrice",
                      image_url as image, badge, level, workload_hours as "workloadHours"
                 FROM universe.academy_courses
                WHERE status = 'active'
                ORDER BY created_at DESC`,
            );
            return Response.json({ ok: true, courses: rows });
          }

          if (action === "course") {
            const slug = url.searchParams.get("slug");
            if (!slug)
              return Response.json(
                { ok: false, message: "Slug do curso ausente." },
                { status: 400 },
              );

            const courseRes = await query<{
              id: string;
              slug: string;
              title: string;
              subtitle: string;
              description: string;
              price: string;
              promotional_price: string | null;
              image_url: string;
              badge: string;
              level: string;
              workload_hours: number;
            }>(
              `SELECT id, slug, title, subtitle, description, price, promotional_price, image_url, badge, level, workload_hours
                 FROM universe.academy_courses
                WHERE slug = $1 AND status = 'active'`,
              [slug],
            );

            const course = courseRes.rows[0];
            if (!course)
              return Response.json(
                { ok: false, message: "Curso não encontrado." },
                { status: 404 },
              );

            /* Fetch Modules and Lessons */
            const modulesRes = await query<{
              id: string;
              title: string;
              description: string;
              sort_order: number;
            }>(
              `SELECT id, title, description, sort_order
                 FROM universe.academy_modules
                WHERE course_id = $1 AND status = 'published'
                ORDER BY sort_order ASC, created_at ASC`,
              [course.id],
            );

            const modulesWithLessons = await Promise.all(
              modulesRes.rows.map(async (m) => {
                const lessonsRes = await query(
                  `SELECT id, title, description, duration_minutes as "durationMinutes", is_preview as "isPreview"
                     FROM universe.academy_lessons
                    WHERE module_id = $1 AND status = 'published'
                    ORDER BY sort_order ASC, created_at ASC`,
                  [m.id],
                );
                return {
                  ...m,
                  lessons: lessonsRes.rows,
                };
              }),
            );

            return Response.json({
              ok: true,
              course: {
                ...course,
                price: Number(course.price),
                promotionalPrice: course.promotional_price
                  ? Number(course.promotional_price)
                  : null,
                modules: modulesWithLessons,
              },
            });
          }

          if (action === "my_courses") {
            const user = await requireStudent(request);
            await confirmPendingPayments(user.id);

            const { rows } = await query(
              `SELECT e.id as "enrollmentId", e.status as "enrollmentStatus", e.enrolled_at as "enrolledAt",
                      e.amount_paid as amount,
                      c.id as "courseId", c.slug, c.title, c.subtitle, c.image_url as image, c.badge, c.level
                 FROM universe.academy_enrollments e
                 JOIN universe.academy_courses c ON c.id = e.course_id
                WHERE e.user_id = $1 AND e.status IN ('pending', 'active', 'completed')
                ORDER BY e.enrolled_at DESC`,
              [user.id],
            );

            return Response.json({ ok: true, enrollments: rows });
          }

          if (action === "classroom") {
            const courseSlug = url.searchParams.get("course_slug");
            const user = await requireStudent(request);
            await confirmPendingPayments(user.id);

            if (!courseSlug) {
              return Response.json({ ok: false, message: "Parâmetros ausentes." }, { status: 400 });
            }

            /* Verify active enrollment */
            const enrollRes = await query<{ id: string; status: string; course_id: string }>(
              `SELECT e.id, e.status, e.course_id
                 FROM universe.academy_enrollments e
                 JOIN universe.academy_courses c ON c.id = e.course_id
                WHERE c.slug = $1 AND e.user_id = $2 AND e.status IN ('active', 'completed')`,
              [courseSlug, user.id],
            );

            const enrollment = enrollRes.rows[0];
            if (!enrollment) {
              return Response.json(
                { ok: false, message: "Matrícula não encontrada ou pendente." },
                { status: 403 },
              );
            }

            /* Get Course details + Modules + Lessons + Video URLs */
            const courseRes = await query(
              `SELECT id, slug, title, subtitle, description, image_url as image FROM universe.academy_courses WHERE id = $1`,
              [enrollment.course_id],
            );

            const modulesRes = await query<{ id: string; title: string; sort_order: number }>(
              `SELECT id, title, sort_order FROM universe.academy_modules WHERE course_id = $1 AND status = 'published' ORDER BY sort_order ASC`,
              [enrollment.course_id],
            );

            /* Progress */
            const progressRes = await query<{ lesson_id: string }>(
              `SELECT lesson_id FROM universe.academy_student_progress WHERE enrollment_id = $1 AND completed = true`,
              [enrollment.id],
            );
            const completedLessonIds = new Set(progressRes.rows.map((p) => p.lesson_id));

            const modulesWithLessons = await Promise.all(
              modulesRes.rows.map(async (m) => {
                const lessonsRes = await query<{
                  id: string;
                  title: string;
                  description: string;
                  video_url: string;
                  duration_minutes: number;
                }>(
                  `SELECT id, title, description, video_url as "videoUrl", duration_minutes as "durationMinutes"
                     FROM universe.academy_lessons
                    WHERE module_id = $1 AND status = 'published'
                    ORDER BY sort_order ASC`,
                  [m.id],
                );

                return {
                  ...m,
                  lessons: lessonsRes.rows.map((l) => ({
                    ...l,
                    completed: completedLessonIds.has(l.id),
                  })),
                };
              }),
            );

            return Response.json({
              ok: true,
              enrollmentId: enrollment.id,
              course: courseRes.rows[0],
              modules: modulesWithLessons,
            });
          }

          return Response.json({ ok: false, message: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },

      /* ───── POST: Course Enrollment (SumUp) & Lesson Completion ───── */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          if (body?.action === "complete_lesson") {
            const user = await requireStudent(request);
            const input = completeLessonSchema.safeParse(body);
            if (!input.success)
              return Response.json({ ok: false, message: "Dados inválidos." }, { status: 400 });

            const { enrollmentId, lessonId, completed } = input.data;

            const ownership = await query(
              `SELECT 1 FROM universe.academy_enrollments e
                JOIN universe.academy_lessons l ON l.id=$2
                JOIN universe.academy_modules m ON m.id=l.module_id AND m.course_id=e.course_id
               WHERE e.id=$1 AND e.user_id=$3 AND e.status IN ('active','completed')
                 AND m.status='published' AND l.status='published'`,
              [enrollmentId, lessonId, user.id],
            );
            if (!ownership.rowCount)
              return Response.json({ ok: false, message: "Acesso negado." }, { status: 403 });

            if (completed) {
              await query(
                `INSERT INTO universe.academy_student_progress (enrollment_id, lesson_id, completed, completed_at)
                 VALUES ($1, $2, true, now())
                 ON CONFLICT (enrollment_id, lesson_id) DO UPDATE SET completed = true, completed_at = now()`,
                [enrollmentId, lessonId],
              );
            } else {
              await query(
                `DELETE FROM universe.academy_student_progress WHERE enrollment_id = $1 AND lesson_id = $2`,
                [enrollmentId, lessonId],
              );
            }

            return Response.json({ ok: true });
          }

          if (body?.action === "retry_payment") {
            const user = await requireStudent(request);
            const input = retryPaymentSchema.safeParse(body);
            if (!input.success)
              return Response.json({ ok: false, message: "Matrícula inválida." }, { status: 400 });

            const enrollmentResult = await query<{
              id: string;
              title: string;
              amount_paid: string;
            }>(
              `SELECT e.id, e.amount_paid, c.title
                 FROM universe.academy_enrollments e
                 JOIN universe.academy_courses c ON c.id=e.course_id
                WHERE e.id=$1 AND e.user_id=$2 AND e.status='pending'`,
              [input.data.enrollmentId, user.id],
            );
            const enrollment = enrollmentResult.rows[0];
            if (!enrollment)
              return Response.json(
                { ok: false, message: "Matrícula pendente não encontrada." },
                { status: 404 },
              );

            const reference = `acad-${crypto.randomUUID()}`;
            const academyReturnUrl =
              process.env.SUMUP_ACADEMY_RETURN_URL ||
              "https://www.carolsol.com.br/invisible-academy/aluno";
            const sumup = await createSumUpCheckout(
              Number(enrollment.amount_paid),
              reference,
              `Inscrição ${enrollment.title} – Invisible Academy`,
              academyReturnUrl,
            );
            if (!sumup.hosted_checkout_url)
              return Response.json(
                { ok: false, message: "SumUp não retornou URL de checkout." },
                { status: 502 },
              );

            await query(
              `UPDATE universe.academy_enrollments SET sumup_checkout_id=$2 WHERE id=$1`,
              [enrollment.id, sumup.id],
            );
            return Response.json({ ok: true, checkoutUrl: sumup.hosted_checkout_url });
          }

          const enroll = enrollSchema.safeParse(body);
          if (enroll.success) {
            const { courseId, studentName, studentEmail, studentPhone, password } = enroll.data;

            /* Fetch Course price */
            const courseRes = await query<{
              title: string;
              price: string;
              promotional_price: string | null;
            }>(
              `SELECT title, price, promotional_price FROM universe.academy_courses WHERE id = $1 AND status = 'active'`,
              [courseId],
            );
            const course = courseRes.rows[0];
            if (!course)
              return Response.json(
                { ok: false, message: "Curso não encontrado." },
                { status: 404 },
              );

            const amount = course.promotional_price
              ? Number(course.promotional_price)
              : Number(course.price);
            const reference = `acad-${crypto.randomUUID()}`;

            const passwordHash = await bcrypt.hash(password, 12);
            const existingStudent = await query<{
              id: string;
              email: string;
              full_name: string;
              role: SessionUser["role"];
              permissions: string[];
              password_hash: string;
            }>(
              `SELECT id, email, full_name, role, permissions, password_hash FROM universe.users
                WHERE lower(email)=lower($1) AND status <> 'deleted' LIMIT 1`,
              [studentEmail],
            );
            let studentId = existingStudent.rows[0]?.id;
            if (studentId) {
              const validPassword = await bcrypt.compare(
                password,
                existingStudent.rows[0].password_hash,
              );
              if (!validPassword)
                return Response.json(
                  {
                    ok: false,
                    message: "Este e-mail já possui uma conta. Informe a senha correta.",
                  },
                  { status: 409 },
                );
              await query(`UPDATE universe.users SET full_name=$2, updated_at=now() WHERE id=$1`, [
                studentId,
                studentName,
              ]);
            } else {
              const studentResult = await query<{ id: string }>(
                `INSERT INTO universe.users(email, password_hash, full_name, role, status)
                 VALUES(lower($1), $2, $3, 'student', 'active') RETURNING id`,
                [studentEmail, passwordHash, studentName],
              );
              studentId = studentResult.rows[0].id;
            }

            const currentEnrollment = await query<{ status: string }>(
              `SELECT status FROM universe.academy_enrollments
                WHERE user_id=$1 AND course_id=$2 AND status <> 'cancelled'
                LIMIT 1`,
              [studentId, courseId],
            );
            if (currentEnrollment.rowCount) {
              return Response.json(
                {
                  ok: false,
                  message:
                    currentEnrollment.rows[0].status === "pending"
                      ? "Já existe uma matrícula aguardando pagamento para este curso."
                      : "Você já possui matrícula neste curso.",
                },
                { status: 409 },
              );
            }

            /* Save a recoverable pending enrollment before contacting the payment provider. */
            const enrollResult = await query<{ id: string }>(
              `INSERT INTO universe.academy_enrollments
                 (user_id, course_id, student_name, student_email, student_phone, amount_paid, status)
               VALUES ($1, $2, $3, lower($4), $5, $6, 'pending')
               RETURNING id`,
              [studentId, courseId, studentName, studentEmail, studentPhone ?? null, amount],
            );

            await query(
              `INSERT INTO universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
               VALUES(NULL, 'academy.enrollment.created', 'academy_enrollment', $1, $2::jsonb)`,
              [
                enrollResult.rows[0].id,
                JSON.stringify({ courseTitle: course.title, studentEmail, amount }),
              ],
            );

            const sessionUser: SessionUser = existingStudent.rows[0]
              ? {
                  id: studentId,
                  email: existingStudent.rows[0].email,
                  fullName: studentName,
                  role: existingStudent.rows[0].role,
                  permissions: existingStudent.rows[0].permissions ?? [],
                }
              : {
                  id: studentId,
                  email: studentEmail.toLowerCase(),
                  fullName: studentName,
                  role: "student",
                  permissions: [],
                };
            const sessionToken = await createSession(request, sessionUser);
            const headers = { "Set-Cookie": sessionCookie(request, sessionToken) };

            try {
              const academyReturnUrl =
                process.env.SUMUP_ACADEMY_RETURN_URL ||
                "https://www.carolsol.com.br/invisible-academy/aluno";
              const sumup = await createSumUpCheckout(
                amount,
                reference,
                `Inscrição ${course.title} – Invisible Academy`,
                academyReturnUrl,
              );
              if (!sumup.hosted_checkout_url)
                throw new Error("SumUp não retornou URL de checkout.");
              await query(
                `UPDATE universe.academy_enrollments SET sumup_checkout_id=$2 WHERE id=$1`,
                [enrollResult.rows[0].id, sumup.id],
              );
              return Response.json(
                { ok: true, checkoutUrl: sumup.hosted_checkout_url },
                { headers },
              );
            } catch (paymentError) {
              console.error("[Academy API] Matrícula salva; checkout pendente", paymentError);
              return Response.json(
                {
                  ok: true,
                  paymentPending: true,
                  panelUrl: "/invisible-academy/aluno",
                  message:
                    "Sua matrícula foi salva. Finalize o pagamento pela Área do Aluno quando a SumUp estiver disponível.",
                },
                { status: 201, headers },
              );
            }
          }

          return Response.json({ ok: false, message: "Dados inválidos." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
