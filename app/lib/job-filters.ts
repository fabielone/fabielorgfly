import type { DemoJob } from "~/lib/demo-jobs";

export function parseJobRoleFilter(searchParams: URLSearchParams, availableRoles: string[]): string {
  const r = searchParams.get("role");
  if (!r || r === "all") return "all";
  return availableRoles.includes(r) ? r : "all";
}

export type JobsListQuery = {
  role?: string;
  showHidden?: boolean;
  viewSaved?: boolean;
};

export function buildJobsQuery(filters: JobsListQuery): string {
  const sp = new URLSearchParams();
  if (filters.role && filters.role !== "all") sp.set("role", filters.role);
  if (filters.showHidden) sp.set("showHidden", "1");
  if (filters.viewSaved) sp.set("view", "saved");
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export function collectJobRoleTypes(jobs: { role_type: string | null }[]): string[] {
  const set = new Set<string>();
  for (const j of jobs) {
    if (j.role_type) set.add(j.role_type);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filterJobsByRole<T extends { role_type: string | null }>(jobs: T[], role: string): T[] {
  if (!role || role === "all") return jobs;
  return jobs.filter((j) => j.role_type === role);
}
