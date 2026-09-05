import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/elo")({ component: () => { if (typeof window !== "undefined") window.location.replace(`/projeto-elo${window.location.search}${window.location.hash}`); return null; } });
