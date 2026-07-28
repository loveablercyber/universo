import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  assertSameOrigin,
  authenticate,
  clearSessionCookie,
  createSession,
  destroySession,
  readSession,
  sessionCookie,
} from "@/lib/auth.server";

const loginSchema = z.object({
  action: z.literal("login"),
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await readSession(request);
          return Response.json({ ok: true, user });
        } catch {
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

          const input = loginSchema.safeParse(body);
          if (!input.success) return jsonError("Dados de acesso inválidos.", 400);
          const user = await authenticate(input.data.email, input.data.password);
          if (!user) return jsonError("E-mail ou senha incorretos.", 401);

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
