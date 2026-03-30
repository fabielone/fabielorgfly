import { MercadoPagoConfig, PreApproval } from "mercadopago";

function isMercadoPagoSandboxEnv(): boolean {
  return (
    process.env.MERCADOPAGO_SANDBOX === "1" ||
    process.env.MERCADOPAGO_SANDBOX === "true" ||
    process.env.MERCADOPAGO_SANDBOX === "yes"
  );
}

/**
 * In sandbox, MP often rejects `POST /preapproval` if `payer_email` is tied to a *production* MP user.
 * Set MERCADOPAGO_SANDBOX_PAYER_EMAIL to the **test buyer (comprador)** email from Cuentas de prueba.
 */
export function resolvePayerEmailForMercadoPago(loggedInUserEmail: string): string {
  const override = process.env.MERCADOPAGO_SANDBOX_PAYER_EMAIL?.trim();
  if (isMercadoPagoSandboxEnv() && override) return override;
  return loggedInUserEmail.trim();
}

function mercadoPagoErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (Array.isArray(o.cause)) {
      const first = o.cause[0] as Record<string, unknown> | undefined;
      if (first && typeof first.description === "string") return first.description;
      if (first && typeof first.message === "string") return first.message;
    }
    if (o.cause && typeof o.cause === "object" && o.cause !== null) {
      const c = o.cause as Record<string, unknown>;
      if (typeof c.message === "string") return c.message;
    }
  }
  return "Could not start Mercado Pago checkout.";
}

/**
 * Recurring subscription checkout (preapproval without a dashboard plan).
 * `external_reference` must be the Supabase user id for webhooks to sync `subscriptions`.
 */
export async function createMercadoPagoSubscriptionCheckout(params: {
  accessToken: string;
  userId: string;
  payerEmail: string;
  monthlyAmountMxn: number;
  backUrl: string;
}): Promise<{ initPoint: string } | { error: string }> {
  const payerEmail = resolvePayerEmailForMercadoPago(params.payerEmail);
  if (!payerEmail) {
    return {
      error:
        "Missing payer email. Add an email to your Fabielorg account, or set MERCADOPAGO_SANDBOX_PAYER_EMAIL for sandbox.",
    };
  }
  if (!Number.isFinite(params.monthlyAmountMxn) || params.monthlyAmountMxn <= 0) {
    return { error: "Invalid subscription amount." };
  }

  const config = new MercadoPagoConfig({ accessToken: params.accessToken });
  const client = new PreApproval(config);

  try {
    const res = await client.create({
      body: {
        reason: "Fabielorg monthly membership",
        external_reference: params.userId,
        payer_email: payerEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: params.monthlyAmountMxn,
          currency_id: "MXN",
        },
        back_url: params.backUrl,
        status: "pending",
      },
    });

    const row = res as { sandbox_init_point?: string; init_point?: string };
    const sandbox = isMercadoPagoSandboxEnv();
    const initPoint = sandbox
      ? (row.sandbox_init_point ?? row.init_point)
      : (row.init_point ?? row.sandbox_init_point);
    if (!initPoint) {
      return { error: "Mercado Pago did not return a checkout URL." };
    }
    return { initPoint };
  } catch (e: unknown) {
    return { error: mercadoPagoErrorMessage(e) };
  }
}
