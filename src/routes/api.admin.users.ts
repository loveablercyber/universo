import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { assertSameOrigin, requireAdmin, requirePermission, readSession } from "@/lib/auth.server";
import { query } from "@/lib/db.server";

const userSchema = z.object({
  action: z.literal("create-user"),
  email: z.string().email().max(254),
  fullName: z.string().min(2).max(160),
  role: z.enum(["admin", "manager", "operator", "customer", "student", "donor", "volunteer"]),
  permissions: z.array(z.string()).default([]),
  password: z.string().min(8).max(200),
});

const updateUserSchema = z.object({
  action: z.literal("update-user"),
  id: z.string().uuid(),
  fullName: z.string().min(2).max(160),
  role: z.enum(["admin", "manager", "operator", "customer", "student", "donor", "volunteer"]),
});

const updatePermissionsSchema = z.object({
  action: z.literal("update-permissions"),
  id: z.string().uuid(),
  permissions: z.array(z.string()),
});

const resetPasswordSchema = z.object({
  action: z.literal("reset-password"),
  id: z.string().uuid(),
  newPassword: z.string().min(8).max(200),
});

const changeOwnPasswordSchema = z.object({
  action: z.literal("change-own-password"),
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(200),
});

const toggleStatusSchema = z.object({
  action: z.enum(["block-user", "reactivate-user"]),
  id: z.string().uuid(),
});

const revokeSessionsSchema = z.object({
  action: z.literal("revoke-sessions"),
  id: z.string().uuid(),
});

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  await query(
    `insert into universe.audit_logs(actor_id, action, entity_type, entity_id, metadata)
     values($1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, entityType, entityId, JSON.stringify(metadata)],
  );
}

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  return Response.json(
    { ok: false, message: "Não foi possível concluir a operação." },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "users.read"); // Ensure user can read users
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "list";

          if (action === "list") {
            const { rows } = await query(
              `select id, email, full_name as "fullName", role, status, permissions,
                      created_at as "createdAt", last_login_at as "lastLoginAt"
                 from universe.users
                 where status <> 'deleted'
                 order by created_at desc limit 500`,
            );
            return Response.json({ ok: true, users: rows });
          }

          if (action === "detail") {
            const id = url.searchParams.get("id");
            if (!id)
              return Response.json({ ok: false, message: "ID obrigatório" }, { status: 400 });

            const [userResult, sessionsResult] = await Promise.all([
              query(
                `select id, email, full_name as "fullName", role, status, permissions,
                        created_at as "createdAt", last_login_at as "lastLoginAt"
                   from universe.users
                  where id = $1`,
                [id],
              ),
              query(
                `select token_hash as id, ip_address as "ipAddress", user_agent as "userAgent",
                        created_at as "createdAt", expires_at as "expiresAt"
                   from universe.sessions
                  where user_id = $1 and expires_at > now()
                  order by created_at desc`,
                [id],
              ),
            ]);

            const user = userResult.rows[0];
            if (!user)
              return Response.json(
                { ok: false, message: "Usuário não encontrado" },
                { status: 404 },
              );

            return Response.json({ ok: true, user, sessions: sessionsResult.rows });
          }

          return Response.json({ ok: false, message: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const body = await request.json();

          if (body?.action === "change-own-password") {
            const user = await readSession(request);
            if (!user)
              return Response.json({ ok: false, message: "Não autorizado" }, { status: 401 });

            const pass = changeOwnPasswordSchema.safeParse(body);
            if (pass.success) {
              const result = await query(`select password_hash from universe.users where id=$1`, [
                user.id,
              ]);
              const record = result.rows[0];
              if (
                !record ||
                !(await bcrypt.compare(pass.data.currentPassword, record.password_hash))
              ) {
                return Response.json(
                  { ok: false, message: "Senha atual incorreta" },
                  { status: 400 },
                );
              }
              const newHash = await bcrypt.hash(pass.data.newPassword, 12);
              await query(
                `update universe.users set password_hash=$2, updated_at=now() where id=$1`,
                [user.id, newHash],
              );
              await audit(user.id, "user.password_changed", "user", user.id);
              return Response.json({ ok: true });
            }
          }

          // Todas as outras ações requerem permissão users.write ou role admin
          const actor = await requireAdmin(request);

          const create = userSchema.safeParse(body);
          if (create.success) {
            const passwordHash = await bcrypt.hash(create.data.password, 12);
            const { rows } = await query<{ id: string }>(
              `insert into universe.users(email, full_name, role, permissions, password_hash)
               values($1, $2, $3, $4::jsonb, $5) returning id`,
              [
                create.data.email,
                create.data.fullName,
                create.data.role,
                JSON.stringify(create.data.permissions),
                passwordHash,
              ],
            );
            await audit(actor.id, "user.created", "user", rows[0].id, { role: create.data.role });
            return Response.json({ ok: true, id: rows[0].id });
          }

          const update = updateUserSchema.safeParse(body);
          if (update.success) {
            await query(
              `update universe.users set full_name=$2, role=$3, updated_at=now() where id=$1`,
              [update.data.id, update.data.fullName, update.data.role],
            );
            await audit(actor.id, "user.updated", "user", update.data.id, {
              role: update.data.role,
            });
            return Response.json({ ok: true });
          }

          const perms = updatePermissionsSchema.safeParse(body);
          if (perms.success) {
            await query(
              `update universe.users set permissions=$2::jsonb, updated_at=now() where id=$1`,
              [perms.data.id, JSON.stringify(perms.data.permissions)],
            );
            await audit(actor.id, "user.permissions_updated", "user", perms.data.id, {
              permissions: perms.data.permissions,
            });
            return Response.json({ ok: true });
          }

          const reset = resetPasswordSchema.safeParse(body);
          if (reset.success) {
            const newHash = await bcrypt.hash(reset.data.newPassword, 12);
            await query(
              `update universe.users set password_hash=$2, updated_at=now() where id=$1`,
              [reset.data.id, newHash],
            );
            await audit(actor.id, "user.password_reset", "user", reset.data.id);

            // Revoke all sessions on password reset
            await query(`delete from universe.sessions where user_id=$1`, [reset.data.id]);

            return Response.json({ ok: true });
          }

          const toggle = toggleStatusSchema.safeParse(body);
          if (toggle.success) {
            const newStatus = toggle.data.action === "block-user" ? "blocked" : "active";
            await query(`update universe.users set status=$2, updated_at=now() where id=$1`, [
              toggle.data.id,
              newStatus,
            ]);
            await audit(actor.id, `user.${newStatus}`, "user", toggle.data.id);

            if (newStatus === "blocked") {
              await query(`delete from universe.sessions where user_id=$1`, [toggle.data.id]);
            }
            return Response.json({ ok: true });
          }

          const revoke = revokeSessionsSchema.safeParse(body);
          if (revoke.success) {
            await query(`delete from universe.sessions where user_id=$1`, [revoke.data.id]);
            await audit(actor.id, "user.sessions_revoked", "user", revoke.data.id);
            return Response.json({ ok: true });
          }

          return Response.json({ ok: false, message: "Dados inválidos." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
