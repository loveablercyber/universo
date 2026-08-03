import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { hashToken, query } from "./db.server";

const COOKIE_NAME = "universo_carol_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "manager" | "operator" | "customer" | "student" | "donor" | "volunteer";
  permissions: string[];
};

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(value.join("="));
  }
  return null;
}

function secureCookie(request: Request) {
  const override = process.env.SESSION_COOKIE_SECURE?.toLowerCase();
  if (["false", "0", "no"].includes(override ?? "")) return false;
  if (["true", "1", "yes"].includes(override ?? "")) return true;
  return new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production";
}

export function sessionCookie(request: Request, token: string) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${SESSION_SECONDS}`,
    secureCookie(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearSessionCookie(request: Request) {
  return [
    `${COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
    secureCookie(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const publicOrigin = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : forwardedHost
      ? `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost}`
      : requestUrl.origin;

  if (origin !== publicOrigin) {
    throw new Response("Origem não autorizada.", { status: 403 });
  }
}

export async function authenticate(email: string, password: string) {
  const result = await query<
    SessionUser & { password_hash: string; status: string; full_name: string }
  >(
    `select id, email, password_hash, full_name, role, status, permissions
       from universe.users
      where lower(email)=lower($1)
      limit 1`,
    [email],
  );
  const record = result.rows[0];
  if (!record || record.status !== "active") return null;
  if (!(await bcrypt.compare(password, record.password_hash))) return null;
  return {
    id: record.id,
    email: record.email,
    fullName: record.full_name,
    role: record.role,
    permissions: record.permissions ?? [],
  } satisfies SessionUser;
}

export async function createSession(request: Request, user: SessionUser) {
  const token = randomBytes(32).toString("base64url");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  await query(
    `insert into universe.sessions(
       user_id, token_hash, expires_at, ip_address, user_agent
     ) values($1, $2, now() + interval '7 days', $3::inet, $4)`,
    [user.id, hashToken(token), ip, request.headers.get("user-agent")],
  );
  await query("update universe.users set last_login_at=now(), updated_at=now() where id=$1", [
    user.id,
  ]);
  return token;
}

export async function readSession(request: Request): Promise<SessionUser | null> {
  const token = cookieValue(request);
  if (!token) return null;
  const result = await query<{
    id: string;
    email: string;
    full_name: string;
    role: SessionUser["role"];
    permissions: string[];
  }>(
    `select u.id, u.email, u.full_name, u.role, u.permissions
       from universe.sessions s
       join universe.users u on u.id=s.user_id
      where s.token_hash=$1
        and s.expires_at > now()
        and u.status='active'
      limit 1`,
    [hashToken(token)],
  );
  const user = result.rows[0];
  return user
    ? {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        permissions: user.permissions,
      }
    : null;
}

export async function destroySession(request: Request) {
  const token = cookieValue(request);
  if (token) await query("delete from universe.sessions where token_hash=$1", [hashToken(token)]);
}

export async function requireAdmin(request: Request) {
  const user = await readSession(request);
  if (!user) throw new Response("Autenticação necessária.", { status: 401 });
  if (!["admin", "manager"].includes(user.role)) {
    throw new Response("Acesso administrativo necessário.", { status: 403 });
  }
  return user;
}

export async function requirePermission(request: Request, permission: string) {
  const user = await readSession(request);
  if (!user) throw new Response("Autenticação necessária.", { status: 401 });
  if (user.role === "admin") return user; // Admin has full access
  if (!user.permissions.includes(permission)) {
    throw new Response("Permissão insuficiente para esta ação.", { status: 403 });
  }
  return user;
}

export async function checkRateLimit(ip: string | null) {
  if (!ip) return; // Cannot rate limit without IP
  const result = await query<{ blocked_until: string | null }>(
    `select blocked_until from universe.login_attempts where ip_address=$1::inet`,
    [ip],
  );
  const record = result.rows[0];
  if (record?.blocked_until && new Date(record.blocked_until) > new Date()) {
    throw new Response("Muitas tentativas falhas. Tente novamente em 15 minutos.", { status: 429 });
  }
}

export async function recordFailedLogin(ip: string | null) {
  if (!ip) return;
  await query(
    `insert into universe.login_attempts(ip_address)
     values($1::inet)
     on conflict (ip_address) do update
     set attempt_count = case
           when universe.login_attempts.last_attempt < now() - interval '15 minutes' then 1
           else universe.login_attempts.attempt_count + 1
         end,
         last_attempt = now(),
         blocked_until = case
           when universe.login_attempts.last_attempt >= now() - interval '15 minutes'
                and universe.login_attempts.attempt_count + 1 >= 5
           then now() + interval '15 minutes'
           else null
         end
     returning blocked_until`,
    [ip],
  );
}

export async function clearFailedLogins(ip: string | null) {
  if (ip) await query(`delete from universe.login_attempts where ip_address=$1::inet`, [ip]);
}
