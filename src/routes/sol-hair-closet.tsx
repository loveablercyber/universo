import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sol-hair-closet")({
  component: StoreRouteLayout,
});

function StoreRouteLayout() {
  return <Outlet />;
}
