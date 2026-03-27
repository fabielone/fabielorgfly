import { countFreePreviews, type SampleCourse } from "~/lib/sample-courses";

export type CourseTrackFilter = "all" | "tech" | "english";
export type CoursePreviewFilter = "all" | "yes" | "no";

export function parseCourseFilters(searchParams: URLSearchParams): {
  track: CourseTrackFilter;
  preview: CoursePreviewFilter;
} {
  const t = searchParams.get("track");
  const p = searchParams.get("preview");
  const track: CourseTrackFilter = t === "tech" || t === "english" ? t : "all";
  const preview: CoursePreviewFilter = p === "yes" || p === "no" ? p : "all";
  return { track, preview };
}

export function buildCoursesSearch(track: CourseTrackFilter, preview: CoursePreviewFilter): string {
  const q = new URLSearchParams();
  if (track !== "all") q.set("track", track);
  if (preview !== "all") q.set("preview", preview);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function filterCourses(
  courses: SampleCourse[],
  track: CourseTrackFilter,
  preview: CoursePreviewFilter,
): SampleCourse[] {
  let list = courses;
  if (track !== "all") {
    list = list.filter((c) => c.track === track);
  }
  if (preview === "yes") {
    list = list.filter((c) => countFreePreviews(c) > 0);
  } else if (preview === "no") {
    list = list.filter((c) => countFreePreviews(c) === 0);
  }
  return list;
}
