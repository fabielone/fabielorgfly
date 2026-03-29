import { Link } from "react-router";

import type { Route } from "./+types/schedule";
import { MonthPromotionPricing } from "~/components/MonthPromotionPricing";
import {
  SCHEDULE_DAY_LABEL,
  SCHEDULE_KIND_LABEL,
  sortSlotsByDayThenTime,
  type ScheduleEventKind,
  type ScheduleTeacher,
  WEEKLY_SCHEDULE_TEACHERS,
} from "~/lib/weekly-schedule";
import { newSubscriberMonthlyMxn } from "~/lib/pricing";
import { getActivePayingSubscriptionCount } from "~/lib/subscription-count.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Weekly schedule — Fabielorg" },
    {
      name: "description",
      content:
        "Live classes, TikTok lives, and social sessions by teacher. All times are in your local timezone unless stated otherwise.",
    },
  ];
}

export async function loader() {
  const activePayingCount = await getActivePayingSubscriptionCount();
  const teachers: ScheduleTeacher[] = WEEKLY_SCHEDULE_TEACHERS.map((t) => ({
    ...t,
    slots: sortSlotsByDayThenTime(t.slots),
  }));

  return {
    teachers,
    promoMonthlyMxn: newSubscriberMonthlyMxn(activePayingCount),
  };
}

function kindBadgeClass(kind: ScheduleEventKind): string {
  switch (kind) {
    case "live_class":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200";
    case "tiktok_live":
      return "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/60 dark:text-fuchsia-200";
    case "social_live":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
  }
}

function formatTimeRange(start: string, end: string): string {
  return `${start}–${end}`;
}

export default function Schedule({ loaderData }: Route.ComponentProps) {
  const { teachers, promoMonthlyMxn } = loaderData;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        Recurring weekly
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Live schedule</h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Live classes, TikTok sessions, and other social lives — organized by teacher. Times are shown in{" "}
        <strong>24-hour</strong> format; join links are shared in the member area and announcements when a session is
        about to start.
      </p>

      <aside
        className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
        role="note"
      >
        <p className="font-semibold">Legend</p>
        <ul className="mt-2 flex flex-wrap gap-3">
          <li>
            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${kindBadgeClass("live_class")}`}>
              {SCHEDULE_KIND_LABEL.live_class}
            </span>
          </li>
          <li>
            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${kindBadgeClass("tiktok_live")}`}>
              {SCHEDULE_KIND_LABEL.tiktok_live}
            </span>
          </li>
          <li>
            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${kindBadgeClass("social_live")}`}>
              {SCHEDULE_KIND_LABEL.social_live}
            </span>
          </li>
        </ul>
        <div className="mt-3">
          <MonthPromotionPricing effectiveMonthlyMxn={promoMonthlyMxn} variant="compact" />
        </div>
        <p className="mt-3">
          Full course materials and replays (when offered) are on{" "}
          <Link to="/courses" className="font-medium underline">
            Courses
          </Link>
          . Subscribers get priority access to live rooms — see{" "}
          <Link to="/subscribe" className="font-medium underline">
            Subscribe
          </Link>
          .
        </p>
      </aside>

      <div className="mt-12 space-y-10">
        {teachers.map((teacher) => (
          <section
            key={teacher.id}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
            aria-labelledby={`schedule-teacher-${teacher.id}`}
          >
            <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <h2 id={`schedule-teacher-${teacher.id}`} className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {teacher.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{teacher.focus}</p>
            </div>
            <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              {teacher.slots.map((slot, i) => (
                <li key={`${teacher.id}-${slot.day}-${slot.start}-${i}`} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{slot.title}</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{SCHEDULE_DAY_LABEL[slot.day]}</span>
                      <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
                      <span className="tabular-nums">{formatTimeRange(slot.start, slot.end)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${kindBadgeClass(slot.kind)}`}>
                      {SCHEDULE_KIND_LABEL[slot.kind]}
                    </span>
                    {slot.href ? (
                      <a
                        href={slot.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400"
                      >
                        Link
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Schedule changes are announced in the community.
      </p>
    </div>
  );
}
