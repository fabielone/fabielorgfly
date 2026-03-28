import { Form, Link, redirect } from "react-router";

import type { Route } from "./+types/jobs";
import { DEMO_JOBS, type DemoJob } from "~/lib/demo-jobs";
import { MonthPromotionPricing } from "~/components/MonthPromotionPricing";
import { CompensationLine, JobSkillsList, RemoteDetailLine } from "~/lib/job-display";
import { buildJobsQuery, collectJobRoleTypes, filterJobsByRole, parseJobRoleFilter } from "~/lib/job-filters";
import { normalizeJobSkills } from "~/lib/job-skills";
import { newSubscriberMonthlyMxn } from "~/lib/pricing";
import { getActivePayingSubscriptionCount } from "~/lib/subscription-count.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export type JobRow = DemoJob;
type Preference = "saved" | "hidden";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Remote job board — Fabielorg" },
    {
      name: "description",
      content: "Curated remote roles with referral links. Compensation when available. Sign in to skip repeat application forms.",
    },
  ];
}

function preferenceFromUnknown(v: unknown): Preference | null {
  return v === "saved" || v === "hidden" ? v : null;
}

function getPreferenceMap(
  rows: Array<{ job_ref: string; preference: Preference }>,
): Record<string, Preference> {
  const map: Record<string, Preference> = {};
  for (const row of rows) map[row.job_ref] = row.preference;
  return map;
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  if (!supabase) {
    return redirect("/sign-in", { headers });
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return redirect("/sign-in", { headers });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const jobRef = String(formData.get("jobRef") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/jobs");

  if (!jobRef) {
    return redirect(redirectTo, { headers });
  }

  if (intent === "save") {
    await supabase.from("user_job_preferences").upsert(
      {
        user_id: user.id,
        job_ref: jobRef,
        preference: "saved",
      },
      { onConflict: "user_id,job_ref" },
    );
    return redirect(redirectTo, { headers });
  }

  if (intent === "hide") {
    await supabase.from("user_job_preferences").upsert(
      {
        user_id: user.id,
        job_ref: jobRef,
        preference: "hidden",
      },
      { onConflict: "user_id,job_ref" },
    );
    return redirect(redirectTo, { headers });
  }

  if (intent === "unsave" || intent === "unhide") {
    await supabase
      .from("user_job_preferences")
      .delete()
      .eq("user_id", user.id)
      .eq("job_ref", jobRef);
    return redirect(redirectTo, { headers });
  }

  return redirect(redirectTo, { headers });
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const activePayingCount = await getActivePayingSubscriptionCount();
  const promoMonthlyMxn = newSubscriberMonthlyMxn(activePayingCount);
  const { supabase } = createSupabaseServerClient(request);
  const showHidden = url.searchParams.get("showHidden") === "1";
  const viewSaved = url.searchParams.get("view") === "saved";

  let allJobs: JobRow[];
  let fromDatabase: boolean;
  let userId: string | null = null;
  let preferenceMap: Record<string, Preference> = {};

  if (!supabase) {
    allJobs = DEMO_JOBS;
    fromDatabase = false;
  } else {
    const { data: auth } = await supabase.auth.getUser();
    userId = auth.user?.id ?? null;

    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, company, role_type, referral_url, compensation, remote_detail, skills")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error || !data?.length) {
      allJobs = DEMO_JOBS;
      fromDatabase = false;
    } else {
      allJobs = (data as Record<string, unknown>[]).map((row) => ({
        ...(row as JobRow),
        skills: normalizeJobSkills(row.skills),
      }));
      fromDatabase = true;
    }

    if (userId) {
      const { data: prefs } = await supabase
        .from("user_job_preferences")
        .select("job_ref, preference")
        .eq("user_id", userId);
      preferenceMap = getPreferenceMap(
        (prefs ?? [])
          .map((p) => ({
            job_ref: String(p.job_ref ?? ""),
            preference: preferenceFromUnknown(p.preference),
          }))
          .filter((p): p is { job_ref: string; preference: Preference } => Boolean(p.job_ref && p.preference)),
      );
    }
  }

  if (viewSaved && !userId) {
    return redirect("/sign-in");
  }

  const roleTypes = collectJobRoleTypes(allJobs);
  const role = parseJobRoleFilter(url.searchParams, roleTypes);
  let jobs = filterJobsByRole(allJobs, role);
  if (userId && !showHidden) {
    jobs = jobs.filter((j) => preferenceMap[String(j.id)] !== "hidden");
  }

  if (userId && viewSaved) {
    jobs = jobs.filter((j) => preferenceMap[String(j.id)] === "saved");
  }

  return {
    jobs,
    allJobsCount: allJobs.length,
    roleTypes,
    filters: { role, showHidden, viewSaved },
    fromDatabase,
    promoMonthlyMxn,
    preferenceMap,
    isLoggedIn: Boolean(userId),
  };
}

function roleFilterPillClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;
}

function formatRoleLabel(role: string) {
  if (role.length === 0) return role;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function JobFilterBar({
  roleTypes,
  activeRole,
  filters,
}: {
  roleTypes: string[];
  activeRole: string;
  filters: { showHidden: boolean; viewSaved: boolean };
}) {
  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filter by role</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/jobs${buildJobsQuery({ role: "all", showHidden: filters.showHidden, viewSaved: filters.viewSaved })}`}
          className={roleFilterPillClass(activeRole === "all")}
        >
          All roles
        </Link>
        {roleTypes.map((r) => (
          <Link
            key={r}
            to={`/jobs${buildJobsQuery({ role: r, showHidden: filters.showHidden, viewSaved: filters.viewSaved })}`}
            className={roleFilterPillClass(activeRole === r)}
          >
            {formatRoleLabel(r)}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Jobs({ loaderData }: Route.ComponentProps) {
  const { jobs, fromDatabase, allJobsCount, roleTypes, filters, promoMonthlyMxn, preferenceMap, isLoggedIn } =
    loaderData;
  const filteredCount = jobs.length;
  const isFiltered = filters.role !== "all";
  const redirectTo = `/jobs${buildJobsQuery({
    role: filters.role,
    showHidden: filters.showHidden,
    viewSaved: filters.viewSaved,
  })}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        Remote-first · curated
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Remote job board</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Every role here is <strong>remote</strong> (or remote-first by design). We include <strong>compensation</strong>{" "}
        when the posting or our notes have it; otherwise we mark it so you know to confirm with the employer.
        Listings use referral links — guests complete a short form per role; signed-in members go straight through.
      </p>

      <aside
        className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
        role="note"
      >
        <p className="font-semibold">Legend</p>
        <div className="mt-2">
          <MonthPromotionPricing effectiveMonthlyMxn={promoMonthlyMxn} variant="compact" />
        </div>
        <p className="mt-3">
          Want to skip filling out a form for every job?{" "}
          <Link to="/sign-in" className="font-medium underline">
            Create a free account
          </Link>
          . For structured lessons, curated paths, and repo access, see{" "}
          <Link to="/courses" className="underline">
            Courses
          </Link>{" "}
          and{" "}
          <Link to="/subscribe" className="underline">
            Subscribe
          </Link>
          . Logged-in users can <strong>save (heart)</strong> jobs and <strong>hide</strong> jobs from the list.
        </p>
      </aside>

      {isLoggedIn && (
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {filters.viewSaved ? (
            <Link
              to={`/jobs${buildJobsQuery({ role: filters.role, showHidden: filters.showHidden, viewSaved: false })}`}
              className="font-medium text-emerald-700 underline dark:text-emerald-400"
            >
              Show all jobs
            </Link>
          ) : (
            <Link
              to={`/jobs${buildJobsQuery({ role: filters.role, showHidden: filters.showHidden, viewSaved: true })}`}
              className="font-medium text-emerald-700 underline dark:text-emerald-400"
            >
              Saved jobs only
            </Link>
          )}
          {filters.showHidden ? (
            <Link
              to={`/jobs${buildJobsQuery({ role: filters.role, showHidden: false, viewSaved: filters.viewSaved })}`}
              className="font-medium text-emerald-700 underline dark:text-emerald-400"
            >
              Hide hidden jobs
            </Link>
          ) : (
            <Link
              to={`/jobs${buildJobsQuery({ role: filters.role, showHidden: true, viewSaved: filters.viewSaved })}`}
              className="font-medium text-emerald-700 underline dark:text-emerald-400"
            >
              Show hidden jobs
            </Link>
          )}
        </p>
      )}

      {!fromDatabase && (
        <p className="mt-4 text-xs text-zinc-500">
          Showing sample listings. Add rows to the <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">jobs</code>{" "}
          table in Supabase to replace these.
        </p>
      )}

      {roleTypes.length > 0 && (
        <JobFilterBar roleTypes={roleTypes} activeRole={filters.role} filters={filters} />
      )}

      {isLoggedIn && filters.viewSaved && (
        <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">Showing saved jobs only.</p>
      )}

      {isFiltered && (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Showing <strong>{filteredCount}</strong> of <strong>{allJobsCount}</strong> jobs.
          <Link to="/jobs" className="ml-2 font-medium text-emerald-700 underline dark:text-emerald-400">
            Clear filter
          </Link>
        </p>
      )}

      {filteredCount === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          {filters.viewSaved ? (
            <>
              You have not saved any jobs yet.{" "}
              <Link
                to={`/jobs${buildJobsQuery({ role: filters.role, showHidden: filters.showHidden, viewSaved: false })}`}
                className="font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                Browse all jobs
              </Link>
            </>
          ) : (
            <>
              No jobs for this role right now.{" "}
              <Link to="/jobs" className="font-medium text-emerald-700 underline dark:text-emerald-400">
                Show all roles
              </Link>
            </>
          )}
        </p>
      ) : (
      <ul className="mt-8 space-y-4">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{job.title}</h2>
                  <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                    Remote
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{job.company}</p>
                {job.role_type && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{job.role_type}</p>
                )}
                <CompensationLine compensation={job.compensation} />
                <RemoteDetailLine remoteDetail={job.remote_detail} />
                <JobSkillsList skills={job.skills} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Link
                  to={`/jobs/${job.id}/apply`}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Apply
                </Link>
                {isLoggedIn && (
                  <div className="flex items-center gap-2">
                    <Form method="post">
                      <input type="hidden" name="jobRef" value={job.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button
                        type="submit"
                        name="intent"
                        value={preferenceMap[job.id] === "saved" ? "unsave" : "save"}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {preferenceMap[job.id] === "saved" ? "Saved ♥" : "Save ♡"}
                      </button>
                    </Form>

                    <Form method="post">
                      <input type="hidden" name="jobRef" value={job.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button
                        type="submit"
                        name="intent"
                        value={preferenceMap[job.id] === "hidden" ? "unhide" : "hide"}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {preferenceMap[job.id] === "hidden" ? "Unhide" : "Hide"}
                      </button>
                    </Form>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
