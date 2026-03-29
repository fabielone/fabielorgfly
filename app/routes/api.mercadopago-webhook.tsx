import type { Route } from "./+types/api.mercadopago-webhook";
import { processMercadoPagoWebhook } from "~/lib/mercadopago-webhook.server";
import { createSupabaseServiceClient } from "~/lib/supabase.server";

export function loader() {
  return new Response(null, { status: 405 });
}

/**
 * POST https://fabiel.org/api/webhooks/mercadopago
 * Configure the same URL in Mercado Pago (test + production) with your webhook secret.
 * Set checkout `external_reference` to the Supabase `auth.users` id (UUID) so rows sync.
 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook not configured", { status: 503 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return new Response("Mercado Pago access token not configured", { status: 503 });
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return new Response("Database not configured", { status: 503 });
  }

  const rawBody = await request.text();

  try {
    const result = await processMercadoPagoWebhook({
      request,
      rawBody,
      secret,
      accessToken,
      admin,
    });

    if (!result.ok) {
      return new Response(result.message, { status: result.status });
    }

    return Response.json({ ok: true, detail: result.detail });
  } catch (e) {
    console.error("[mercadopago webhook]", e);
    return new Response("Webhook handler error", { status: 500 });
  }
}
