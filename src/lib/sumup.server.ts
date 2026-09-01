/**
 * SumUp Hosted Checkout integration.
 *
 * Environment variables required:
 *   SUMUP_API_KEY          – Bearer token for SumUp API
 *   SUMUP_MERCHANT_CODE    – Explicit merchant identifier that receives every payment
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

const MERCHANT_CODE_PATTERN = /^[A-Z0-9]{8}$/;

function normalizeMerchantCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function requireMerchantCode(): string {
  const code = normalizeMerchantCode(requireEnv("SUMUP_MERCHANT_CODE"));
  if (!MERCHANT_CODE_PATTERN.test(code)) {
    throw new Error(
      "Variável de ambiente SUMUP_MERCHANT_CODE inválida. Use o código comercial de 8 caracteres exibido na conta SumUp.",
    );
  }
  return code;
}

function safeProviderDetail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/(authorization|bearer|api[_ -]?key|token|secret)\s*[:=]\s*\S+/gi, "$1=[oculto]")
    .trim()
    .slice(0, 300);
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
  const merchantCode = requireMerchantCode();
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/v0.1/checkouts`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("[SumUp] Checkout connection failed:", error);
    throw new Error(
      "Falha ao conectar à SumUp. Verifique a conectividade do servidor e tente novamente.",
    );
  }

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
        instance?: unknown;
        trace_id?: unknown;
      };
      const candidate =
        payload.errors ?? payload.message ?? payload.error_message ?? payload.error_code;
      if (typeof candidate === "string") detail = safeProviderDetail(candidate);
      else if (candidate) detail = JSON.stringify(candidate).slice(0, 500);
      if (detail === "Validation error" && typeof payload.param === "string") {
        detail = `campo inválido: ${payload.param}`;
      }
      if (response.status === 401) {
        detail = "SUMUP_API_KEY recusada pela SumUp. Configure uma chave secreta criada na conta comercial correta; não use a chave pública";
      }
      if (
        response.status === 403 ||
        payload.error_message === "checkout_payments_not_allowed"
      ) {
        detail =
          "pagamentos online não estão habilitados para esta conta. Solicite à SumUp a liberação de Checkouts e Hosted Checkout";
      }
      if (payload.param === "merchant_code") {
        detail =
          "a SumUp rejeitou o SUMUP_MERCHANT_CODE informado. A chave secreta e o código comercial precisam pertencer à mesma conta";
      }
      const providerCode = safeProviderDetail(payload.error_code);
      const providerReference = safeProviderDetail(payload.instance ?? payload.trace_id);
      if (providerCode && !detail.includes(providerCode)) {
        detail = `${detail || "requisição recusada"} (código ${providerCode})`;
      }
      if (providerReference) {
        detail = `${detail || "requisição recusada"}; referência SumUp ${providerReference}`;
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
