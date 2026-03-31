import { startTransition, useEffect, useMemo, useOptimistic, useRef, useState } from "react";
import { data, Link, redirect, useFetcher } from "react-router";

import type { Route } from "./+types/jobs";
import { Spinner } from "~/components/Spinner";
import { DEMO_JOBS, type DemoJob } from "~/lib/demo-jobs";
import { CompensationLine, JobSkillsList, RemoteDetailLine } from "~/lib/job-display";
import { buildJobsQuery, collectJobRoleTypes, filterJobsByRole, parseJobRoleFilter } from "~/lib/job-filters";
import { normalizeJobSkills } from "~/lib/job-skills";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export type JobRow = DemoJob;
type Preference = "saved" | "hidden";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Remote job board — Fabielorg" },
    {
      name: "description",
      content: "Curated remote roles with referral links. Compensation when available. Sign in to save jobs and streamline applications.",
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

type PrefAction = { jobId: string; intent: string };

function applyPrefOptimistic(
  current: Record<string, Preference>,
  update: PrefAction,
): Record<string, Preference> {
  const next = { ...current };
  switch (update.intent) {
    case "save":
      next[update.jobId] = "saved";
      break;
    case "unsave":
      delete next[update.jobId];
      break;
    case "hide":
      next[update.jobId] = "hidden";
      break;
    case "unhide":
      delete next[update.jobId];
      break;
    default:
      return current;
  }
  return next;
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  if (!supabase) {
    return data({ ok: false as const, error: "Sign in required." }, { status: 401, headers });
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return data({ ok: false as const, error: "Sign in required." }, { status: 401, headers });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const jobRef = String(formData.get("jobRef") ?? "").trim();

  if (!jobRef) {
    return data({ ok: false as const, error: "Missing job." }, { status: 400, headers });
  }

  if (intent === "save") {
    const { error } = await supabase.from("user_job_preferences").upsert(
      { user_id: user.id, job_ref: jobRef, preference: "saved" },
      { onConflict: "user_id,job_ref" },
    );
    if (error) return data({ ok: false as const, error: "Could not save." }, { status: 500, headers });
    return data({ ok: true as const }, { headers });
  }

  if (intent === "hide") {
    const { error } = await supabase.from("user_job_preferences").upsert(
      { user_id: user.id, job_ref: jobRef, preference: "hidden" },
      { onConflict: "user_id,job_ref" },
    );
    if (error) return data({ ok: false as const, error: "Could not hide." }, { status: 500, headers });
    return data({ ok: true as const }, { headers });
  }

  if (intent === "unsave" || intent === "unhide") {
    const { error } = await supabase
      .from("user_job_preferences")
      .delete()
      .eq("user_id", user.id)
      .eq("job_ref", jobRef);
    if (error) return data({ ok: false as const, error: "Could not update." }, { status: 500, headers });
    return data({ ok: true as const }, { headers });
  }

  return data({ ok: false as const, error: "Unknown action." }, { status: 400, headers });
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
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
    return redirect(`/sign-in?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
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
    preferenceMap,
    isLoggedIn: Boolean(userId),
  };
}

function roleFilterPillClass(active: boolean) {
  return `tap-scale rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
    active
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:active:bg-zinc-800/80"
  }`;
}

function formatRoleLabel(role: string) {
  if (role.length === 0) return role;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function JobsViewTabs({
  isLoggedIn,
  filters,
}: {
  isLoggedIn: boolean;
  filters: { role: string; showHidden: boolean; viewSaved: boolean };
}) {
  const base = { role: filters.role, showHidden: filters.showHidden };
  const allPath = `/jobs${buildJobsQuery({ ...base, viewSaved: false })}`;
  const savedPath = `/jobs${buildJobsQuery({ ...base, viewSaved: true })}`;
  const savedHref = isLoggedIn
    ? savedPath
    : `/sign-in?redirectTo=${encodeURIComponent(savedPath)}`;

  const tabClass = (active: boolean) =>
    `tap-scale rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
      active
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        : "text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200/80 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:active:bg-zinc-800/80"
    }`;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
      <div className="flex flex-wrap gap-2">
        <Link to={allPath} prefetch="intent" className={tabClass(!filters.viewSaved)}>
          All jobs
        </Link>
        <Link to={savedHref} prefetch="intent" className={tabClass(filters.viewSaved)}>
          Saved jobs
        </Link>
      </div>
      {isLoggedIn && (
        <div className="text-sm">
          {filters.showHidden ? (
            <Link
              prefetch="intent"
              to={`/jobs${buildJobsQuery({ role: filters.role, showHidden: false, viewSaved: filters.viewSaved })}`}
              className="tap-scale font-medium text-emerald-700 underline decoration-emerald-700/50 underline-offset-2 transition-colors hover:text-emerald-600 dark:text-emerald-400 dark:decoration-emerald-400/50 dark:hover:text-emerald-300"
            >
              Hide hidden jobs
            </Link>
          ) : (
            <Link
              prefetch="intent"
              to={`/jobs${buildJobsQuery({ role: filters.role, showHidden: true, viewSaved: filters.viewSaved })}`}
              className="tap-scale font-medium text-emerald-700 underline decoration-emerald-700/50 underline-offset-2 transition-colors hover:text-emerald-600 dark:text-emerald-400 dark:decoration-emerald-400/50 dark:hover:text-emerald-300"
            >
              Show hidden jobs
            </Link>
          )}
        </div>
      )}
    </div>
  );
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
          prefetch="intent"
          to={`/jobs${buildJobsQuery({ role: "all", showHidden: filters.showHidden, viewSaved: filters.viewSaved })}`}
          className={roleFilterPillClass(activeRole === "all")}
        >
          All roles
        </Link>
        {roleTypes.map((r) => (
          <Link
            key={r}
            prefetch="intent"
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

function JobPreferenceForm({
  jobId,
  intent,
  label,
  fetcher,
  applyOptimistic,
  disabled,
  pending,
}: {
  jobId: string;
  intent: string;
  label: React.ReactNode;
  fetcher: ReturnType<typeof useFetcher>;
  applyOptimistic: (a: PrefAction) => void;
  disabled: boolean;
  pending: boolean;
}) {
  return (
    <fetcher.Form
      method="post"
      action="/jobs"
      className="inline"
      onSubmit={() => {
        startTransition(() => applyOptimistic({ jobId, intent }));
      }}
    >
      <input type="hidden" name="jobRef" value={jobId} />
      <button
        type="submit"
        name="intent"
        value={intent}
        disabled={disabled || pending}
        className="tap-scale inline-flex min-h-[2rem] min-w-[4.5rem] items-center justify-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-100 active:bg-zinc-200/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:active:bg-zinc-800/80"
      >
        {pending ? <Spinner className="h-3.5 w-3.5" /> : label}
      </button>
    </fetcher.Form>
  );
}

export default function Jobs({ loaderData }: Route.ComponentProps) {
  const { jobs, fromDatabase, allJobsCount, roleTypes, filters, preferenceMap, isLoggedIn } = loaderData;
  const fetcher = useFetcher();
  const [actionError, setActionError] = useState<string | null>(null);
  const prevFetcherState = useRef(fetcher.state);

  const [optimisticPrefs, applyOptimistic] = useOptimistic(preferenceMap, applyPrefOptimistic);

  const displayJobs = useMemo(() => {
    return jobs.filter((j) => {
      const p = optimisticPrefs[j.id];
      if (!filters.showHidden && p === "hidden") return false;
      if (filters.viewSaved && p !== "saved") return false;
      return true;
    });
  }, [jobs, optimisticPrefs, filters.showHidden, filters.viewSaved]);

  useEffect(() => {
    if (prevFetcherState.current === "submitting" && fetcher.state === "idle") {
      const d = fetcher.data as { ok?: boolean; error?: string } | undefined;
      if (d && d.ok === false) {
        setActionError(d.error ?? "Something went wrong.");
      } else {
        setActionError(null);
      }
    }
    prevFetcherState.current = fetcher.state;
  }, [fetcher.state, fetcher.data]);

  const filteredCount = displayJobs.length;
  const isFiltered = filters.role !== "all";
  const fetcherBusy = fetcher.state !== "idle";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        Remote-first · curated
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Remote job board</h1>

      <JobsViewTabs isLoggedIn={isLoggedIn} filters={filters} />

      {actionError && (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <aside
        className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
        role="note"
      >
        <p className="font-semibold">How it works</p>
        <p className="mt-2">
          <Link to="/sign-in" prefetch="intent" className="font-medium underline">
            Sign in
          </Link>{" "}
          (free) to save jobs with the heart, hide roles you are not interested in, and use a shorter apply flow.
        </p>
        {fromDatabase ? (
          <p className="mt-2 text-amber-900/80 dark:text-amber-200/90">Listings are updated from our database.</p>
        ) : (
          <p className="mt-2 text-amber-900/80 dark:text-amber-200/90">Showing sample listings until live data is connected.</p>
        )}
      </aside>

      {roleTypes.length > 0 && (
        <JobFilterBar roleTypes={roleTypes} activeRole={filters.role} filters={filters} />
      )}

      {isFiltered && (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Showing <strong>{filteredCount}</strong> of <strong>{allJobsCount}</strong> jobs.
          <Link
            prefetch="intent"
            to={`/jobs${buildJobsQuery({
              role: "all",
              showHidden: filters.showHidden,
              viewSaved: filters.viewSaved,
            })}`}
            className="tap-scale ml-2 font-medium text-emerald-700 underline decoration-emerald-700/50 underline-offset-2 dark:text-emerald-400"
          >
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
                prefetch="intent"
                to={`/jobs${buildJobsQuery({ role: filters.role, showHidden: filters.showHidden, viewSaved: false })}`}
                className="font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                Browse all jobs
              </Link>
            </>
          ) : (
            <>
              No jobs for this role right now.{" "}
              <Link
                prefetch="intent"
                to={`/jobs${buildJobsQuery({
                  role: "all",
                  showHidden: filters.showHidden,
                  viewSaved: filters.viewSaved,
                })}`}
                className="font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                Show all roles
              </Link>
            </>
          )}
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {displayJobs.map((job) => {
            const p = optimisticPrefs[job.id];
            const ref = String(job.id);
            const submittingJob =
              fetcherBusy && fetcher.formData ? String(fetcher.formData.get("jobRef") ?? "") : "";
            const submittingIntent =
              fetcherBusy && fetcher.formData ? String(fetcher.formData.get("intent") ?? "") : "";
            const pendingThis = submittingJob === ref;
            const pendingSave = pendingThis && (submittingIntent === "save" || submittingIntent === "unsave");
            const pendingHide = pendingThis && (submittingIntent === "hide" || submittingIntent === "unhide");
            return (
              <li
                key={job.id}
                className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-opacity duration-200 dark:border-zinc-800 dark:bg-zinc-900/40 ${
                  pendingThis ? "opacity-80" : ""
                }`}
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
                      prefetch="intent"
                      className="tap-scale rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-zinc-800 active:bg-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:active:bg-zinc-200"
                    >
                      Apply
                    </Link>
                    {isLoggedIn && (
                      <div className="flex items-center gap-2">
                        <JobPreferenceForm
                          jobId={ref}
                          intent={p === "saved" ? "unsave" : "save"}
                          label={p === "saved" ? "Saved ♥" : "Save ♡"}
                          fetcher={fetcher}
                          applyOptimistic={applyOptimistic}
                          disabled={fetcherBusy && !pendingThis}
                          pending={pendingSave}
                        />
                        <JobPreferenceForm
                          jobId={ref}
                          intent={p === "hidden" ? "unhide" : "hide"}
                          label={p === "hidden" ? "Unhide" : "Hide"}
                          fetcher={fetcher}
                          applyOptimistic={applyOptimistic}
                          disabled={fetcherBusy && !pendingThis}
                          pending={pendingHide}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
