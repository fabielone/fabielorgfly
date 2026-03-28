import { randomUUID } from "node:crypto";

import { data, Form, Link, redirect } from "react-router";

import type { Route } from "./+types/account";
import { createSupabaseServiceClient, createSupabaseServerClient } from "~/lib/supabase.server";

type ProfileRow = {
  display_name: string | null;
  github_username: string | null;
  phone: string | null;
  english_level: string | null;
  target_roles: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  cv_storage_path: string | null;
  cv_original_name: string | null;
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "Account profile — Fabielorg" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  if (!supabase) return redirect("/sign-in", { headers });

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return redirect("/sign-in", { headers });

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, github_username, phone, english_level, target_roles, linkedin_url, portfolio_url, cv_storage_path, cv_original_name",
    )
    .eq("id", user.id)
    .maybeSingle();

  return data(
    {
      email: user.email ?? "",
      profile: (profile ?? {
        display_name: null,
        github_username: null,
        phone: null,
        english_level: null,
        target_roles: null,
        linkedin_url: null,
        portfolio_url: null,
        cv_storage_path: null,
        cv_original_name: null,
      }) as ProfileRow,
    },
    { headers },
  );
}

async function uploadCvForProfile(userId: string, file: File): Promise<{ path: string; originalName: string } | { error: string }> {
  if (file.size > 5 * 1024 * 1024) return { error: "CV must be 5 MB or smaller." };
  if (file.size === 0) return { error: "CV file is empty." };

  const lower = file.name.toLowerCase();
  const allowed =
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".pdf") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".docx");

  if (!allowed) return { error: "CV must be PDF, DOC, or DOCX." };

  const admin = createSupabaseServiceClient();
  if (!admin) return { error: "CV upload is not configured (missing service role key)." };

  const safeName = file.name.replace(/^.*[/\\]/, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `profiles/${userId}/${randomUUID()}-${safeName || "cv.pdf"}`;

  const { error } = await admin.storage.from("application_cvs").upload(path, await file.arrayBuffer(), {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) return { error: "Could not upload CV. Please try again." };
  return { path, originalName: file.name };
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  if (!supabase) return data({ ok: false, error: "Supabase is not configured." }, { status: 503, headers });

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return redirect("/sign-in", { headers });

  const formData = await request.formData();
  const cv = formData.get("cv");

  let cv_storage_path: string | null = null;
  let cv_original_name: string | null = null;

  if (cv instanceof File && cv.size > 0) {
    const uploaded = await uploadCvForProfile(user.id, cv);
    if ("error" in uploaded) {
      return data({ ok: false, error: uploaded.error }, { status: 400, headers });
    }
    cv_storage_path = uploaded.path;
    cv_original_name = uploaded.originalName;
  }

  const payload = {
    id: user.id,
    display_name: String(formData.get("displayName") ?? "").trim() || null,
    github_username: String(formData.get("githubUsername") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    english_level: String(formData.get("englishLevel") ?? "").trim() || null,
    target_roles: String(formData.get("targetRoles") ?? "").trim() || null,
    linkedin_url: String(formData.get("linkedinUrl") ?? "").trim() || null,
    portfolio_url: String(formData.get("portfolioUrl") ?? "").trim() || null,
    ...(cv_storage_path ? { cv_storage_path } : {}),
    ...(cv_original_name ? { cv_original_name } : {}),
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) {
    return data({ ok: false, error: "Could not update profile." }, { status: 500, headers });
  }

  return data({ ok: true, error: null }, { headers });
}

export default function Account({ loaderData, actionData }: Route.ComponentProps) {
  const { email, profile } = loaderData;
  const error = actionData && "error" in actionData ? actionData.error : null;
  const ok = actionData && "ok" in actionData ? actionData.ok : false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight">Account profile</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Keep this updated so we can match you to better opportunities and referrals.
      </p>

      <div
        id="profile"
        className="mt-6 scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <p className="text-xs uppercase tracking-wide text-zinc-500">Logged in as</p>
        <p className="mt-1 font-medium">{email}</p>
      </div>

      {ok && (
        <p className="mt-6 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Profile updated.
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      <Form
        id="settings"
        method="post"
        encType="multipart/form-data"
        className="mt-8 scroll-mt-24 space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Display name</span>
            <input
              name="displayName"
              defaultValue={profile.display_name ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Phone</span>
            <input
              name="phone"
              defaultValue={profile.phone ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">GitHub username</span>
            <input
              name="githubUsername"
              defaultValue={profile.github_username ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">English level</span>
            <select
              name="englishLevel"
              defaultValue={profile.english_level ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value="">Select one</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium">Target roles</span>
          <input
            name="targetRoles"
            defaultValue={profile.target_roles ?? ""}
            placeholder="Support, SDR, Front-end..."
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">LinkedIn URL</span>
            <input
              name="linkedinUrl"
              type="url"
              defaultValue={profile.linkedin_url ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Portfolio URL</span>
            <input
              name="portfolioUrl"
              type="url"
              defaultValue={profile.portfolio_url ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
          <p className="text-sm font-semibold">CV / resume</p>
          <p className="mt-1 text-xs text-zinc-500">Upload PDF or Word (.doc/.docx), up to 5 MB.</p>
          {profile.cv_original_name && (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Current file: {profile.cv_original_name}</p>
          )}
          <input
            name="cv"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="mt-3 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Save profile
          </button>
          <Link to="/jobs" className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400">
            Browse remote jobs
          </Link>
        </div>
      </Form>
    </div>
  );
}
