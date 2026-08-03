import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, requirePermission } from "@/lib/auth.server";
import { query } from "@/lib/db.server";
import { dispatchNotification } from "@/lib/notifications.server";

const testNotificationSchema = z.object({
  action: z.literal("send_test"),
  channel: z.enum(["email", "whatsapp"]),
  recipient: z.string().min(3),
  subject: z.string().optional(),
  message: z.string().min(2),
});

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error("[Admin Notifications API]", error);
  return Response.json(
    { ok: false, message: "Não foi possível carregar a central de notificações." },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/admin/notifications")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requirePermission(request, "settings.read");
          const url = new URL(request.url);
          const action = url.searchParams.get("action") ?? "history";

          if (action === "history") {
            const { rows } = await query(
              `SELECT id, channel, recipient, subject, template_name as "templateName",
                      status, payload, error_message as "errorMessage", sent_at as "sentAt"
                 FROM universe.notifications_log
                ORDER BY sent_at DESC LIMIT 100`,
            );
            return Response.json({ ok: true, history: rows });
          }

          if (action === "stats") {
            const totalRes = await query<{ count: string }>(
              `SELECT count(*) FROM universe.notifications_log`,
            );
            const emailRes = await query<{ count: string }>(
              `SELECT count(*) FROM universe.notifications_log WHERE channel='email'`,
            );
            const waRes = await query<{ count: string }>(
              `SELECT count(*) FROM universe.notifications_log WHERE channel='whatsapp'`,
            );
            const failedRes = await query<{ count: string }>(
              `SELECT count(*) FROM universe.notifications_log WHERE status='failed'`,
            );

            return Response.json({
              ok: true,
              stats: {
                total: parseInt(totalRes.rows[0].count, 10),
                email: parseInt(emailRes.rows[0].count, 10),
                whatsapp: parseInt(waRes.rows[0].count, 10),
                failed: parseInt(failedRes.rows[0].count, 10),
                emailDriver: process.env.EMAIL_DRIVER || "log",
                whatsappDriver: process.env.WHATSAPP_DRIVER || "log",
              },
            });
          }

          return Response.json({ ok: false, message: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },

      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          await requirePermission(request, "settings.write");
          const body = await request.json();

          const testInput = testNotificationSchema.safeParse(body);
          if (testInput.success) {
            const { channel, recipient, subject, message } = testInput.data;

            const res = await dispatchNotification({
              channel,
              recipient,
              subject: subject || "Teste de Notificação | Universo Carol Sol",
              templateName: "manual_test",
              payload: { message },
            });

            return Response.json({ ok: res.ok, error: res.error });
          }

          return Response.json({ ok: false, message: "Dados inválidos." }, { status: 400 });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
