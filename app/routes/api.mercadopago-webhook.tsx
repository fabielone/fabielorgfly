import type { Route } from "./+types/api.mercadopago-webhook";
import { createSupabaseServiceClient } from "~/lib/supabase.server";

/**
 * Mercado Pago sends subscription / payment events here.
 * Verify signatures with Mercado Pago's SDK or raw HMAC using MERCADOPAGO_WEBHOOK_SECRET.
 * Map events → rows in `subscriptions` (status, grace_period_ends_at, locked_monthly_mxn, etc.).
 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook not configured", { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return new Response("Database not configured", { status: 503 });
  }

  // TODO: verify Mercado Pago signature headers against raw body.
  // TODO: parse subscription id + state; update Supabase:
  //   - active → status 'active', clear grace_period_ends_at
  //   - payment failed → status 'past_due', grace_period_ends_at = now + 10 days
  //   - canceled → status 'canceled'

  console.info("[mercadopago webhook] received (stub)", JSON.stringify(body).slice(0, 500));

  return Response.json({ ok: true });
}
