import { createFileRoute } from "@tanstack/react-router";
import { StoreHomePage } from "./sol-hair-closet.index";
export const Route = createFileRoute("/store")({ component: StoreHomePage });
