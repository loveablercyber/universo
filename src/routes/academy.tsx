import { createFileRoute } from "@tanstack/react-router";
import { Index } from "./invisible-academy.index";
export const Route = createFileRoute("/academy")({ component: Index });
