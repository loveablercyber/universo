import { createFileRoute } from "@tanstack/react-router";
import { checkDatabase } from "@/lib/db.server";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const database = await checkDatabase();
        return Response.json(
          {
            ok: database.connected,
            service: "universo-carol-sol",
            database,
            timestamp: new Date().toISOString(),
          },
          { status: database.connected ? 200 : 503 },
        );
      },
    },
  },
});
