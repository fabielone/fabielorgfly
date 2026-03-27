import { Link } from "react-router";

import type { Route } from "./+types/home";
import { MonthPromotionPricing } from "~/components/MonthPromotionPricing";
import {
  BASE_NEW_SUBSCRIBER_MXN,
  TIER_STEP_SUBSCRIBERS,
  newSubscriberMonthlyMxn,
  spotsUntilNextPriceBump,
} from "~/lib/pricing";
import { getActivePayingSubscriptionCount } from "~/lib/subscription-count.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "fabiel.org — Land a job" },
    {
      name: "description",
      content:
        "Learn the skills you need to land a job. Practical courses, repository access, and portfolio-ready experience.",
    },
  ];
}

export async function loader() {
  const activePayingCount = await getActivePayingSubscriptionCount();

  return {
    promoMonthlyMxn: newSubscriberMonthlyMxn(activePayingCount),
    spotsLeft: spotsUntilNextPriceBump(activePayingCount),
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { promoMonthlyMxn, spotsLeft } = loaderData;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
        Career training for real roles
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        Learn the skills you need to land a job.
      </h1>

      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        Choose the track that fits your target role and build job-ready skills with practical training. You also get
        access to real, usable repositories that strengthen your portfolio and can be reused in future projects.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Coding track</p>
          <h2 className="mt-2 text-lg font-semibold">Build with modern development workflows</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Learn core coding skills through practical exercises, access to repositories, and reusable components.
            Build and ship work through pull requests and reviews so your portfolio reflects real team collaboration.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">English track</p>
          <h2 className="mt-2 text-lg font-semibold">Voice and back-office readiness</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Practice real-world scenarios for voice and back-office roles: calls, chat handling, ticket writing,
            escalation flow, and customer-facing communication. Learn everything you need to work confidently in
            English-based operations and support roles.
          </p>
        </section>
      </div>

      <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        More tracks are coming soon.
      </p>

      <div className="mt-8">
        <MonthPromotionPricing effectiveMonthlyMxn={promoMonthlyMxn} variant="hero" />
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">Launch promotion</p>
        <p className="mt-1">
          Once-in-a-lifetime offer: <strong>{BASE_NEW_SUBSCRIBER_MXN} MXN / month</strong> lock-in pricing for life
          for the first <strong>{TIER_STEP_SUBSCRIBERS}</strong> subscribers. <strong>{spotsLeft}</strong> positions
          left at this tier.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/subscribe"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
        >
          Subscribe
        </Link>
        <Link
          to="/courses"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          View courses
        </Link>
      </div>
    </div>
  );
}
