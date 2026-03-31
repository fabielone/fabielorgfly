import { randomUUID } from "node:crypto";

import { data, Form, Link, redirect } from "react-router";

import type { Route } from "./+types/account";
import { NavigationFormBusyButton } from "~/components/NavigationFormBusy";
import { assertCvFileAllowed, cvEffectiveMimeType } from "~/lib/cv-constraints";
import { normalizeApplicationPhone, parseE164ToDialAndNational, PHONE_COUNTRY_OPTIONS } from "~/lib/phone-latam-us";
import { createSupabaseServiceClient, createSupabaseServerClient } from "~/lib/supabase.server";
import {
  UPDATES_CONTACT_OPTIONS,
  type UpdatesContactPreference,
  parseUpdatesContactPreference,
  updatesContactPreferenceFromForm,
} from "~/lib/updates-contact-preference";

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  github_username: string | null;
  phone: string | null;
  english_level: string | null;
  target_roles: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  cv_storage_path: string | null;
  cv_original_name: string | null;
  consent_job_notifications: boolean;
  consent_marketing_emails: boolean;
  updates_contact_preference: UpdatesContactPreference;
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
      "first_name, last_name, display_name, github_username, phone, english_level, target_roles, linkedin_url, portfolio_url, cv_storage_path, cv_original_name, consent_job_notifications, consent_marketing_emails, updates_contact_preference",
    )
    .eq("id", user.id)
    .maybeSingle();

  const fallback: ProfileRow = {
    first_name: null,
    last_name: null,
    display_name: null,
    github_username: null,
    phone: null,
    english_level: null,
    target_roles: null,
    linkedin_url: null,
    portfolio_url: null,
    cv_storage_path: null,
    cv_original_name: null,
    consent_job_notifications: true,
    consent_marketing_emails: true,
    updates_contact_preference: "both",
  };
  const merged = { ...fallback, ...(profile ?? {}) } as ProfileRow;
  merged.updates_contact_preference = parseUpdatesContactPreference(merged.updates_contact_preference);

  return data(
    {
      email: user.email ?? "",
      profile: merged,
    },
    { headers },
  );
}

async function uploadCvForProfile(userId: string, file: File): Promise<{ path: string; originalName: string } | { error: string }> {
  const validationError = assertCvFileAllowed(file);
  if (validationError) return { error: validationError };

  const admin = createSupabaseServiceClient();
  if (!admin) return { error: "CV upload is not configured (missing service role key)." };

  const safeName = file.name.replace(/^.*[/\\]/, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `profiles/${userId}/${randomUUID()}-${safeName || "cv.pdf"}`;
  const mime = cvEffectiveMimeType(file);

  const { error } = await admin.storage.from("application_cvs").upload(path, await file.arrayBuffer(), {
    contentType: mime,
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

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName || !lastName) {
    return data({ ok: false, error: "First name and last name are required." }, { status: 400, headers });
  }

  const phoneResult = normalizeApplicationPhone(formData.get("phoneCountry"), formData.get("phoneNational"));
  if (!phoneResult.ok) {
    return data({ ok: false, error: phoneResult.error }, { status: 400, headers });
  }

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

  const displayName = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim();

  const consentJob = formData.get("consentJobNotifications") === "on";
  const consentMarketing = formData.get("consentMarketingEmails") === "on";
  const updatesContactPreference = updatesContactPreferenceFromForm(formData);

  const payload = {
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    display_name: displayName,
    github_username: String(formData.get("githubUsername") ?? "").trim() || null,
    phone: phoneResult.phone,
    consent_job_notifications: consentJob,
    consent_marketing_emails: consentMarketing,
    updates_contact_preference: updatesContactPreference,
    english_level: String(formData.get("englishLevel") ?? "").trim() || null,
    target_roles: String(formData.get("targetRoles") ?? "").trim() || null,
    linkedin_url: String(formData.get("linkedinUrl") ?? "").trim() || null,
    portfolio_url: String(formData.get("portfolioUrl") ?? "").trim() || null,
    ...(cv_storage_path ? { cv_storage_path } : {}),
    ...(cv_original_name ? { cv_original_name } : {}),
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) {
    if (import.meta.env.DEV) {
      console.error("[account] profile upsert failed:", error.message, error);
    }
    const hint =
      import.meta.env.DEV
        ? error.message
        : "Could not update profile. Your Supabase database may be missing columns—run migrations or execute supabase/manual_sync_profiles_for_app.sql in the SQL editor.";
    return data({ ok: false, error: hint }, { status: 500, headers });
  }

  return data({ ok: true, error: null }, { headers });
}

export default function Account({ loaderData, actionData }: Route.ComponentProps) {
  const { email, profile } = loaderData;
  const error = actionData && "error" in actionData ? actionData.error : null;
  const ok = actionData && "ok" in actionData ? actionData.ok : false;
  const phoneParts = parseE164ToDialAndNational(profile.phone);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight">Account profile</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Your name and phone here prefill job applications so you can submit faster.
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

      <Form method="post" encType="multipart/form-data" className="mt-8 scroll-mt-24 space-y-5">
        <p id="settings" className="scroll-mt-24 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Profile & settings
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">First name</span>
            <input
              name="firstName"
              required
              autoComplete="given-name"
              defaultValue={profile.first_name ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Last name</span>
            <input
              name="lastName"
              required
              autoComplete="family-name"
              defaultValue={profile.last_name ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
          <p className="text-sm font-semibold">Email preferences</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Same options as{" "}
            <Link to="/settings" className="font-medium text-emerald-700 underline dark:text-emerald-400">
              Settings
            </Link>
            . Control what we may send you; job-related messages are separate from marketing.
          </p>
          <ul className="mt-3 space-y-2.5">
            <li>
              <label className="flex cursor-pointer gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  name="consentJobNotifications"
                  defaultChecked={profile.consent_job_notifications ?? true}
                  className="mt-0.5 rounded border-zinc-300"
                />
                <span>
                  Updates about <strong>my applications and job postings</strong>
                </span>
              </label>
            </li>
            <li>
              <label className="flex cursor-pointer gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  name="consentMarketingEmails"
                  defaultChecked={profile.consent_marketing_emails ?? true}
                  className="mt-0.5 rounded border-zinc-300"
                />
                <span>
                  <strong>Marketing</strong> emails (new roles, tips, news)
                </span>
              </label>
            </li>
          </ul>
          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-600">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Application updates</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              When you apply to jobs, how should we reach you about application status?
            </p>
            <ul className="mt-3 space-y-2">
              {UPDATES_CONTACT_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <label className="flex cursor-pointer gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                    <input
                      type="radio"
                      name="updatesContactPreference"
                      value={opt.value}
                      defaultChecked={profile.updates_contact_preference === opt.value}
                      className="mt-0.5 border-zinc-300"
                    />
                    <span>
                      <strong>{opt.label}</strong> — {opt.hint}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Phone (optional)</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Country code and national number (digits only after the code). Used for applications and updates.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <select
              name="phoneCountry"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 sm:max-w-[min(100%,14rem)] sm:shrink-0"
              defaultValue={phoneParts.dial}
            >
              {PHONE_COUNTRY_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              name="phoneNational"
              type="text"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="e.g. 5512345678"
              defaultValue={phoneParts.national}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
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
          <NavigationFormBusyButton className="tap-scale rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500">
            Save profile
          </NavigationFormBusyButton>
          <Link
            to="/jobs"
            prefetch="intent"
            className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400"
          >
            Browse remote jobs
          </Link>
        </div>
      </Form>
    </div>
  );
}
