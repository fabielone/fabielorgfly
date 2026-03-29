import { MercadoPagoConfig, PreApproval } from "mercadopago";

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
  if (!params.payerEmail.trim()) {
    return { error: "Your account needs an email to bill with Mercado Pago." };
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
        payer_email: params.payerEmail.trim(),
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
    const initPoint = row.sandbox_init_point ?? row.init_point;
    if (!initPoint) {
      return { error: "Mercado Pago did not return a checkout URL." };
    }
    return { initPoint };
  } catch (e: unknown) {
    return { error: mercadoPagoErrorMessage(e) };
  }
}
