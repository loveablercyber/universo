import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { hashToken, query, withTransaction } from "./db.server";

const LEGACY_COOKIE_NAME = "universo_carol_session";
const SHARED_COOKIE_NAME = "carol_sol_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

type PlatformRole = "admin" | "professional" | "client";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "manager" | "operator" | "customer" | "student" | "donor" | "volunteer";
  permissions: string[];
  identityId?: string;
  platformRole?: PlatformRole;
};

type CanonicalIdentity = {
  id: string;
  email: string;
  encrypted_password: string;
  full_name: string;
  phone: string | null;
  role: PlatformRole;
  account_status: string;
};

function cookieValue(request: Request, cookieName: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === cookieName) return decodeURIComponent(value.join("="));
  }
  return null;
}

function sharedSecret() {
  return process.env.JWT_SECRET?.trim() || process.env.UNIFIED_AUTH_JWT_SECRET?.trim() || "";
}

function jwtKey() {
  return new TextEncoder().encode(sharedSecret());
}

function credentialVersion(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 22);
}

function secureCookie(request: Request) {
  const override = process.env.SESSION_COOKIE_SECURE?.toLowerCase();
  if (["false", "0", "no"].includes(override ?? "")) return false;
  if (["true", "1", "yes"].includes(override ?? "")) return true;
  return new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production";
}

function buildCookie(request: Request, name: string, value: string, maxAge: number) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secureCookie(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function authError(message: string, status: number) {
  return Response.json(
    { ok: false, message, reauthenticationRequired: status === 401 },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function sessionCookie(request: Request, token: string) {
  const name = sharedSecret() ? SHARED_COOKIE_NAME : LEGACY_COOKIE_NAME;
  return buildCookie(request, name, token, SESSION_SECONDS);
}

export function clearSessionCookie(request: Request) {
  const name = sharedSecret() ? SHARED_COOKIE_NAME : LEGACY_COOKIE_NAME;
  return buildCookie(request, name, "", 0);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestOrigin = forwardedHost
    ? `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost}`
    : requestUrl.origin;
  const configuredOrigins = [process.env.APP_URL, ...(process.env.ALLOWED_ORIGINS ?? "").split(",")]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map((value) => new URL(value).origin);
  const allowedOrigins = new Set([requestOrigin, ...configuredOrigins]);

  if (!allowedOrigins.has(origin)) {
    throw authError("Origem não autorizada.", 403);
  }
}

async function canonicalAuthAvailable() {
  const result = await query<{ users: string | null; profiles: string | null }>(
    `select to_regclass('auth.users')::text as users,
            to_regclass('public.profiles')::text as profiles`,
  );
  return Boolean(result.rows[0]?.users && result.rows[0]?.profiles);
}

function universeRole(platformRole: PlatformRole): SessionUser["role"] {
  if (platformRole === "admin") return "admin";
  if (platformRole === "professional") return "operator";
  return "customer";
}

function platformRole(role: SessionUser["role"]): PlatformRole {
  if (role === "admin" || role === "manager") return "admin";
  if (role === "operator") return "professional";
  return "client";
}

function brazilianPhoneCandidates(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return [];
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (!/^\d{10,11}$/.test(local)) return [];
  return [...new Set([`55${local}`, local])];
}

async function findCanonicalIdentity(identifier: string) {
  const result = await query<CanonicalIdentity>(
    `select u.id, u.email, u.encrypted_password,
            p.full_name, coalesce(p.phone, u.phone) as phone,
            p.role, p.account_status
      from auth.users u
       join public.profiles p on p.id=u.id
      where lower(u.email)=lower($1)
         or regexp_replace(coalesce(u.phone,''), '\\D', '', 'g')=any($2::text[])
         or regexp_replace(coalesce(p.phone,''), '\\D', '', 'g')=any($2::text[])
      limit 1`,
    [identifier, brazilianPhoneCandidates(identifier)],
  );
  return result.rows[0] ?? null;
}

async function findCanonicalIdentityById(id: string) {
  const result = await query<CanonicalIdentity>(
    `select u.id, u.email, u.encrypted_password,
            p.full_name, coalesce(p.phone, u.phone) as phone,
            p.role, p.account_status
       from auth.users u
       join public.profiles p on p.id=u.id
      where u.id=$1
      limit 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

async function ensureUniverseUser(identity: CanonicalIdentity): Promise<SessionUser> {
  const existing = await query<{
    id: string;
    email: string;
    full_name: string;
    role: SessionUser["role"];
    permissions: string[];
    status: string;
  }>(
    `select id, email, full_name, role, permissions, status
       from universe.users
      where (identity_user_id=$1 or lower(email)=lower($2))
        and status <> 'deleted'
      order by (identity_user_id=$1) desc
      limit 1`,
    [identity.id, identity.email],
  );

  const record = existing.rows[0];
  if (record) {
    if (record.status !== "active") {
      throw authError("Esta conta não possui acesso ativo aos módulos Universo.", 403);
    }
    const nextRole =
      identity.role === "admin"
        ? "admin"
        : identity.role === "professional"
          ? "operator"
          : ["student", "donor", "volunteer"].includes(record.role)
            ? record.role
            : "customer";
    await query(
      `update universe.users
          set identity_user_id=$2, email=lower($3), full_name=$4,
              password_hash=$5, role=$6, updated_at=now()
        where id=$1`,
      [
        record.id,
        identity.id,
        identity.email,
        identity.full_name,
        identity.encrypted_password,
        nextRole,
      ],
    );
    return {
      id: record.id,
      email: identity.email,
      fullName: identity.full_name,
      role: nextRole,
      permissions: record.permissions ?? [],
      identityId: identity.id,
      platformRole: identity.role,
    };
  }

  const inserted = await query<{
    id: string;
    role: SessionUser["role"];
    permissions: string[];
  }>(
    `insert into universe.users(
       identity_user_id, email, password_hash, full_name, phone, role, status, permissions
     ) values($1, lower($2), $3, $4, $5, $6, 'active', '[]'::jsonb)
     returning id, role, permissions`,
    [
      identity.id,
      identity.email,
      identity.encrypted_password,
      identity.full_name,
      identity.phone,
      universeRole(identity.role),
    ],
  );
  return {
    id: inserted.rows[0].id,
    email: identity.email,
    fullName: identity.full_name,
    role: inserted.rows[0].role,
    permissions: inserted.rows[0].permissions ?? [],
    identityId: identity.id,
    platformRole: identity.role,
  };
}

async function promoteLegacyUser(user: SessionUser & { passwordHash: string; phone?: string | null }) {
  const existingIdentity = await findCanonicalIdentity(user.email);
  if (existingIdentity) return existingIdentity;

  const canonicalRole = platformRole(user.role);
  return withTransaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `insert into auth.users(
         id, email, phone, encrypted_password, email_confirmed_at, raw_user_meta_data
       ) values($1, lower($2), $3, $4, now(), $5::jsonb)
       returning id`,
      [
        user.id,
        user.email,
        user.phone ?? null,
        user.passwordHash,
        JSON.stringify({ name: user.fullName, migrated_from: "universo" }),
      ],
    );
    await client.query(
      `insert into public.profiles(id, role, full_name, phone, notification_preferences)
       values($1, $2, $3, $4, '{"email":true,"whatsapp":true,"push":true}'::jsonb)
       on conflict(id) do update
         set full_name=excluded.full_name,
             phone=coalesce(public.profiles.phone, excluded.phone),
             account_status='active'`,
      [inserted.rows[0].id, canonicalRole, user.fullName, user.phone ?? null],
    );
    if (canonicalRole === "client") {
      await client.query(
        `insert into public.clients(profile_id, source, preferences)
         select $1, 'Universo Carol Sol', '{}'::jsonb
         where not exists(select 1 from public.clients where profile_id=$1)`,
        [inserted.rows[0].id],
      );
    }
    await client.query(
      `update universe.users set identity_user_id=$2, updated_at=now() where id=$1`,
      [user.id, inserted.rows[0].id],
    );
    return {
      id: inserted.rows[0].id,
      email: user.email,
      encrypted_password: user.passwordHash,
      full_name: user.fullName,
      phone: user.phone ?? null,
      role: canonicalRole,
      account_status: "active",
    } satisfies CanonicalIdentity;
  });
}

async function authenticateLegacy(identifier: string, password: string) {
  const result = await query<
    SessionUser & {
      password_hash: string;
      status: string;
      full_name: string;
      phone: string | null;
    }
  >(
    `select id, email, password_hash, full_name, phone, role, status, permissions
       from universe.users
      where lower(email)=lower($1)
      limit 1`,
    [identifier],
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
    phone: record.phone,
    passwordHash: record.password_hash,
  };
}

export async function authenticate(identifier: string, password: string) {
  const hasCanonicalAuth = await canonicalAuthAvailable();
  if (hasCanonicalAuth) {
    const identity = await findCanonicalIdentity(identifier);
    if (identity) {
      if (["blocked", "anonymized", "deleted"].includes(identity.account_status)) return null;
      if (!(await bcrypt.compare(password, identity.encrypted_password))) return null;
      return ensureUniverseUser(identity);
    }

    const legacy = await authenticateLegacy(identifier, password);
    if (!legacy) return null;
    const promoted = await promoteLegacyUser(legacy);
    return ensureUniverseUser(promoted);
  }

  return authenticateLegacy(identifier, password);
}

export async function identityExists(identifier: string) {
  if (!(await canonicalAuthAvailable())) return false;
  return Boolean(await findCanonicalIdentity(identifier));
}

const productionSsoOrigins = new Set([
  "https://carolsol.com.br",
  "https://www.carolsol.com.br",
  "https://loja.carolsol.com.br",
  "https://academy.carolsol.com.br",
  "https://elo.carolsol.com.br",
  "https://agenda.carolsol.com.br",
]);

function allowedSsoOrigins() {
  const configured = (process.env.SSO_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new URL(value).origin);
  return new Set([...productionSsoOrigins, ...configured]);
}

export function requestPublicOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return host ? `${proto || url.protocol.replace(":", "")}://${host}` : url.origin;
}

function safeReturnPath(value: string | null | undefined, fallback = "/conta") {
  const path = String(value || fallback).trim();
  return path.startsWith("/") && !path.startsWith("//") ? path.slice(0, 1000) : fallback;
}

export async function createSsoCode(
  user: SessionUser,
  targetOrigin: string,
  returnPath?: string | null,
  sourceOrigin?: string,
) {
  const target = new URL(targetOrigin).origin;
  if (!allowedSsoOrigins().has(target)) {
    throw authError("Destino de acesso não autorizado.", 400);
  }
  const identityId =
    user.identityId ??
    (
      await query<{ identity_user_id: string | null }>(
        `select identity_user_id from universe.users where id=$1`,
        [user.id],
      )
    ).rows[0]?.identity_user_id;
  if (!identityId) throw authError("Conta ainda não vinculada ao acesso unificado.", 409);

  const code = randomBytes(32).toString("base64url");
  await withTransaction(async (client) => {
    await client.query(`delete from public.carolsol_sso_codes where expires_at<now()-interval '1 day'`);
    const recent = await client.query<{ count: number }>(
      `select count(*)::int as count from public.carolsol_sso_codes
        where identity_user_id=$1 and created_at>now()-interval '1 minute'`,
      [identityId],
    );
    if ((recent.rows[0]?.count ?? 0) >= 10) {
      throw authError("Muitas trocas de painel. Aguarde um minuto.", 429);
    }
    await client.query(
      `insert into public.carolsol_sso_codes(
         code_hash, identity_user_id, target_origin, return_path, source_origin, expires_at
       ) values($1,$2,$3,$4,$5,now()+interval '60 seconds')`,
      [hashToken(code), identityId, target, safeReturnPath(returnPath), sourceOrigin ?? null],
    );
  });
  return {
    code,
    target,
    returnPath: safeReturnPath(returnPath),
  };
}

export async function consumeSsoCode(code: string, targetOrigin: string) {
  const target = new URL(targetOrigin).origin;
  if (!allowedSsoOrigins().has(target)) return null;
  const consumed = await withTransaction(async (client) => {
    const result = await client.query<{
      id: string;
      identity_user_id: string;
      return_path: string;
    }>(
      `select id, identity_user_id, return_path
         from public.carolsol_sso_codes
        where code_hash=$1 and target_origin=$2
          and used_at is null and expires_at>now()
        for update`,
      [hashToken(code), target],
    );
    const row = result.rows[0];
    if (!row) return null;
    await client.query(`update public.carolsol_sso_codes set used_at=now() where id=$1`, [row.id]);
    return row;
  });
  if (!consumed) return null;
  const identity = await findCanonicalIdentityById(consumed.identity_user_id);
  if (!identity || ["blocked", "anonymized", "deleted"].includes(identity.account_status))
    return null;
  return {
    user: await ensureUniverseUser(identity),
    returnPath: safeReturnPath(consumed.return_path),
  };
}

export async function createSession(request: Request, user: SessionUser) {
  const secret = sharedSecret();
  let identity: CanonicalIdentity | null = null;
  if (await canonicalAuthAvailable()) {
    identity = user.identityId ? await findCanonicalIdentityById(user.identityId) : null;
    if (!identity) identity = await findCanonicalIdentity(user.email);
    if (!identity) {
      const legacy = await query<{ password_hash: string; phone: string | null }>(
        `select password_hash, phone from universe.users where id=$1`,
        [user.id],
      );
      if (!legacy.rows[0]) throw new Error("Conta de autenticação não encontrada.");
      identity = await promoteLegacyUser({
        ...user,
        passwordHash: legacy.rows[0].password_hash,
        phone: legacy.rows[0].phone,
      });
    }
  }
  if (secret && identity) {
    return new SignJWT({
      role: identity.role,
      profileId: identity.id,
      name: identity.full_name,
      email: identity.email,
      cv: credentialVersion(identity.encrypted_password),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(identity.id)
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(jwtKey());
  }

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
  const secret = sharedSecret();
  if (secret) {
    const token = cookieValue(request, SHARED_COOKIE_NAME);
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, jwtKey(), { algorithms: ["HS256"] });
      if (!payload.sub || !(await canonicalAuthAvailable())) return null;
      const identity = await findCanonicalIdentityById(payload.sub);
      if (!identity || ["blocked", "anonymized", "deleted"].includes(identity.account_status))
        return null;
      if (
        typeof payload.cv !== "string" ||
        payload.cv !== credentialVersion(identity.encrypted_password)
      )
        return null;
      return ensureUniverseUser(identity);
    } catch {
      return null;
    }
  }

  const token = cookieValue(request, LEGACY_COOKIE_NAME);
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
  if (sharedSecret()) return;
  const token = cookieValue(request, LEGACY_COOKIE_NAME);
  if (token) await query("delete from universe.sessions where token_hash=$1", [hashToken(token)]);
}

export async function changeOwnPassword(
  user: SessionUser,
  currentPassword: string,
  newPassword: string,
) {
  const current = await query<{
    password_hash: string;
    identity_user_id: string | null;
  }>(
    `select password_hash, identity_user_id from universe.users where id=$1 and status='active'`,
    [user.id],
  );
  const record = current.rows[0];
  if (!record) return false;

  let authoritativeHash = record.password_hash;
  if (record.identity_user_id && (await canonicalAuthAvailable())) {
    const identity = await findCanonicalIdentityById(record.identity_user_id);
    if (!identity) return false;
    authoritativeHash = identity.encrypted_password;
  }
  if (!(await bcrypt.compare(currentPassword, authoritativeHash))) return false;

  const newHash = await bcrypt.hash(newPassword, 12);
  await withTransaction(async (client) => {
    await client.query(
      `update universe.users set password_hash=$2, updated_at=now() where id=$1`,
      [user.id, newHash],
    );
    if (record.identity_user_id) {
      await client.query(
        `update auth.users set encrypted_password=$2, updated_at=now() where id=$1`,
        [record.identity_user_id, newHash],
      );
    }
    await client.query(`delete from universe.sessions where user_id=$1`, [user.id]);
  });
  return true;
}

export async function replaceUserPassword(userId: string, newPasswordHash: string) {
  await withTransaction(async (client) => {
    const user = await client.query<{ identity_user_id: string | null }>(
      `select identity_user_id from universe.users where id=$1 for update`,
      [userId],
    );
    if (!user.rows[0]) throw new Error("Usuário não encontrado.");
    await client.query(
      `update universe.users set password_hash=$2, updated_at=now() where id=$1`,
      [userId, newPasswordHash],
    );
    if (user.rows[0].identity_user_id) {
      await client.query(
        `update auth.users set encrypted_password=$2, updated_at=now() where id=$1`,
        [user.rows[0].identity_user_id, newPasswordHash],
      );
    }
    await client.query(`delete from universe.sessions where user_id=$1`, [userId]);
  });
}

export async function requireAdmin(request: Request) {
  const user = await readSession(request);
  if (!user) throw authError("Sua sessão expirou. Entre novamente para continuar.", 401);
  if (!['admin', 'manager'].includes(user.role)) {
    throw authError("Acesso administrativo necessário.", 403);
  }
  return user;
}

export async function requirePermission(request: Request, permission: string) {
  const user = await readSession(request);
  if (!user) throw authError("Sua sessão expirou. Entre novamente para continuar.", 401);
  if (user.role === "admin") return user;
  if (!user.permissions.includes(permission)) {
    throw authError("Permissão insuficiente para esta ação.", 403);
  }
  return user;
}

export async function checkRateLimit(ip: string | null) {
  if (!ip) return;
  const result = await query<{ blocked_until: string | null }>(
    `select blocked_until from universe.login_attempts where ip_address=$1::inet`,
    [ip],
  );
  const record = result.rows[0];
  if (record?.blocked_until && new Date(record.blocked_until) > new Date()) {
    throw authError("Muitas tentativas falhas. Tente novamente em 15 minutos.", 429);
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
