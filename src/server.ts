import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

const STORE_HOSTNAME = "loja.carolsol.com.br";
const ACADEMY_HOSTNAME = "academy.carolsol.com.br";
const ELO_HOSTNAME = "elo.carolsol.com.br";

function routeSubdomain(request: Request): Request | Response {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostnames = [forwardedHost, request.headers.get("host"), url.hostname]
    .filter(Boolean)
    .map((host) => String(host).split(":")[0].toLowerCase());
  const isAcademyHost = hostnames.includes(ACADEMY_HOSTNAME);
  const isStoreHost = hostnames.includes(STORE_HOSTNAME);
  const isEloHost = hostnames.includes(ELO_HOSTNAME);

  if (isAcademyHost) {
    if (url.pathname === "/") {
      url.pathname = "/invisible-academy";
    } else if (url.pathname === "/aluno") {
      url.pathname = "/invisible-academy/aluno";
    } else if (url.pathname.startsWith("/curso/")) {
      url.pathname = url.pathname.replace("/curso/", "/invisible-academy/curso/");
    } else if (url.pathname.startsWith("/certificado/")) {
      url.pathname = url.pathname.replace("/certificado/", "/invisible-academy/certificado/");
    } else {
      return request;
    }
    return new Request(url, request);
  }

  if (isEloHost) {
    if (url.pathname === "/") {
      url.pathname = "/projeto-elo";
    } else if (url.pathname === "/participar") {
      url.pathname = "/projeto-elo/participar";
    } else if (url.pathname === "/transparencia") {
      url.pathname = "/projeto-elo/transparencia";
    } else {
      return request;
    }
    return new Request(url, request);
  }

  if (!isStoreHost) return request;

  if (url.pathname === "/") {
    url.pathname = "/sol-hair-closet";
  } else if (url.pathname === "/pedido") {
    url.pathname = "/sol-hair-closet/pedido";
  } else if (url.pathname === "/pedidos") {
    url.pathname = "/sol-hair-closet/pedidos";
  } else if (url.pathname === "/produtos") {
    url.pathname = "/sol-hair-closet/produtos";
  } else if (url.pathname.startsWith("/produto/")) {
    url.pathname = url.pathname.replace("/produto/", "/sol-hair-closet/produto/");
  } else if (url.pathname.startsWith("/categoria/")) {
    url.pathname = url.pathname.replace("/categoria/", "/sol-hair-closet/categoria/");
  } else if (url.pathname.startsWith("/colecao/")) {
    url.pathname = url.pathname.replace("/colecao/", "/sol-hair-closet/colecao/");
  } else if (url.pathname === "/busca") {
    url.pathname = "/sol-hair-closet/busca";
  } else if (url.pathname === "/favoritos") {
    url.pathname = "/sol-hair-closet/favoritos";
  } else if (url.pathname === "/conta") {
    url.pathname = "/sol-hair-closet/conta";
  } else {
    return request;
  }

  return new Request(url, request);
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const routedRequest = routeSubdomain(request);
      if (routedRequest instanceof Response) return routedRequest;
      const response = await handler.fetch(routedRequest, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
