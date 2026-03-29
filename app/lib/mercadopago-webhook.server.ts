import crypto from "node:crypto";

import { MercadoPagoConfig, Order, Payment, PreApproval } from "mercadopago";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GRACE_MS = 10 * 24 * 60 * 60 * 1000;

export function extractWebhookResourceId(url: URL, body: Record<string, unknown>): string | null {
  const fromQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (fromQuery) return String(fromQuery);
  const data = body.data;
  if (data && typeof data === "object" && data !== null && "id" in data && (data as { id: unknown }).id != null) {
    return String((data as { id: unknown }).id);
  }
  return null;
}

export function inferWebhookResourceType(url: URL, body: Record<string, unknown>): string {
  const t = body.type;
  if (typeof t === "string" && t.length > 0) return t;
  const topic = url.searchParams.get("topic");
  if (topic) return topic;
  const action = typeof body.action === "string" ? body.action : "";
  if (action.startsWith("payment.")) return "payment";
  if (action.startsWith("order.")) return "order";
  return "unknown";
}

export function parseMercadoPagoSignatureHeader(xSignature: string | null): { ts: string; v1: string } | null {
  if (!xSignature) return null;
  let ts = "";
  let v1 = "";
  for (const part of xSignature.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key === "ts") ts = val;
    if (key === "v1") v1 = val;
  }
  if (!ts || !v1) return null;
  return { ts, v1 };
}

/**
 * @see https://www.mercadopago.com/developers/en/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoWebhookSignature(opts: {
  secret: string;
  requestId: string | null;
  xSignature: string | null;
  resourceId: string;
}): boolean {
  const parsed = parseMercadoPagoSignatureHeader(opts.xSignature);
  if (!parsed || !opts.requestId) return false;
  const manifest = `id:${opts.resourceId};request-id:${opts.requestId};ts:${parsed.ts};`;
  const expectedHex = crypto.createHmac("sha256", opts.secret).update(manifest).digest("hex");
  const received = parsed.v1.toLowerCase();
  if (received.length !== expectedHex.length || !/^[0-9a-f]+$/.test(received)) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expectedHex, "hex"));
  } catch {
    return false;
  }
}

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

function graceEndIso(): string {
  return new Date(Date.now() + GRACE_MS).toISOString();
}

async function fetchAuthorizedPaymentJson(
  id: string,
  accessToken: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

async function upsertSubscriptionRow(
  admin: SupabaseClient,
  params: {
    userId: string;
    mercadoPagoSubscriptionId: string | null;
    lockedMonthlyMxn: number;
    status: "none" | "active" | "past_due" | "canceled";
    gracePeriodEndsAt: string | null;
    currentPeriodEnd: string | null;
  },
): Promise<void> {
  const { data: existing, error: selErr } = await admin
    .from("subscriptions")
    .select("id, mercado_pago_subscription_id")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);

  const payload = {
    user_id: params.userId,
    mercado_pago_subscription_id: params.mercadoPagoSubscriptionId,
    locked_monthly_mxn: params.lockedMonthlyMxn,
    status: params.status,
    grace_period_ends_at: params.gracePeriodEndsAt,
    current_period_end: params.currentPeriodEnd,
  };

  if (existing?.id) {
    const nextMpId = params.mercadoPagoSubscriptionId ?? existing.mercado_pago_subscription_id ?? null;
    const { error } = await admin
      .from("subscriptions")
      .update({
        mercado_pago_subscription_id: nextMpId,
        locked_monthly_mxn: params.lockedMonthlyMxn,
        status: params.status,
        grace_period_ends_at: params.gracePeriodEndsAt,
        current_period_end: params.currentPeriodEnd,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.from("subscriptions").insert(payload);
  if (error) throw new Error(error.message);
}

async function syncFromPreApproval(admin: SupabaseClient, accessToken: string, preapprovalId: string): Promise<void> {
  const config = new MercadoPagoConfig({ accessToken });
  const client = new PreApproval(config);
  const pre = await client.get({ id: preapprovalId });
  const body = pre as unknown as Record<string, unknown>;
  const ext = typeof body.external_reference === "string" ? body.external_reference : "";
  if (!isUuid(ext)) return;

  const amount = Number((body.auto_recurring as { transaction_amount?: number } | undefined)?.transaction_amount);
  const locked = Number.isFinite(amount) && amount > 0 ? amount : 0;

  const st = String(body.status ?? "");
  let status: "active" | "past_due" | "canceled" = "past_due";
  let grace: string | null = null;
  if (st === "authorized") {
    status = "active";
    grace = null;
  } else if (st === "cancelled" || st === "canceled") {
    status = "canceled";
  } else if (st === "paused") {
    status = "past_due";
    grace = graceEndIso();
  }

  const nextPay =
    typeof body.next_payment_date === "string" ? new Date(body.next_payment_date).toISOString() : null;

  await upsertSubscriptionRow(admin, {
    userId: ext,
    mercadoPagoSubscriptionId: String(preapprovalId),
    lockedMonthlyMxn: locked,
    status,
    gracePeriodEndsAt: grace,
    currentPeriodEnd: nextPay,
  });
}

async function syncFromPayment(admin: SupabaseClient, accessToken: string, paymentId: string): Promise<void> {
  const config = new MercadoPagoConfig({ accessToken });
  const client = new Payment(config);
  const pay = await client.get({ id: paymentId });
  const body = pay as unknown as Record<string, unknown>;
  const ext = typeof body.external_reference === "string" ? body.external_reference : "";
  if (!isUuid(ext)) return;

  const amount = Number(body.transaction_amount);
  const locked = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const st = String(body.status ?? "");

  const meta = body.metadata as Record<string, unknown> | undefined;
  const metaPreapproval =
    meta && typeof meta.preapproval_id === "string"
      ? meta.preapproval_id
      : meta && typeof meta.subscription_id === "string"
        ? meta.subscription_id
        : null;

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", ext)
    .maybeSingle();

  if (st === "approved") {
    await upsertSubscriptionRow(admin, {
      userId: ext,
      mercadoPagoSubscriptionId: metaPreapproval,
      lockedMonthlyMxn: locked,
      status: "active",
      gracePeriodEndsAt: null,
      currentPeriodEnd: typeof body.date_of_expiration === "string" ? body.date_of_expiration : null,
    });
    return;
  }

  if ((st === "rejected" || st === "cancelled" || st === "canceled") && existing?.status === "active") {
    await upsertSubscriptionRow(admin, {
      userId: ext,
      mercadoPagoSubscriptionId: metaPreapproval,
      lockedMonthlyMxn: locked,
      status: "past_due",
      gracePeriodEndsAt: graceEndIso(),
      currentPeriodEnd: null,
    });
  }
}

async function syncFromOrder(admin: SupabaseClient, accessToken: string, orderId: string): Promise<void> {
  const config = new MercadoPagoConfig({ accessToken });
  const client = new Order(config);
  const ord = await client.get({ id: orderId });
  const body = ord as unknown as Record<string, unknown>;
  const ext = typeof body.external_reference === "string" ? body.external_reference : "";
  if (!isUuid(ext)) return;

  const total = Number(body.total_amount);
  const locked = Number.isFinite(total) && total > 0 ? total : 0;
  const st = String(body.status ?? "").toLowerCase();

  if (st === "closed" || st === "paid" || st === "processed") {
    await upsertSubscriptionRow(admin, {
      userId: ext,
      mercadoPagoSubscriptionId: null,
      lockedMonthlyMxn: locked,
      status: "active",
      gracePeriodEndsAt: null,
      currentPeriodEnd: null,
    });
  }
}

async function syncFromAuthorizedPayment(
  admin: SupabaseClient,
  accessToken: string,
  authorizedPaymentId: string,
): Promise<void> {
  const ap = await fetchAuthorizedPaymentJson(authorizedPaymentId, accessToken);
  if (!ap) return;

  const preapprovalId =
    typeof ap.preapproval_id === "string"
      ? ap.preapproval_id
      : typeof ap.subscription_id === "string"
        ? ap.subscription_id
        : null;

  if (preapprovalId) {
    await syncFromPreApproval(admin, accessToken, preapprovalId);
    return;
  }

  const paymentObj = ap.payment as { id?: string | number } | undefined;
  const pid = paymentObj?.id;
  if (pid != null) {
    await syncFromPayment(admin, accessToken, String(pid));
  }
}

export async function processMercadoPagoWebhook(opts: {
  request: Request;
  rawBody: string;
  secret: string;
  accessToken: string;
  admin: SupabaseClient;
}): Promise<{ ok: true; detail: string } | { ok: false; status: number; message: string }> {
  let body: Record<string, unknown> = {};
  if (opts.rawBody.trim()) {
    try {
      body = JSON.parse(opts.rawBody) as Record<string, unknown>;
    } catch {
      return { ok: false, status: 400, message: "Invalid JSON" };
    }
  }

  const url = new URL(opts.request.url);
  const resourceId = extractWebhookResourceId(url, body);
  if (!resourceId) {
    return { ok: false, status: 400, message: "Missing resource id" };
  }

  const requestId = opts.request.headers.get("x-request-id") ?? opts.request.headers.get("X-Request-Id");
  const xSignature = opts.request.headers.get("x-signature") ?? opts.request.headers.get("X-Signature");

  if (!verifyMercadoPagoWebhookSignature({
    secret: opts.secret,
    requestId,
    xSignature,
    resourceId,
  })) {
    return { ok: false, status: 401, message: "Invalid signature" };
  }

  const resourceType = inferWebhookResourceType(url, body);

  switch (resourceType) {
    case "payment":
      await syncFromPayment(opts.admin, opts.accessToken, resourceId);
      return { ok: true, detail: "payment" };

    case "order":
      await syncFromOrder(opts.admin, opts.accessToken, resourceId);
      return { ok: true, detail: "order" };

    case "subscription_preapproval":
    case "preapproval":
      await syncFromPreApproval(opts.admin, opts.accessToken, resourceId);
      return { ok: true, detail: "preapproval" };

    case "subscription_authorized_payment":
      await syncFromAuthorizedPayment(opts.admin, opts.accessToken, resourceId);
      return { ok: true, detail: "authorized_payment" };

    case "subscription_preapproval_plan":
    case "topic_merchant_order_wh":
    case "merchant_order":
      return { ok: true, detail: `ignored:${resourceType}` };

    default:
      return { ok: true, detail: `no-op:${resourceType}` };
  }
}
