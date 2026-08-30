/**
 * SumUp Hosted Checkout integration.
 *
 * Environment variables required:
 *   SUMUP_API_KEY          – Bearer token for SumUp API
 *   SUMUP_MERCHANT_CODE    – Merchant identifier fallback (normally resolved from the API key)
 *   SUMUP_RETURN_URL       – Public URL the customer returns to after payment
 *   SUMUP_WEBHOOK_URL      – Public backend callback for checkout status changes
 */

const API_BASE = "https://api.sumup.com";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim().replace(/^['"]|['"]$/g, "");
  if (!value) throw new Error(`Variável de ambiente ${name} não configurada.`);
  return value;
}

function headers() {
  return {
    Authorization: `Bearer ${requireEnv("SUMUP_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

let merchantCodePromise: Promise<string> | null = null;
let merchantCodeApiKey = "";

const MERCHANT_CODE_PATTERN = /^[A-Z0-9]{8}$/;

function normalizeMerchantCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function findMerchantCode(value: unknown, depth = 0): string {
  if (!value || depth > 5) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMerchantCode(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  for (const key of ["merchant_code", "merchantCode"]) {
    const candidate = normalizeMerchantCode(record[key]);
    if (MERCHANT_CODE_PATTERN.test(candidate)) return candidate;
  }
  for (const nested of Object.values(record)) {
    const found = findMerchantCode(nested, depth + 1);
    if (found) return found;
  }
  return "";
}

/**
 * Memberships do not expose `merchant_code`. The SumUp API returns the same
 * merchant identifier as `resource_id` and `resource.id` when `type` is
 * `merchant`. Keeping this parser separate avoids treating unrelated IDs as a
 * merchant code.
 */
function findMembershipMerchantCodes(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const payload = value as Record<string, unknown>;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const codes: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const membership = item as Record<string, unknown>;
    const resource =
      membership.resource && typeof membership.resource === "object"
        ? (membership.resource as Record<string, unknown>)
        : {};
    const resourceType = String(membership.type || resource.type || "").toLowerCase();
    const status = String(membership.status || "accepted").toLowerCase();
    if (resourceType !== "merchant" || !["accepted", ""].includes(status)) continue;
    const candidate = normalizeMerchantCode(membership.resource_id || resource.id);
    if (MERCHANT_CODE_PATTERN.test(candidate) && !codes.includes(candidate)) {
      codes.push(candidate);
    }
  }
  return codes;
}

async function fetchMerchantCode(path: string): Promise<string> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: headers(),
  });
  if (response.status === 401) {
    throw new Error("SUMUP_API_KEY recusada pela SumUp. Gere e configure uma nova chave secreta.");
  }
  if (!response.ok) return "";
  return findMerchantCode(await response.json());
}

async function fetchMembershipMerchantCodes(): Promise<string[]> {
  const response = await fetch(
    `${API_BASE}/v0.1/memberships?kind=merchant&status=accepted&limit=25`,
    { method: "GET", headers: headers() },
  );
  if (response.status === 401) {
    throw new Error("SUMUP_API_KEY recusada pela SumUp. Gere e configure uma nova chave secreta.");
  }
  if (!response.ok) return [];
  return findMembershipMerchantCodes(await response.json());
}

async function validateConfiguredMerchantCode(code: string): Promise<boolean> {
  if (!MERCHANT_CODE_PATTERN.test(code)) return false;
  const response = await fetch(`${API_BASE}/v1/merchants/${encodeURIComponent(code)}`, {
    method: "GET",
    headers: headers(),
  });
  if (response.status === 401) {
    throw new Error("SUMUP_API_KEY recusada pela SumUp. Gere e configure uma nova chave secreta.");
  }
  if (!response.ok) return false;
  const detected = findMerchantCode(await response.json());
  return detected === code;
}

/**
 * Resolve the merchant owned by the configured secret API key. This prevents a
 * merchant code copied from another account/environment from breaking every
 * checkout. SumUp documents GET /v0.1/me as the authoritative profile lookup.
 */
async function resolveMerchantCode(): Promise<string> {
  const apiKey = requireEnv("SUMUP_API_KEY");
  if (merchantCodeApiKey !== apiKey) {
    merchantCodePromise = null;
    merchantCodeApiKey = apiKey;
  }
  if (merchantCodePromise) return merchantCodePromise;

  merchantCodePromise = (async () => {
    const configuredCode = normalizeMerchantCode(process.env.SUMUP_MERCHANT_CODE);
    try {
      const profileCode = await fetchMerchantCode("/v0.1/me");
      if (profileCode) {
        if (configuredCode && profileCode !== configuredCode) {
          console.warn(
            "[SumUp] SUMUP_MERCHANT_CODE does not match SUMUP_API_KEY; using the API profile.",
          );
        }
        return profileCode;
      }

      const membershipCodes = await fetchMembershipMerchantCodes();
      if (configuredCode && membershipCodes.includes(configuredCode)) {
        return configuredCode;
      }
      if (membershipCodes.length === 1) {
        if (configuredCode && membershipCodes[0] !== configuredCode) {
          console.warn(
            "[SumUp] SUMUP_MERCHANT_CODE does not match the API-key membership; using the authorized merchant.",
          );
        }
        return membershipCodes[0];
      }
      if (membershipCodes.length > 1) {
        throw new Error(
          "A chave possui mais de uma conta comercial. Configure SUMUP_MERCHANT_CODE com uma das contas vinculadas.",
        );
      }
      if (
        MERCHANT_CODE_PATTERN.test(configuredCode) &&
        (await validateConfiguredMerchantCode(configuredCode))
      ) {
        console.warn(
          "[SumUp] API profile did not expose the merchant; using the environment value validated against the API key.",
        );
        return configuredCode;
      }
    } catch (error) {
      console.warn("[SumUp] Merchant profile lookup unavailable.", error);
      if (error instanceof Error && error.message.includes("mais de uma conta comercial")) {
        throw error;
      }
      if (error instanceof Error && error.message.includes("SUMUP_API_KEY recusada")) {
        throw error;
      }
    }

    throw new Error(
      "A SumUp autenticou a chave, mas não informou uma conta comercial autorizada. Gere uma nova chave secreta dentro da conta comercial correta e não use CPF, código do proprietário ou chave pública.",
    );
  })();
  try {
    return await merchantCodePromise;
  } catch (error) {
    merchantCodePromise = null;
    throw error;
  }
}

export type SumUpCheckoutResponse = {
  id: string;
  checkout_reference: string;
  amount: number;
  currency: string;
  status: string;
  hosted_checkout_url?: string;
  transaction_id?: string;
  date?: string;
};

/**
 * Create a SumUp Hosted Checkout session.
 */
export async function createSumUpCheckout(
  amount: number,
  reference: string,
  description: string,
  redirectUrl?: string,
): Promise<SumUpCheckoutResponse> {
  const merchantCode = await resolveMerchantCode();
  const returnUrl = redirectUrl ?? requireEnv("SUMUP_RETURN_URL");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor inválido para o checkout SumUp.");
  }

  let parsedReturnUrl: URL;
  try {
    parsedReturnUrl = new URL(returnUrl);
  } catch {
    throw new Error("URL de retorno da SumUp inválida.");
  }
  if (parsedReturnUrl.protocol !== "https:") {
    throw new Error("A URL de retorno da SumUp precisa usar HTTPS.");
  }
  parsedReturnUrl.searchParams.set("checkout_ref", reference);

  const body = {
    amount: Number(amount.toFixed(2)),
    currency: "BRL",
    checkout_reference: reference,
    merchant_code: merchantCode,
    description: description.normalize("NFC").slice(0, 255),
    return_url: process.env.SUMUP_WEBHOOK_URL || "https://loja.carolsol.com.br/api/webhook/sumup",
    redirect_url: parsedReturnUrl.toString(),
    valid_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    hosted_checkout: {
      enabled: true,
    },
  };

  const response = await fetch(`${API_BASE}/v0.1/checkouts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[SumUp] Checkout creation failed:", response.status, text);
    let detail = "";
    try {
      const payload = JSON.parse(text) as {
        message?: unknown;
        error_message?: unknown;
        error_code?: unknown;
        errors?: unknown;
        param?: unknown;
      };
      const candidate =
        payload.errors ?? payload.message ?? payload.error_message ?? payload.error_code;
      if (typeof candidate === "string") detail = candidate.slice(0, 500);
      else if (candidate) detail = JSON.stringify(candidate).slice(0, 500);
      if (detail === "Validation error" && typeof payload.param === "string") {
        detail = `campo inválido: ${payload.param}`;
      }
      if (payload.param === "merchant_code") {
        merchantCodePromise = null;
        detail =
          "a SumUp não reconheceu uma conta comercial autorizada para esta chave. Gere a chave secreta dentro da conta comercial que receberá o pagamento";
      }
    } catch {
      // A resposta pode não ser JSON; o corpo completo permanece apenas no log do servidor.
    }
    throw new Error(
      `Falha ao criar checkout SumUp (${response.status})${detail ? `: ${detail}` : "."}`,
    );
  }

  return response.json() as Promise<SumUpCheckoutResponse>;
}

/**
 * Retrieve the current status of a checkout by its SumUp checkout ID.
 */
export async function getSumUpCheckoutStatus(checkoutId: string): Promise<SumUpCheckoutResponse> {
  const response = await fetch(`${API_BASE}/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, {
    method: "GET",
    headers: headers(),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[SumUp] Status check failed:", response.status, text);
    throw new Error(`Falha ao consultar checkout SumUp (${response.status}).`);
  }

  return response.json() as Promise<SumUpCheckoutResponse>;
}
