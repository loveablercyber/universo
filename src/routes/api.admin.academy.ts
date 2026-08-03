import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query } from "@/lib/db.server";
import bcrypt from "bcryptjs";

const courseSchema = z.object({
  action: z.literal("save-course"),
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(100),
  title: z.string().min(2).max(160),
  subtitle: z.string().max(200).optional(),
  description: z.string().min(5).max(2000),
  price: z.number().min(0),
  promotionalPrice: z.number().min(0).nullable().optional(),
  imageUrl: z.string().min(1),
  badge: z.string().max(50).optional(),
  level: z.string().max(50).default("Iniciante"),
  workloadHours: z.number().int().min(1).default(10),
  status: z.enum(["active", "draft", "archived"]),
});

const moduleSchema = z.object({
  action: z.literal("save-module"),
  id: z.string().uuid().optional(),
  courseId: z.string().uuid(),
  title: z.string().min(2).max(160),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().default(0),
});

const lessonSchema = z.object({
  action: z.literal("save-lesson"),
  id: z.string().uuid().optional(),
  moduleId: z.string().uuid(),
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  videoUrl: z.string().min(1),
  durationMinutes: z.number().int().min(1).default(10),
  sortOrder: z.number().int().default(0),
  isPreview: z.boolean().default(false),
});

const manualEnrollmentSchema = z.object({
  action: z.literal("manual-enrollment"),
  courseId: z.string().uuid(),
  studentName: z.string().min(2),
  studentEmail: z.string().email(),
  studentPhone: z.string().optional(),
  password: z.string().min(12),
});

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  await query(
    `INSERT INTO universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
     VALUES($1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, entityType, entityId, JSON.stringify(metadata)],
  );
}

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error("[Admin Academy API]", error);
  return Response.json(
    { ok: false, message: "Não foi possível concluir a operação EAD." },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/admin/academy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "academy.read");
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "courses";

          if (action === "courses") {
            const { rows } = await query(
              `SELECT c.id, c.slug, c.title, c.subtitle, c.description,
                      c.price::float as price, c.promotional_price::float as "promotionalPrice",
                      c.image_url as "imageUrl", c.badge, c.level, c.workload_hours as "workloadHours",
                      c.status, c.created_at as "createdAt",
                      (SELECT count(*) FROM universe.academy_enrollments e WHERE e.course_id = c.id) as "studentsCount"
                 FROM universe.academy_courses c
                ORDER BY c.created_at DESC`,
            );
            return Response.json({ ok: true, courses: rows });
          }

          if (action === "modules_lessons") {
            const courseId = url.searchParams.get("courseId");
            if (!courseId)
              return Response.json({ ok: false, message: "ID do curso ausente." }, { status: 400 });

            const modulesRes = await query<{
              id: string;
              title: string;
              description: string;
              sort_order: number;
            }>(
              `SELECT id, title, description, sort_order as "sortOrder"
                 FROM universe.academy_modules
                WHERE course_id = $1
                ORDER BY sort_order ASC`,
              [courseId],
            );

            const modulesWithLessons = await Promise.all(
              modulesRes.rows.map(async (m) => {
                const lessonsRes = await query(
                  `SELECT id, title, description, video_url as "videoUrl", duration_minutes as "durationMinutes",
                          sort_order as "sortOrder", is_preview as "isPreview"
                     FROM universe.academy_lessons
                    WHERE module_id = $1
                    ORDER BY sort_order ASC`,
                  [m.id],
                );
                return { ...m, lessons: lessonsRes.rows };
              }),
            );

            return Response.json({ ok: true, modules: modulesWithLessons });
          }

          if (action === "enrollments") {
            const { rows } = await query(
              `SELECT e.id, e.student_name as "studentName", e.student_email as "studentEmail",
                      e.student_phone as "studentPhone", e.amount_paid::float as "amountPaid",
                      e.status, e.enrolled_at as "enrolledAt", e.payment_confirmed_at as "paymentConfirmedAt",
                      c.title as "courseTitle", c.subtitle as "courseSubtitle",
                      count(distinct p.lesson_id) filter (where p.completed)::int as "completedLessons",
                      count(distinct l.id)::int as "totalLessons"
                 FROM universe.academy_enrollments e
                 JOIN universe.academy_courses c ON c.id = e.course_id
                 LEFT JOIN universe.academy_modules m ON m.course_id = c.id
                 LEFT JOIN universe.academy_lessons l ON l.module_id = m.id
                 LEFT JOIN universe.academy_student_progress p ON p.enrollment_id = e.id AND p.lesson_id = l.id
                GROUP BY e.id, c.id
                ORDER BY e.enrolled_at DESC LIMIT 200`,
            );
            return Response.json({ ok: true, enrollments: rows });
          }

          return Response.json({ ok: false, message: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },

      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const actor = await requirePermission(request, "academy.write");
          const body = await request.json();

          const course = courseSchema.safeParse(body);
          if (course.success) {
            const v = course.data;
            let id = v.id;

            if (id) {
              await query(
                `UPDATE universe.academy_courses
                    SET slug=$2, title=$3, subtitle=NULLIF($4, ''), description=$5,
                        price=$6, promotional_price=$7, image_url=$8, badge=$9,
                        level=$10, workload_hours=$11, status=$12, updated_at=now()
                  WHERE id=$1`,
                [
                  id,
                  v.slug,
                  v.title,
                  v.subtitle ?? "",
                  v.description,
                  v.price,
                  v.promotionalPrice ?? null,
                  v.imageUrl,
                  v.badge ?? "EXCLUSIVO",
                  v.level,
                  v.workloadHours,
                  v.status,
                ],
              );
            } else {
              const { rows } = await query<{ id: string }>(
                `INSERT INTO universe.academy_courses
                   (slug, title, subtitle, description, price, promotional_price, image_url, badge, level, workload_hours, status)
                 VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING id`,
                [
                  v.slug,
                  v.title,
                  v.subtitle ?? "",
                  v.description,
                  v.price,
                  v.promotionalPrice ?? null,
                  v.imageUrl,
                  v.badge ?? "EXCLUSIVO",
                  v.level,
                  v.workloadHours,
                  v.status,
                ],
              );
              id = rows[0]?.id;
            }

            await audit(
              actor.id,
              v.id ? "academy.course.updated" : "academy.course.created",
              "academy_course",
              id,
            );
            return Response.json({ ok: true, id });
          }

          const moduleInput = moduleSchema.safeParse(body);
          if (moduleInput.success) {
            const v = moduleInput.data;
            let id = v.id;

            if (id) {
              await query(
                `UPDATE universe.academy_modules SET title=$2, description=NULLIF($3, ''), sort_order=$4 WHERE id=$1`,
                [id, v.title, v.description ?? "", v.sortOrder],
              );
            } else {
              const { rows } = await query<{ id: string }>(
                `INSERT INTO universe.academy_modules (course_id, title, description, sort_order)
                 VALUES ($1, $2, NULLIF($3, ''), $4) RETURNING id`,
                [v.courseId, v.title, v.description ?? "", v.sortOrder],
              );
              id = rows[0]?.id;
            }

            return Response.json({ ok: true, id });
          }

          const lessonInput = lessonSchema.safeParse(body);
          if (lessonInput.success) {
            const v = lessonInput.data;
            let id = v.id;

            if (id) {
              await query(
                `UPDATE universe.academy_lessons
                    SET title=$2, description=NULLIF($3, ''), video_url=$4,
                        duration_minutes=$5, sort_order=$6, is_preview=$7
                  WHERE id=$1`,
                [
                  id,
                  v.title,
                  v.description ?? "",
                  v.videoUrl,
                  v.durationMinutes,
                  v.sortOrder,
                  v.isPreview,
                ],
              );
            } else {
              const { rows } = await query<{ id: string }>(
                `INSERT INTO universe.academy_lessons
                   (module_id, title, description, video_url, duration_minutes, sort_order, is_preview)
                 VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7) RETURNING id`,
                [
                  v.moduleId,
                  v.title,
                  v.description ?? "",
                  v.videoUrl,
                  v.durationMinutes,
                  v.sortOrder,
                  v.isPreview,
                ],
              );
              id = rows[0]?.id;
            }

            return Response.json({ ok: true, id });
          }

          const manualEnroll = manualEnrollmentSchema.safeParse(body);
          if (manualEnroll.success) {
            const { courseId, studentName, studentEmail, studentPhone, password } =
              manualEnroll.data;
            const passwordHash = await bcrypt.hash(password, 12);
            const userResult = await query<{ id: string }>(
              `INSERT INTO universe.users(email, password_hash, full_name, role, status)
               VALUES(lower($1), $2, $3, 'student', 'active')
               ON CONFLICT (lower(email)) WHERE status <> 'deleted'
               DO UPDATE SET full_name=excluded.full_name, updated_at=now()
               RETURNING id`,
              [studentEmail, passwordHash, studentName],
            );
            const { rows } = await query<{ id: string }>(
              `INSERT INTO universe.academy_enrollments (user_id, course_id, student_name, student_email, student_phone, amount_paid, status, payment_confirmed_at)
               VALUES ($1, $2, $3, lower($4), $5, 0.0, 'active', now()) RETURNING id`,
              [userResult.rows[0].id, courseId, studentName, studentEmail, studentPhone ?? null],
            );

            await audit(actor.id, "academy.enrollment.manual", "academy_enrollment", rows[0].id, {
              studentEmail,
              courseId,
            });
            return Response.json({ ok: true, id: rows[0].id });
          }

          return Response.json({ ok: false, message: "Dados inválidos." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
