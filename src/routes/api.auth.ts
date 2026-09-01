import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  assertSameOrigin,
  authenticate,
  clearSessionCookie,
  createSession,
  destroySession,
  replaceUserPassword,
  readSession,
  sessionCookie,
  checkRateLimit,
  recordFailedLogin,
  clearFailedLogins,
  consumeSsoCode,
  createSsoCode,
  requestPublicOrigin,
} from "@/lib/auth.server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { hashToken, query } from "@/lib/db.server";
import { dispatchNotification } from "@/lib/notifications.server";

const loginSchema = z.object({
  action: z.literal("login"),
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(8).max(200),
});
const requestResetSchema = z.object({
  action: z.literal("request-password-reset"),
  email: z.string().email().max(254),
});
const resetPasswordSchema = z.object({
  action: z.literal("reset-password"),
  token: z.string().min(32).max(200),
  password: z.string().min(12).max(200),
});

function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const publicOrigin = requestPublicOrigin(request);
          const ssoCode = url.searchParams.get("sso_code");
          if (ssoCode) {
            const consumed = await consumeSsoCode(ssoCode, publicOrigin);
            if (!consumed) {
              return new Response(null, {
                status: 302,
                headers: { Location: `${publicOrigin}/conta?sso=invalid` },
              });
            }
            const token = await createSession(request, consumed.user);
            return new Response(null, {
              status: 302,
              headers: {
                Location: new URL(consumed.returnPath, publicOrigin).toString(),
                "Set-Cookie": sessionCookie(request, token),
                "Cache-Control": "no-store",
              },
            });
          }

          const ssoTarget = url.searchParams.get("sso_start");
          if (ssoTarget) {
            const user = await readSession(request);
            if (!user) {
              const next = `${url.pathname}${url.search}`;
              return new Response(null, {
                status: 302,
                headers: { Location: `${publicOrigin}/conta?next=${encodeURIComponent(next)}` },
              });
            }
            const issued = await createSsoCode(
              user,
              ssoTarget,
              url.searchParams.get("returnTo"),
              publicOrigin,
            );
            const destination = new URL("/api/auth", issued.target);
            destination.searchParams.set("sso_code", issued.code);
            return new Response(null, {
              status: 302,
              headers: { Location: destination.toString(), "Cache-Control": "no-store" },
            });
          }

          const user = await readSession(request);
          return Response.json({ ok: true, user }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          if (error instanceof Response) return error;
          return jsonError("Banco de dados indisponível.", 503);
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const body = await request.json();

          if (body?.action === "logout") {
            await destroySession(request);
            return Response.json(
              { ok: true, user: null },
              { headers: { "Set-Cookie": clearSessionCookie(request) } },
            );
          }

          const resetRequest = requestResetSchema.safeParse(body);
          if (resetRequest.success) {
            const user = await query<{ id: string; email: string; full_name: string }>(
              `select id, email, full_name from universe.users where lower(email)=lower($1) and status='active' limit 1`,
              [resetRequest.data.email],
            );
            if (user.rows[0]) {
              const token = randomBytes(32).toString("base64url");
              const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
              await query(
                `delete from universe.password_reset_tokens where user_id=$1 and used_at is null`,
                [user.rows[0].id],
              );
              await query(
                `insert into universe.password_reset_tokens(user_id, token_hash, expires_at, requested_ip) values($1,$2,now()+interval '30 minutes',$3::inet)`,
                [user.rows[0].id, hashToken(token), ip],
              );
              const resetUrl = `${process.env.APP_URL || new URL(request.url).origin}/redefinir-senha?token=${encodeURIComponent(token)}`;
              await dispatchNotification({
                channel: "email",
                recipient: user.rows[0].email,
                subject: "Redefinição de senha | Universo Carol Sol",
                templateName: "password_reset",
                payload: { fullName: user.rows[0].full_name, resetUrl },
              });
            }
            return Response.json({
              ok: true,
              message: "Se o e-mail estiver cadastrado, enviaremos as instruções.",
            });
          }

          const passwordReset = resetPasswordSchema.safeParse(body);
          if (passwordReset.success) {
            const token = await query<{ id: string; user_id: string }>(
              `update universe.password_reset_tokens set used_at=now() where token_hash=$1 and used_at is null and expires_at>now() returning id, user_id`,
              [hashToken(passwordReset.data.token)],
            );
            if (!token.rows[0]) return jsonError("Link inválido ou expirado.", 400);
            const passwordHash = await bcrypt.hash(passwordReset.data.password, 12);
            await replaceUserPassword(token.rows[0].user_id, passwordHash);
            await query(
              `insert into universe.audit_logs(actor_id, action, entity_type, entity_id) values($1,'user.password_recovered','user',$1)`,
              [token.rows[0].user_id],
            );
            return Response.json({ ok: true });
          }

          const input = loginSchema.safeParse({
            ...body,
            identifier: body?.identifier ?? body?.email,
          });
          if (!input.success) return jsonError("Dados de acesso inválidos.", 400);

          const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
          await checkRateLimit(ip);

          const user = await authenticate(input.data.identifier, input.data.password);
          if (!user) {
            await recordFailedLogin(ip);
            return jsonError("E-mail ou senha incorretos.", 401);
          }
          await clearFailedLogins(ip);

          const token = await createSession(request, user);
          return Response.json(
            { ok: true, user },
            { headers: { "Set-Cookie": sessionCookie(request, token) } },
          );
        } catch (error) {
          if (error instanceof Response) return error;
          console.error(error);
          return jsonError("Não foi possível concluir a autenticação.", 503);
        }
      },
    },
  },
});
