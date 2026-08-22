import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/invisible-academy")({
  component: Outlet,
});
