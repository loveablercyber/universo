import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/store")({ component: () => { if (typeof window !== "undefined") window.location.replace(`/sol-hair-closet${window.location.search}${window.location.hash}`); return null; } });
