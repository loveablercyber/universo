import bcrypt from "bcryptjs";
import { createFileRoute } from "@tanstack/react-router";
import type { PoolClient } from "pg";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query, withTransaction } from "@/lib/db.server";

const contentStatus = z.enum(["draft", "published", "archived"]);
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
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).default(0),
  status: contentStatus.default("published"),
});
const lessonSchema = z.object({
  action: z.literal("save-lesson"),
  id: z.string().uuid().optional(),
  moduleId: z.string().uuid(),
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  videoUrl: z.string().min(1).max(1000),
  durationMinutes: z.number().int().min(1).default(10),
  sortOrder: z.number().int().min(0).default(0),
  isPreview: z.boolean().default(false),
  status: contentStatus.default("published"),
});
const contentActionSchema = z.object({
  action: z.enum(["archive-content", "restore-content", "duplicate-content"]),
  entity: z.enum(["module", "lesson"]),
  id: z.string().uuid(),
});
const reorderSchema = z.object({
  action: z.enum(["reorder-modules", "reorder-lessons"]),
  parentId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1).max(500),
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
  client: PoolClient,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  await client.query(
    `INSERT INTO universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
     VALUES($1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, entityType, entityId, JSON.stringify(metadata)],
  );
}

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return Response.json(
      { ok: false, message: "Este registro já existe ou está ativo." },
      { status: 409 },
    );
  }
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
              `SELECT c.id, c.slug, c.title, c.subtitle, c.description, c.price::float as price,
                    c.promotional_price::float as "promotionalPrice", c.image_url as "imageUrl", c.badge,
                    c.level, c.workload_hours as "workloadHours", c.status, c.created_at as "createdAt",
                    (SELECT count(*)::int FROM universe.academy_enrollments e WHERE e.course_id=c.id) as "studentsCount"
               FROM universe.academy_courses c ORDER BY c.created_at DESC`,
            );
            return Response.json({ ok: true, courses: rows });
          }
          if (action === "modules_lessons") {
            const courseId = url.searchParams.get("courseId");
            if (!courseId)
              return Response.json({ ok: false, message: "ID do curso ausente." }, { status: 400 });
            const [modulesResult, lessonsResult] = await Promise.all([
              query<{
                id: string;
                title: string;
                description?: string;
                sortOrder: number;
                status: string;
              }>(
                `SELECT id, title, description, sort_order as "sortOrder", status
                 FROM universe.academy_modules WHERE course_id=$1 ORDER BY sort_order, created_at`,
                [courseId],
              ),
              query<{
                id: string;
                moduleId: string;
                title: string;
                description?: string;
                videoUrl: string;
                durationMinutes: number;
                sortOrder: number;
                isPreview: boolean;
                status: string;
              }>(
                `SELECT l.id, l.module_id as "moduleId", l.title, l.description, l.video_url as "videoUrl",
                      l.duration_minutes as "durationMinutes", l.sort_order as "sortOrder", l.is_preview as "isPreview", l.status
                 FROM universe.academy_lessons l JOIN universe.academy_modules m ON m.id=l.module_id
                WHERE m.course_id=$1 ORDER BY l.sort_order, l.created_at`,
                [courseId],
              ),
            ]);
            const lessonsByModule = new Map<string, typeof lessonsResult.rows>();
            for (const lesson of lessonsResult.rows) {
              const list = lessonsByModule.get(lesson.moduleId) ?? [];
              list.push(lesson);
              lessonsByModule.set(lesson.moduleId, list);
            }
            return Response.json({
              ok: true,
              modules: modulesResult.rows.map((m) => ({
                ...m,
                lessons: lessonsByModule.get(m.id) ?? [],
              })),
            });
          }
          if (action === "enrollments") {
            const { rows } = await query(
              `SELECT e.id, e.student_name as "studentName", e.student_email as "studentEmail", e.student_phone as "studentPhone",
                    e.amount_paid::float as "amountPaid", e.status, e.enrolled_at as "enrolledAt",
                    e.payment_confirmed_at as "paymentConfirmedAt", c.title as "courseTitle", c.subtitle as "courseSubtitle",
                    count(distinct p.lesson_id) filter (where p.completed)::int as "completedLessons",
                    count(distinct l.id) filter (where l.status='published' and m.status='published')::int as "totalLessons"
               FROM universe.academy_enrollments e JOIN universe.academy_courses c ON c.id=e.course_id
               LEFT JOIN universe.academy_modules m ON m.course_id=c.id
               LEFT JOIN universe.academy_lessons l ON l.module_id=m.id
               LEFT JOIN universe.academy_student_progress p ON p.enrollment_id=e.id AND p.lesson_id=l.id
              GROUP BY e.id, c.id ORDER BY e.enrolled_at DESC LIMIT 200`,
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
            const id = await withTransaction(async (client) => {
              if (v.id) {
                const updated = await client.query<{ id: string }>(
                  `UPDATE universe.academy_courses SET slug=$2,title=$3,subtitle=NULLIF($4,''),description=$5,price=$6,
                  promotional_price=$7,image_url=$8,badge=$9,level=$10,workload_hours=$11,status=$12,updated_at=now()
                 WHERE id=$1 RETURNING id`,
                  [
                    v.id,
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
                if (!updated.rowCount) throw new Response("Curso não encontrado.", { status: 404 });
                await audit(client, actor.id, "academy.course.updated", "academy_course", v.id);
                return v.id;
              }
              const inserted = await client.query<{ id: string }>(
                `INSERT INTO universe.academy_courses(slug,title,subtitle,description,price,promotional_price,image_url,badge,level,workload_hours,status)
               VALUES($1,$2,NULLIF($3,''),$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
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
              await audit(
                client,
                actor.id,
                "academy.course.created",
                "academy_course",
                inserted.rows[0].id,
              );
              return inserted.rows[0].id;
            });
            return Response.json({ ok: true, id });
          }

          const moduleInput = moduleSchema.safeParse(body);
          if (moduleInput.success) {
            const v = moduleInput.data;
            const id = await withTransaction(async (client) => {
              if (v.id) {
                const updated = await client.query<{ id: string }>(
                  `UPDATE universe.academy_modules SET title=$3,description=NULLIF($4,''),sort_order=$5,status=$6,
                  archived_at=CASE WHEN $6='archived' THEN coalesce(archived_at,now()) ELSE NULL END,updated_at=now()
                 WHERE id=$1 AND course_id=$2 RETURNING id`,
                  [v.id, v.courseId, v.title, v.description ?? "", v.sortOrder, v.status],
                );
                if (!updated.rowCount)
                  throw new Response("Módulo não encontrado neste curso.", { status: 404 });
                await audit(client, actor.id, "academy.module.updated", "academy_module", v.id, {
                  courseId: v.courseId,
                });
                return v.id;
              }
              const inserted = await client.query<{ id: string }>(
                `INSERT INTO universe.academy_modules(course_id,title,description,sort_order,status) VALUES($1,$2,NULLIF($3,''),$4,$5) RETURNING id`,
                [v.courseId, v.title, v.description ?? "", v.sortOrder, v.status],
              );
              await audit(
                client,
                actor.id,
                "academy.module.created",
                "academy_module",
                inserted.rows[0].id,
                { courseId: v.courseId },
              );
              return inserted.rows[0].id;
            });
            return Response.json({ ok: true, id });
          }

          const lessonInput = lessonSchema.safeParse(body);
          if (lessonInput.success) {
            const v = lessonInput.data;
            const id = await withTransaction(async (client) => {
              if (v.id) {
                const updated = await client.query<{ id: string }>(
                  `UPDATE universe.academy_lessons SET title=$3,description=NULLIF($4,''),video_url=$5,duration_minutes=$6,
                  sort_order=$7,is_preview=$8,status=$9,archived_at=CASE WHEN $9='archived' THEN coalesce(archived_at,now()) ELSE NULL END,updated_at=now()
                 WHERE id=$1 AND module_id=$2 RETURNING id`,
                  [
                    v.id,
                    v.moduleId,
                    v.title,
                    v.description ?? "",
                    v.videoUrl,
                    v.durationMinutes,
                    v.sortOrder,
                    v.isPreview,
                    v.status,
                  ],
                );
                if (!updated.rowCount)
                  throw new Response("Aula não encontrada neste módulo.", { status: 404 });
                await audit(client, actor.id, "academy.lesson.updated", "academy_lesson", v.id, {
                  moduleId: v.moduleId,
                });
                return v.id;
              }
              const inserted = await client.query<{ id: string }>(
                `INSERT INTO universe.academy_lessons(module_id,title,description,video_url,duration_minutes,sort_order,is_preview,status)
               VALUES($1,$2,NULLIF($3,''),$4,$5,$6,$7,$8) RETURNING id`,
                [
                  v.moduleId,
                  v.title,
                  v.description ?? "",
                  v.videoUrl,
                  v.durationMinutes,
                  v.sortOrder,
                  v.isPreview,
                  v.status,
                ],
              );
              await audit(
                client,
                actor.id,
                "academy.lesson.created",
                "academy_lesson",
                inserted.rows[0].id,
                { moduleId: v.moduleId },
              );
              return inserted.rows[0].id;
            });
            return Response.json({ ok: true, id });
          }

          const contentAction = contentActionSchema.safeParse(body);
          if (contentAction.success) {
            const v = contentAction.data;
            const resultId = await withTransaction(async (client) => {
              const table = v.entity === "module" ? "academy_modules" : "academy_lessons";
              const entityType = `academy_${v.entity}`;
              if (v.action === "archive-content" || v.action === "restore-content") {
                const status = v.action === "archive-content" ? "archived" : "published";
                const updated = await client.query<{ id: string }>(
                  `UPDATE universe.${table} SET status=$2,archived_at=CASE WHEN $2='archived' THEN now() ELSE NULL END,updated_at=now() WHERE id=$1 RETURNING id`,
                  [v.id, status],
                );
                if (!updated.rowCount)
                  throw new Response("Conteúdo não encontrado.", { status: 404 });
                await audit(
                  client,
                  actor.id,
                  `academy.${v.entity}.${status === "archived" ? "archived" : "restored"}`,
                  entityType,
                  v.id,
                );
                return v.id;
              }
              if (v.entity === "module") {
                const source = await client.query<{
                  course_id: string;
                  title: string;
                  description?: string;
                  sort_order: number;
                }>(
                  `SELECT course_id,title,description,sort_order FROM universe.academy_modules WHERE id=$1`,
                  [v.id],
                );
                if (!source.rowCount) throw new Response("Módulo não encontrado.", { status: 404 });
                const m = source.rows[0];
                const copy = await client.query<{ id: string }>(
                  `INSERT INTO universe.academy_modules(course_id,title,description,sort_order,status)
                 VALUES($1,$2,$3,$4,'draft') RETURNING id`,
                  [m.course_id, `${m.title} (cópia)`, m.description ?? null, m.sort_order + 1],
                );
                await client.query(
                  `INSERT INTO universe.academy_lessons(module_id,title,description,video_url,duration_minutes,sort_order,is_preview,status)
                 SELECT $1,title,description,video_url,duration_minutes,sort_order,is_preview,'draft' FROM universe.academy_lessons WHERE module_id=$2 AND status<>'archived'`,
                  [copy.rows[0].id, v.id],
                );
                await audit(
                  client,
                  actor.id,
                  "academy.module.duplicated",
                  entityType,
                  copy.rows[0].id,
                  { sourceId: v.id },
                );
                return copy.rows[0].id;
              }
              const copy = await client.query<{ id: string }>(
                `INSERT INTO universe.academy_lessons(module_id,title,description,video_url,duration_minutes,sort_order,is_preview,status)
               SELECT module_id,title||' (cópia)',description,video_url,duration_minutes,sort_order+1,is_preview,'draft'
                 FROM universe.academy_lessons WHERE id=$1 RETURNING id`,
                [v.id],
              );
              if (!copy.rowCount) throw new Response("Aula não encontrada.", { status: 404 });
              await audit(
                client,
                actor.id,
                "academy.lesson.duplicated",
                entityType,
                copy.rows[0].id,
                { sourceId: v.id },
              );
              return copy.rows[0].id;
            });
            return Response.json({ ok: true, id: resultId });
          }

          const reorder = reorderSchema.safeParse(body);
          if (reorder.success) {
            const v = reorder.data;
            await withTransaction(async (client) => {
              const table = v.action === "reorder-modules" ? "academy_modules" : "academy_lessons";
              const parentColumn = v.action === "reorder-modules" ? "course_id" : "module_id";
              const owned = await client.query<{ id: string }>(
                `SELECT id FROM universe.${table} WHERE ${parentColumn}=$1 AND id=ANY($2::uuid[])`,
                [v.parentId, v.ids],
              );
              if (owned.rowCount !== v.ids.length)
                throw new Response("A ordem contém itens de outro grupo.", { status: 400 });
              for (const [index, id] of v.ids.entries())
                await client.query(
                  `UPDATE universe.${table} SET sort_order=$2,updated_at=now() WHERE id=$1`,
                  [id, index + 1],
                );
              await audit(client, actor.id, `academy.${table}.reordered`, table, v.parentId, {
                ids: v.ids,
              });
            });
            return Response.json({ ok: true });
          }

          const manualEnroll = manualEnrollmentSchema.safeParse(body);
          if (manualEnroll.success) {
            const { courseId, studentName, studentEmail, studentPhone, password } =
              manualEnroll.data;
            const passwordHash = await bcrypt.hash(password, 12);
            const id = await withTransaction(async (client) => {
              const userResult = await client.query<{ id: string }>(
                `INSERT INTO universe.users(email,password_hash,full_name,role,status) VALUES(lower($1),$2,$3,'student','active')
               ON CONFLICT (lower(email)) WHERE status<>'deleted' DO UPDATE SET full_name=excluded.full_name,updated_at=now() RETURNING id`,
                [studentEmail, passwordHash, studentName],
              );
              const enrollment = await client.query<{ id: string }>(
                `INSERT INTO universe.academy_enrollments(user_id,course_id,student_name,student_email,student_phone,amount_paid,status,payment_confirmed_at,source,created_by)
               VALUES($1,$2,$3,lower($4),$5,0,'active',now(),'manual',$6) RETURNING id`,
                [
                  userResult.rows[0].id,
                  courseId,
                  studentName,
                  studentEmail,
                  studentPhone ?? null,
                  actor.id,
                ],
              );
              await audit(
                client,
                actor.id,
                "academy.enrollment.manual",
                "academy_enrollment",
                enrollment.rows[0].id,
                { studentEmail, courseId },
              );
              return enrollment.rows[0].id;
            });
            return Response.json({ ok: true, id });
          }
          return Response.json(
            { ok: false, message: "Dados inválidos. Revise os campos enviados." },
            { status: 400 },
          );
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
