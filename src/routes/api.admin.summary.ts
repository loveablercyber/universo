import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/auth.server";
import { query } from "@/lib/db.server";

export const Route = createFileRoute("/api/admin/summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireAdmin(request);
          const [
            { rows: userRows },
            { rows: sessionRows },
            { rows: auditRows },
            { rows: storeRows },
            { rows: academyRows },
            { rows: eloRows },
          ] = await Promise.all([
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
            query(`select count(*)::int as orders,
                            count(*) filter (where status='pending')::int as pending,
                            coalesce(sum(total_amount) filter (where status in ('paid','processing','shipped','delivered')),0)::float as revenue
                       from universe.store_orders`),
            query(`select count(*)::int as enrollments,
                            count(*) filter (where status='pending')::int as pending,
                            count(*) filter (where status in ('active','completed'))::int as active,
                            coalesce(sum(amount_paid) filter (where status in ('active','completed')),0)::float as revenue
                       from universe.academy_enrollments`),
            query(`select count(*)::int as donations,
                            coalesce(sum(amount) filter (where status='completed'),0)::float as total
                       from universe.elo_donations`),
          ]);

          return Response.json({
            ok: true,
            user,
            summary: {
              users: userRows[0] ?? { total: 0, active: 0 },
              sessions: sessionRows[0] ?? { active: 0 },
              audit: auditRows[0] ?? { total: 0 },
              store: storeRows[0] ?? { orders: 0, pending: 0, revenue: 0 },
              academy: academyRows[0] ?? { enrollments: 0, pending: 0, active: 0, revenue: 0 },
              elo: eloRows[0] ?? { donations: 0, total: 0 },
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
