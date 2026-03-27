import { Link } from "react-router";

import type { Route } from "./+types/subscribe";
import { MonthPromotionPricing } from "~/components/MonthPromotionPricing";
import { newSubscriberMonthlyMxn, STANDARD_LIST_PRICE_MXN } from "~/lib/pricing";
import { getActivePayingSubscriptionCount } from "~/lib/subscription-count.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Subscription — Fabielorg" }];
}

export async function loader() {
  const activePayingCount = await getActivePayingSubscriptionCount();
  const nextSignupPriceMxn = newSubscriberMonthlyMxn(activePayingCount);

  return { activePayingCount, nextSignupPriceMxn, mercadoPagoReady: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN) };
}

export default function Subscribe({ loaderData }: Route.ComponentProps) {
  const { activePayingCount, nextSignupPriceMxn, mercadoPagoReady } = loaderData;

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
        Mercado Pago handles recurring charges; if a charge fails, give members a <strong>10-day grace</strong>{" "}
        window in your webhook before revoking access (implement the dates in{" "}
        <code className="rounded bg-zinc-200 px-1 text-sm dark:bg-zinc-800">subscriptions.grace_period_ends_at</code>
        ).
      </p>

      <div className="mt-8">
        <MonthPromotionPricing effectiveMonthlyMxn={nextSignupPriceMxn} variant="hero" />
      </div>

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

        <div className="mt-8 space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Wire Mercado Pago preapproval or subscription checkout here. Server-side, create a plan with the
            current <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">nextSignupPriceMxn</code> amount,
            store <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">locked_monthly_mxn</code> on the
            user row when the webhook confirms payment, and never raise it for that customer.
          </p>
          {!mercadoPagoReady && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
              Set <code className="font-mono text-xs">MERCADOPAGO_ACCESS_TOKEN</code> on Fly.io when you are ready
              to call the Mercado Pago APIs from this app.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-lg bg-zinc-300 py-3 text-sm font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
        >
          Start Mercado Pago checkout (connect token first)
        </button>
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
