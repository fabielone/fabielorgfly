import { Link } from "react-router";

import type { Route } from "./+types/courses";
import {
  buildCoursesSearch,
  filterCourses,
  parseCourseFilters,
  type CoursePreviewFilter,
  type CourseTrackFilter,
} from "~/lib/course-filters";
import { MonthPromotionPricing } from "~/components/MonthPromotionPricing";
import { newSubscriberMonthlyMxn } from "~/lib/pricing";
import { getActivePayingSubscriptionCount } from "~/lib/subscription-count.server";
import { SAMPLE_COURSES, countFreePreviews } from "~/lib/sample-courses";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Courses — Fabielorg" },
    {
      name: "description",
      content: "Tech and English courses. Select lessons are free previews; full courses require a subscription.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { track, preview } = parseCourseFilters(new URL(request.url).searchParams);
  const filtered = filterCourses(SAMPLE_COURSES, track, preview);
  const activePayingCount = await getActivePayingSubscriptionCount();

  return {
    courses: filtered.map((c) => ({
      ...c,
      freePreviewCount: countFreePreviews(c),
    })),
    filters: { track, preview },
    totalInCatalog: SAMPLE_COURSES.length,
    promoMonthlyMxn: newSubscriberMonthlyMxn(activePayingCount),
  };
}

function trackStyles(track: "tech" | "english") {
  return track === "tech"
    ? "bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200"
    : "bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200";
}

function filterPillClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;
}

function CourseFilterBar({
  track,
  preview,
}: {
  track: CourseTrackFilter;
  preview: CoursePreviewFilter;
}) {
  const trackOptions: { value: CourseTrackFilter; label: string }[] = [
    { value: "all", label: "All tracks" },
    { value: "tech", label: "Tech" },
    { value: "english", label: "English" },
  ];
  const previewOptions: { value: CoursePreviewFilter; label: string }[] = [
    { value: "all", label: "Any previews" },
    { value: "yes", label: "Has free preview" },
    { value: "no", label: "Members only (no free lesson)" },
  ];

  return (
    <div className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filter courses</p>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Track</span>
        <div className="flex flex-wrap gap-2">
          {trackOptions.map((opt) => (
            <Link
              key={opt.value}
              to={`/courses${buildCoursesSearch(opt.value, preview)}`}
              className={filterPillClass(track === opt.value)}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Free preview</span>
        <div className="flex flex-wrap gap-2">
          {previewOptions.map((opt) => (
            <Link
              key={opt.value}
              to={`/courses${buildCoursesSearch(track, opt.value)}`}
              className={filterPillClass(preview === opt.value)}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Courses({ loaderData }: Route.ComponentProps) {
  const { courses, filters, totalInCatalog, promoMonthlyMxn } = loaderData;
  const filteredCount = courses.length;
  const isFiltered = filteredCount !== totalInCatalog;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Courses</h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Every full course needs an active subscription—there is no completely free certificate path. Some courses
          include one or more <strong>free preview</strong> lessons so you can try the teaching style before you
          subscribe; others are <strong>members only</strong> from the first lesson.
        </p>
      </div>

      <div className="mt-8">
        <MonthPromotionPricing effectiveMonthlyMxn={promoMonthlyMxn} variant="inline" />
      </div>

      <aside
        className="mt-8 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100 sm:flex-row sm:items-center sm:justify-between"
        role="note"
      >
        <p>
          Free account: job board shortcuts. <strong>Subscription</strong>: all lessons, repo access, and member
          materials.
        </p>
        <Link
          to="/subscribe"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          View subscription
        </Link>
      </aside>

      <CourseFilterBar track={filters.track} preview={filters.preview} />

      {isFiltered && (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Showing <strong>{filteredCount}</strong> of <strong>{totalInCatalog}</strong> courses.
          <Link to="/courses" className="ml-2 font-medium text-emerald-700 underline dark:text-emerald-400">
            Clear filters
          </Link>
        </p>
      )}

      {filteredCount === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          No courses match these filters.{" "}
          <Link to="/courses" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Reset filters
          </Link>
        </p>
      ) : (
      <ul className="mt-12 grid gap-6 sm:grid-cols-2">
        {courses.map((course) => (
          <li
            key={course.slug}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${trackStyles(course.track)}`}>
                {course.track === "tech" ? "Tech" : "English"}
              </span>
              {course.freePreviewCount > 0 ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                  {course.freePreviewCount} free preview lesson{course.freePreviewCount === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                  No free lessons · members only
                </span>
              )}
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">{course.title}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{course.subtitle}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{course.description}</p>
            <p className="mt-4 text-xs text-zinc-500">
              {course.lessonCount} lessons · full access with subscription
            </p>
            <Link
              to={`/courses/${course.slug}`}
              className="mt-5 inline-flex items-center justify-center rounded-lg border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Open course
            </Link>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
