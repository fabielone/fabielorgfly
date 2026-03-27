import { STANDARD_LIST_PRICE_MXN } from "~/lib/pricing";

type Variant = "hero" | "inline" | "compact";

/**
 * Compares the usual list price (599 MXN/mo) with the effective signup price for this wave.
 */
export function MonthPromotionPricing({
  effectiveMonthlyMxn,
  variant = "hero",
  className = "",
}: {
  effectiveMonthlyMxn: number;
  variant?: Variant;
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <p className={`text-sm ${className}`}>
        <span className="font-semibold text-emerald-800 dark:text-emerald-200">This month:</span>{" "}
        <span className="text-zinc-400 line-through">{STANDARD_LIST_PRICE_MXN} MXN/mo</span>{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">→ {effectiveMonthlyMxn} MXN/mo</span>{" "}
        <span className="text-zinc-600 dark:text-zinc-400">locked while you stay subscribed.</span>
      </p>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={`rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-100 ${className}`}
      >
        <p className="font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
          This month&apos;s promotion
        </p>
        <p className="mt-2">
          <span className="text-zinc-500 line-through dark:text-zinc-400">
            {STANDARD_LIST_PRICE_MXN} MXN / month
          </span>{" "}
          <span className="font-bold text-emerald-900 dark:text-emerald-100">
            {effectiveMonthlyMxn} MXN / month
          </span>{" "}
          for new signups—your rate stays the same for life as long as you don&apos;t cancel.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm dark:border-emerald-700/50 dark:from-emerald-950/40 dark:to-zinc-900/80 ${className}`}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
        This month&apos;s promotion
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Usual list price</p>
          <p className="text-2xl font-semibold text-zinc-400 line-through dark:text-zinc-500">
            {STANDARD_LIST_PRICE_MXN} <span className="text-base font-normal">MXN / mo</span>
          </p>
        </div>
        <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-4xl">
          {effectiveMonthlyMxn}{" "}
          <span className="text-lg font-semibold text-emerald-800/90 dark:text-emerald-200/90">MXN / mo</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Lock <strong>{effectiveMonthlyMxn} MXN per month</strong> for as long as you keep your subscription
        active—instead of the regular <strong>{STANDARD_LIST_PRICE_MXN} MXN / month</strong> list rate.
      </p>
    </div>
  );
}
