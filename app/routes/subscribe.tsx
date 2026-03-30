import { data, Form, Link, redirect, useActionData } from "react-router";

import type { Route } from "./+types/subscribe";
import { MonthPromotionPricing } from "~/components/MonthPromotionPricing";
import { createMercadoPagoSubscriptionCheckout } from "~/lib/mercadopago-checkout.server";
import { getPublicOrigin } from "~/lib/public-origin.server";
import { newSubscriberMonthlyMxn, STANDARD_LIST_PRICE_MXN } from "~/lib/pricing";
import { getActivePayingSubscriptionCount } from "~/lib/subscription-count.server";
import { hasActiveSubscriberAccess, type SubscriptionAccessRow } from "~/lib/subscription-access.server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "~/lib/supabase.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Subscription — Fabielorg" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const activePayingCount = await getActivePayingSubscriptionCount();
  const nextSignupPriceMxn = newSubscriberMonthlyMxn(activePayingCount);
  const url = new URL(request.url);
  const checkoutReturn = url.searchParams.get("checkout") === "return";

  const { supabase, headers } = createSupabaseServerClient(request);
  let user: { id: string; email?: string | null } | null = null;
  let userSubscription: SubscriptionAccessRow | null = null;

  if (supabase) {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth.user;
    if (u) {
      user = { id: u.id, email: u.email };
      const admin = createSupabaseServiceClient();
      if (admin) {
        const { data } = await admin
          .from("subscriptions")
          .select("status, grace_period_ends_at")
          .eq("user_id", u.id)
          .maybeSingle();
        if (data) userSubscription = data as SubscriptionAccessRow;
      }
    }
  }

  const mercadoPagoSandbox =
    process.env.MERCADOPAGO_SANDBOX === "1" ||
    process.env.MERCADOPAGO_SANDBOX === "true" ||
    process.env.MERCADOPAGO_SANDBOX === "yes";
  const mercadoPagoSandboxPayerEmailSet = Boolean(process.env.MERCADOPAGO_SANDBOX_PAYER_EMAIL?.trim());

  return data(
    {
      activePayingCount,
      nextSignupPriceMxn,
      mercadoPagoReady: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()),
      mercadoPagoSandbox,
      mercadoPagoSandboxPayerEmailSet,
      user,
      hasActiveAccess: hasActiveSubscriberAccess(userSubscription),
      checkoutReturn,
    },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return data({ error: "Mercado Pago is not configured." }, { status: 503 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);
  if (!supabase) {
    return data({ error: "Sign in is not available." }, { status: 503, headers });
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return data({ error: "Sign in to subscribe." }, { status: 401, headers });
  }

  const email = user.email?.trim() ?? "";
  const sandbox =
    process.env.MERCADOPAGO_SANDBOX === "1" ||
    process.env.MERCADOPAGO_SANDBOX === "true" ||
    process.env.MERCADOPAGO_SANDBOX === "yes";
  const sandboxPayerEmail = process.env.MERCADOPAGO_SANDBOX_PAYER_EMAIL?.trim();
  if (!email && !(sandbox && sandboxPayerEmail)) {
    return data(
      { error: "Add an email to your account (e.g. re-link GitHub with email) before subscribing." },
      { status: 400, headers },
    );
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return data({ error: "Server configuration error." }, { status: 503, headers });
  }

  const { data: subRow } = await admin
    .from("subscriptions")
    .select("status, grace_period_ends_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (hasActiveSubscriberAccess(subRow as SubscriptionAccessRow | null)) {
    return data({ error: "You already have an active subscription or are in a grace period." }, { status: 400, headers });
  }

  const activePayingCount = await getActivePayingSubscriptionCount();
  const monthlyAmountMxn = newSubscriberMonthlyMxn(activePayingCount);

  const origin = getPublicOrigin(request);
  const backUrl = `${origin}/subscribe?checkout=return`;

  const result = await createMercadoPagoSubscriptionCheckout({
    accessToken,
    userId: user.id,
    payerEmail: email,
    monthlyAmountMxn,
    backUrl,
  });

  if ("error" in result) {
    return data({ error: result.error }, { status: 400, headers });
  }

  throw redirect(result.initPoint, { headers });
}

export default function Subscribe({ loaderData }: Route.ComponentProps) {
  const {
    activePayingCount,
    nextSignupPriceMxn,
    mercadoPagoReady,
    mercadoPagoSandbox,
    mercadoPagoSandboxPayerEmailSet,
    user,
    hasActiveAccess,
    checkoutReturn,
  } = loaderData;
  const actionData = useActionData<typeof action>();
  const actionError = actionData && "error" in actionData ? actionData.error : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-sm text-zinc-500">
        <Link to="/courses" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          ← Course catalog
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Subscription & member hub</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Subscribers keep the monthly price from the day they joined for as long as they stay subscribed.
        Mercado Pago handles recurring charges; if a charge fails, members get a <strong>10-day grace</strong> window
        before access ends (see <code className="rounded bg-zinc-200 px-1 text-sm dark:bg-zinc-800">subscriptions</code>{" "}
        + webhooks).
      </p>

      <div className="mt-8">
        <MonthPromotionPricing effectiveMonthlyMxn={nextSignupPriceMxn} variant="hero" />
      </div>

      {checkoutReturn && (
        <p
          className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
          role="status"
        >
          You returned from Mercado Pago. If you finished authorization, your subscription will appear as{" "}
          <strong>active</strong> shortly after the webhook runs. Refresh in a moment or open{" "}
          <Link to="/courses" className="font-medium underline">
            Courses
          </Link>
          .
        </p>
      )}

      {hasActiveAccess && (
        <p className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
          You already have member access.{" "}
          <Link to="/courses" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Go to courses
          </Link>
          .
        </p>
      )}

      {mercadoPagoReady && mercadoPagoSandbox && (
        <aside
          className="mt-8 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100"
          role="note"
        >
          <p className="font-semibold">Test mode (sandbox)</p>
          <p className="mt-2">
            Use the <strong>test access token</strong> and <code className="rounded bg-sky-100 px-1 text-xs dark:bg-sky-900/80">MERCADOPAGO_SANDBOX=true</code>. The{" "}
            <strong>public key is not used</strong> for this server-side checkout (only the access token).
          </p>
          <p className="mt-2">
            If you see <strong>“Both payer and collector must be real or test users”</strong> as soon as you click
            pay, Mercado Pago is rejecting the API call because <code className="rounded bg-sky-100 px-1 text-xs dark:bg-sky-900/80">payer_email</code> is often tied to a{" "}
            <strong>production</strong> account. Set{" "}
            <code className="rounded bg-sky-100 px-1 text-xs dark:bg-sky-900/80">MERCADOPAGO_SANDBOX_PAYER_EMAIL</code>{" "}
            in <code className="font-mono text-xs">.env</code> to the <strong>test buyer (comprador) email</strong> from{" "}
            <span className="font-medium">Cuentas de prueba</span> (the email MP shows for that user — not your personal Gmail).
            {!mercadoPagoSandboxPayerEmailSet ? (
              <span className="block pt-2 font-medium text-sky-900 dark:text-sky-50">
                You have not set MERCADOPAGO_SANDBOX_PAYER_EMAIL yet — add it and restart the dev server.
              </span>
            ) : null}
          </p>
          <p className="mt-2">
            On Mercado Pago’s page, still log in or pay as a <strong>test</strong> user / test card — not your real MP
            account.
          </p>
        </aside>
      )}

      {actionError && (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          {actionError}
        </p>
      )}

      <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-sm font-medium text-zinc-500">Checkout amount for new signups (this wave)</p>
        <p className="mt-2 text-4xl font-bold tabular-nums">
          {nextSignupPriceMxn} <span className="text-lg font-normal text-zinc-500">MXN / month</span>
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Compared to the public list rate of{" "}
          <span className="line-through">{STANDARD_LIST_PRICE_MXN} MXN / month</span> shown in the promotion above.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Based on <strong>{activePayingCount}</strong> active or grace-period subscriptions in the database.
        </p>

        {!user ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Sign in so we can attach billing to your account and lock in your price via{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">external_reference</code>.
            </p>
            <Link
              to={`/sign-in?redirectTo=${encodeURIComponent("/subscribe")}`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Sign in to continue
            </Link>
          </div>
        ) : (
          <Form method="post" className="mt-8 space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Logged in as <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.email ?? user.id}</span>
              . You will be redirected to Mercado Pago to authorize the monthly charge.
            </p>
            <button
              type="submit"
              disabled={!mercadoPagoReady || hasActiveAccess}
              className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
            >
              {mercadoPagoReady ? "Pay with Mercado Pago" : "Configure MERCADOPAGO_ACCESS_TOKEN"}
            </button>
          </Form>
        )}

        {!mercadoPagoReady && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            Set <code className="font-mono text-xs">MERCADOPAGO_ACCESS_TOKEN</code> in{" "}
            <code className="font-mono text-xs">.env</code> or Fly secrets, then restart the app.
          </p>
        )}
      </div>

      <p className="mt-10 text-center text-sm text-zinc-500">
        Not ready to pay?{" "}
        <Link to="/sign-in" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Free account
        </Link>{" "}
        still unlocks streamlined job applications.
      </p>
    </div>
  );
}
