import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/academy")({ component: () => { if (typeof window !== "undefined") window.location.replace(`/invisible-academy${window.location.search}${window.location.hash}`); return null; } });
