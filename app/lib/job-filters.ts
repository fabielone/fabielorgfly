import type { DemoJob } from "~/lib/demo-jobs";

export function parseJobRoleFilter(searchParams: URLSearchParams, availableRoles: string[]): string {
  const r = searchParams.get("role");
  if (!r || r === "all") return "all";
  return availableRoles.includes(r) ? r : "all";
}

export function buildJobsSearch(role: string): string {
  if (!role || role === "all") return "";
  return `?role=${encodeURIComponent(role)}`;
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
