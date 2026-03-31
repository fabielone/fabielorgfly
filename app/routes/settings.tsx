import { data, Form, Link, redirect } from "react-router";

import type { Route } from "./+types/settings";
import { NavigationFormBusyButton } from "~/components/NavigationFormBusy";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import {
  UPDATES_CONTACT_OPTIONS,
  parseUpdatesContactPreference,
  updatesContactPreferenceFromForm,
} from "~/lib/updates-contact-preference";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Settings — Fabielorg" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  if (!supabase) return redirect("/sign-in", { headers });

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return redirect("/sign-in", { headers });

  const { data: profile } = await supabase
    .from("profiles")
    .select("consent_job_notifications, consent_marketing_emails, updates_contact_preference")
    .eq("id", user.id)
    .maybeSingle();

  return data(
    {
      email: user.email ?? "",
      consent_job_notifications: profile?.consent_job_notifications ?? true,
      consent_marketing_emails: profile?.consent_marketing_emails ?? true,
      updates_contact_preference: parseUpdatesContactPreference(profile?.updates_contact_preference),
    },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  if (!supabase) {
    return data({ ok: false, error: "Supabase is not configured." }, { status: 503, headers });
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return redirect("/sign-in", { headers });

  const formData = await request.formData();
  const consentJob = formData.get("consentJobNotifications") === "on";
  const consentMarketing = formData.get("consentMarketingEmails") === "on";
  const updatesContactPreference = updatesContactPreferenceFromForm(formData);

  const { error } = await supabase
    .from("profiles")
    .update({
      consent_job_notifications: consentJob,
      consent_marketing_emails: consentMarketing,
      updates_contact_preference: updatesContactPreference,
    })
    .eq("id", user.id);

  if (error) {
    if (import.meta.env.DEV) {
      console.error("[settings] profile update failed:", error.message, error);
    }
    const hint =
      import.meta.env.DEV
        ? error.message
        : "Could not update preferences. Run supabase/manual_sync_profiles_for_app.sql (or full migrations) on your database.";
    return data({ ok: false, error: hint }, { status: 500, headers });
  }

  return data({ ok: true, error: null }, { headers });
}

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const { email, consent_job_notifications, consent_marketing_emails, updates_contact_preference } = loaderData;
  const error = actionData && "error" in actionData ? actionData.error : null;
  const ok = actionData && "ok" in actionData ? actionData.ok : false;

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <p className="text-sm text-zinc-500">
        <Link to="/jobs" prefetch="intent" className="underline">
          ← Remote jobs
        </Link>
      </p>
      <h1 id="settings" className="mt-4 scroll-mt-24 text-3xl font-bold tracking-tight">
        Settings
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as <span className="font-medium text-zinc-800 dark:text-zinc-200">{email}</span>
      </p>

      {ok && (
        <p className="mt-6 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Preferences saved.
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      <Form method="post" className="mt-8 space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Email & notifications</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Choose what we may send you. Job-related updates are separate from marketing.
          </p>
          <ul className="mt-4 space-y-3">
            <li>
              <label className="flex cursor-pointer gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  name="consentJobNotifications"
                  defaultChecked={consent_job_notifications}
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
                  defaultChecked={consent_marketing_emails}
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
                      defaultChecked={updates_contact_preference === opt.value}
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

        <div className="flex flex-wrap items-center gap-3">
          <NavigationFormBusyButton className="tap-scale rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500">
            Save preferences
          </NavigationFormBusyButton>
          <Link
            to="/account#settings"
            prefetch="intent"
            className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400"
          >
            Full profile
          </Link>
        </div>
      </Form>
    </div>
  );
}
