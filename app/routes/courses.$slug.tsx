import { Link } from "react-router";

import type { Route } from "./+types/courses.$slug";
import { countFreePreviews, getSampleCourseBySlug } from "~/lib/sample-courses";

export function meta({ data }: Route.MetaArgs) {
  if (!data?.title) {
    return [{ title: "Course — Fabielorg" }];
  }
  return [{ title: `${data.title} — Fabielorg` }];
}

export function loader({ params }: Route.LoaderArgs) {
  const course = getSampleCourseBySlug(params.slug);
  if (!course) {
    throw new Response("Course not found", { status: 404 });
  }
  return {
    title: course.title,
    slug: course.slug,
    subtitle: course.subtitle,
    track: course.track,
    description: course.description,
    lessons: course.lessons,
    freePreviewCount: countFreePreviews(course),
  };
}

export default function CourseDetail({ loaderData }: Route.ComponentProps) {
  const { title, subtitle, track, description, lessons, freePreviewCount } = loaderData;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-zinc-500">
        <Link to="/courses" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          ← All courses
        </Link>
      </p>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {track === "tech" ? "Tech" : "English"}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      <p className="mt-6 text-zinc-700 dark:text-zinc-300">{description}</p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        {freePreviewCount > 0 ? (
          <p>
            <strong>{freePreviewCount}</strong> lesson{freePreviewCount === 1 ? "" : "s"} available as a{" "}
            <span className="text-amber-800 dark:text-amber-200">free preview</span>. The rest (and any materials,
            repo tasks, and capstones) require an <Link to="/subscribe" className="font-semibold underline">active subscription</Link>.
          </p>
        ) : (
          <p>
            This course has <strong>no free preview lessons</strong>. All video and workbook content is for{" "}
            <Link to="/subscribe" className="font-semibold underline">subscribers only</Link>.
          </p>
        )}
      </div>

      <h2 className="mt-12 text-lg font-semibold">Lessons</h2>
      <ol className="mt-4 space-y-3">
        {lessons.map((lesson, index) => (
          <li
            key={lesson.id}
            className={`flex flex-col gap-2 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
              lesson.isFreePreview
                ? "border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40"
            }`}
          >
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{lesson.title}</p>
                <p className="text-xs text-zinc-500">{lesson.durationMin} min</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {lesson.isFreePreview && lesson.previewUrl ? (
                <>
                  <span className="rounded-md bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
                    Free preview
                  </span>
                  <a
                    href={lesson.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    Watch on YouTube
                  </a>
                </>
              ) : lesson.isFreePreview ? (
                <span className="rounded-md bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
                  Free preview · link TBD
                </span>
              ) : (
                <>
                  <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200">
                    Members only
                  </span>
                  <Link
                    to="/subscribe"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Subscribe to unlock
                  </Link>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
