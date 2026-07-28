import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/auth.server";
import { query } from "@/lib/db.server";

export const Route = createFileRoute("/api/admin/summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireAdmin(request);
          const [{ rows: userRows }, { rows: sessionRows }, { rows: auditRows }] =
            await Promise.all([
              query<{ total: number; active: number }>(
                `select count(*)::int as total,
                        count(*) filter (where status='active')::int as active
                   from universe.users`,
              ),
              query<{ active: number }>(
                `select count(*)::int as active
                   from universe.sessions
                  where expires_at > now()`,
              ),
              query<{ total: number }>(
                `select count(*)::int as total
                   from universe.audit_logs`,
              ),
            ]);

          return Response.json({
            ok: true,
            user,
            summary: {
              users: userRows[0] ?? { total: 0, active: 0 },
              sessions: sessionRows[0] ?? { active: 0 },
              audit: auditRows[0] ?? { total: 0 },
            },
          });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error(error);
          return Response.json(
            { ok: false, message: "Não foi possível carregar o painel." },
            { status: 503 },
          );
        }
      },
    },
  },
});
