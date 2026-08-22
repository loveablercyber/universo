import { createFileRoute } from "@tanstack/react-router";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, db } from "@/lib/db.server";
import {
  createSession,
  readSession,
  destroySession,
  sessionCookie,
  clearSessionCookie,
  assertSameOrigin,
  checkRateLimit,
  recordFailedLogin,
  clearFailedLogins,
  type SessionUser,
} from "@/lib/auth.server";

const registerSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo."),
  email: z.string().trim().email("Informe um e-mail válido.").toLowerCase(),
  password: z.string().min(12, "A senha deve ter pelo menos 12 caracteres."),
  phone: z
    .string()
    .trim()
    .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Informe um telefone válido com DDD."),
  document: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11, "CPF deve conter exatamente 11 dígitos."),
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido.").toLowerCase(),
  password: z.string().min(1, "Informe sua senha."),
});

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(3).optional(),
  phone: z.string().trim().optional(),
  document: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .optional(),
  defaultAddress: z
    .object({
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
});

export const Route = createFileRoute("/api/store-customer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await readSession(request);
          if (!session) {
            return Response.json({ ok: false, customer: null }, { status: 401 });
          }

          const { rows } = await query<{
            id: string;
            full_name: string;
            email: string;
            phone: string | null;
            document: string | null;
            default_address: unknown;
          }>(
            `SELECT id, full_name, email, phone, document, default_address
               FROM universe.store_customers
              WHERE lower(email) = lower($1)
              LIMIT 1`,
            [session.email],
          );

          const customer = rows[0];
          return Response.json({
            ok: true,
            customer: customer
              ? {
                  id: customer.id,
                  fullName: customer.full_name,
                  email: customer.email,
                  phone: customer.phone,
                  document: customer.document,
                  defaultAddress: customer.default_address,
                }
              : {
                  id: session.id,
                  fullName: session.fullName,
                  email: session.email,
                  phone: null,
                  document: null,
                  defaultAddress: {},
                },
          });
        } catch (err) {
          return Response.json({ ok: false, message: "Erro ao consultar perfil." }, { status: 500 });
        }
      },

      POST: async ({ request }) => {
        const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

        try {
          assertSameOrigin(request);
          const url = new URL(request.url);
          const action = url.searchParams.get("action");
          const body = await request.json();

          // 1. Registro de Cliente
          if (action === "register") {
            await checkRateLimit(clientIp);

            const input = registerSchema.safeParse(body);
            if (!input.success) {
              return Response.json(
                { ok: false, message: input.error.issues.map((i) => i.message).join("; ") },
                { status: 400 },
              );
            }

            const { fullName, email, password, phone, document } = input.data;

            const pool = db;
            const client = await pool.connect();

            try {
              await client.query("BEGIN");

              // Verificar se e-mail já existe
              const existingUser = await client.query<{ id: string }>(
                `SELECT id FROM universe.users WHERE lower(email) = lower($1)`,
                [email],
              );
              if (existingUser.rowCount && existingUser.rowCount > 0) {
                await client.query("ROLLBACK");
                return Response.json(
                  { ok: false, message: "Já existe uma conta cadastrada com este e-mail. Faça login." },
                  { status: 400 },
                );
              }

              const passwordHash = await bcrypt.hash(password, 12);

              // Inserir usuário na tabela unificada de autenticação
              const userRes = await client.query<{ id: string }>(
                `INSERT INTO universe.users(email, password_hash, full_name, phone, role, status)
                 VALUES ($1, $2, $3, $4, 'customer', 'active')
                 RETURNING id`,
                [email, passwordHash, fullName, phone],
              );
              const userId = userRes.rows[0].id;

              // Inserir ou atualizar store_customers atomicamente
              await client.query(
                `INSERT INTO universe.store_customers(full_name, email, phone, document, password_hash, is_registered)
                 VALUES ($1, $2, $3, $4, $5, true)
                 ON CONFLICT (lower(email)) DO UPDATE
                   SET full_name = excluded.full_name,
                       phone = coalesce(excluded.phone, universe.store_customers.phone),
                       document = coalesce(excluded.document, universe.store_customers.document),
                       password_hash = excluded.password_hash,
                       is_registered = true,
                       updated_at = now()`,
                [fullName, email, phone, document, passwordHash],
              );

              await client.query("COMMIT");

              // Criar sessão de autenticação
              const sessionUser: SessionUser = {
                id: userId,
                email,
                fullName,
                role: "customer",
                permissions: ["store.customer"],
              };
              const token = await createSession(request, sessionUser);
              await clearFailedLogins(clientIp);

              return Response.json(
                { ok: true, message: "Conta criada com sucesso!", customer: sessionUser },
                { headers: { "Set-Cookie": sessionCookie(request, token) } },
              );
            } catch (err) {
              await client.query("ROLLBACK").catch(() => {});
              throw err;
            } finally {
              client.release();
            }
          }

          // 2. Login de Cliente
          if (action === "login") {
            await checkRateLimit(clientIp);

            const input = loginSchema.safeParse(body);
            if (!input.success) {
              return Response.json(
                { ok: false, message: "Preencha e-mail e senha corretamente." },
                { status: 400 },
              );
            }

            const { email, password } = input.data;

            const userRes = await query<{
              id: string;
              email: string;
              password_hash: string;
              full_name: string;
              role: SessionUser["role"];
              status: string;
              permissions: string[];
            }>(
              `SELECT id, email, password_hash, full_name, role, status, permissions
                 FROM universe.users
                WHERE lower(email) = lower($1)
                LIMIT 1`,
              [email],
            );

            const user = userRes.rows[0];
            if (!user || user.status !== "active") {
              await recordFailedLogin(clientIp);
              return Response.json(
                { ok: false, message: "E-mail ou senha incorretos." },
                { status: 401 },
              );
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
              await recordFailedLogin(clientIp);
              return Response.json(
                { ok: false, message: "E-mail ou senha incorretos." },
                { status: 401 },
              );
            }

            await clearFailedLogins(clientIp);

            const sessionUser: SessionUser = {
              id: user.id,
              email: user.email,
              fullName: user.full_name,
              role: user.role,
              permissions: user.permissions || ["store.customer"],
            };
            const token = await createSession(request, sessionUser);

            return Response.json(
              { ok: true, message: "Login realizado com sucesso!", customer: sessionUser },
              { headers: { "Set-Cookie": sessionCookie(request, token) } },
            );
          }

          // 3. Logout (REVOGAÇÃO REAL DA SESSÃO NO BANCO)
          if (action === "logout") {
            await destroySession(request);
            return Response.json(
              { ok: true, message: "Sessão revogada com sucesso." },
              { headers: { "Set-Cookie": clearSessionCookie(request) } },
            );
          }

          // 4. Atualizar Perfil / Endereço
          if (action === "update_profile") {
            const session = await readSession(request);
            if (!session) {
              return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
            }

            const parsed = updateProfileSchema.safeParse(body);
            if (!parsed.success) {
              return Response.json(
                { ok: false, message: parsed.error.issues.map((i) => i.message).join("; ") },
                { status: 400 },
              );
            }

            const { fullName, phone, document, defaultAddress } = parsed.data;

            await query(
              `UPDATE universe.store_customers
                  SET full_name = coalesce($1, full_name),
                       phone = coalesce($2, phone),
                       document = coalesce($3, document),
                       default_address = coalesce($4::jsonb, default_address),
                       updated_at = now()
                WHERE lower(email) = lower($5)`,
              [
                fullName || null,
                phone || null,
                document || null,
                defaultAddress ? JSON.stringify(defaultAddress) : null,
                session.email,
              ],
            );

            return Response.json({ ok: true, message: "Perfil atualizado com sucesso!" });
          }

          return Response.json({ ok: false, message: "Ação desconhecida." }, { status: 400 });
        } catch (error) {
          console.error("[Customer Auth API Error]", error);
          const message = error instanceof Error ? error.message : "Erro ao processar.";
          return Response.json({ ok: false, message }, { status: 500 });
        }
      },
    },
  },
});
