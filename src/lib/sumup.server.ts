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

  const body = {
    amount,
    currency: "BRL",
    checkout_reference: reference,
    merchant_code: merchantCode,
    description,
    return_url:
      process.env.SUMUP_WEBHOOK_URL || "https://loja.carolsol.com.br/api/webhook/sumup",
    redirect_url: `${returnUrl}?checkout_ref=${encodeURIComponent(reference)}`,
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
    throw new Error(`Falha ao criar checkout SumUp (${response.status}).`);
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
