/**
 * SumUp Hosted Checkout integration.
 *
 * Environment variables required:
 *   SUMUP_API_KEY          – Bearer token for SumUp API
 *   SUMUP_MERCHANT_CODE    – Merchant identifier
 *   SUMUP_RETURN_URL       – Public URL the customer returns to after payment
 *   SUMUP_WEBHOOK_URL      – Public backend callback for checkout status changes
 */

const API_BASE = "https://api.sumup.com";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} não configurada.`);
  return value;
}

function headers() {
  return {
    Authorization: `Bearer ${requireEnv("SUMUP_API_KEY")}`,
    "Content-Type": "application/json",
  };
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
  const merchantCode = requireEnv("SUMUP_MERCHANT_CODE");
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
      };
      const candidate =
        payload.errors ?? payload.message ?? payload.error_message ?? payload.error_code;
      if (typeof candidate === "string") detail = candidate.slice(0, 500);
      else if (candidate) detail = JSON.stringify(candidate).slice(0, 500);
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
