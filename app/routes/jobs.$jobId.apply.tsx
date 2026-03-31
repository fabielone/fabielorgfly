import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { data, Form, Link, redirect } from "react-router";

import type { Route } from "./+types/jobs.$jobId.apply";
import { NavigationFormBusyButton } from "~/components/NavigationFormBusy";
import { CV_MAX_BYTES, validateCvFileForUpload } from "~/lib/cv-constraints";
import { uploadApplicationCv } from "~/lib/cv-upload.server";
import { CompensationLine, JobSkillsList, RemoteDetailLine } from "~/lib/job-display";
import { getDemoJob } from "~/lib/demo-jobs";
import { normalizeJobSkills } from "~/lib/job-skills";
import { normalizeApplicationPhone, parseE164ToDialAndNational, PHONE_COUNTRY_OPTIONS } from "~/lib/phone-latam-us";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import {
  UPDATES_CONTACT_OPTIONS,
  type UpdatesContactPreference,
  parseUpdatesContactPreference,
  updatesContactPreferenceFromForm,
} from "~/lib/updates-contact-preference";

const CV_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type JobPayload = {
  id: string;
  title: string;
  company: string;
  referral_url: string | null;
  compensation: string | null;
  remote_detail: string | null;
  skills: string[];
};

type Prefill = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountry: string;
  phoneNational: string;
  updatesContactPreference: UpdatesContactPreference;
};

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function wantsProfileRowUpdate(formData: FormData): boolean {
  const v = formData.get("updateProfile");
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "on" || s === "true" || s === "1" || s === "yes";
}

async function patchProfileAfterApply(
  supabase: SupabaseClient,
  userId: string,
  formData: FormData,
  updatesPref: UpdatesContactPreference,
  detail: { firstName: string; lastName: string; fullName: string; phone: string | null },
): Promise<{ error: string | null }> {
  const row: Record<string, unknown> = {
    id: userId,
    updates_contact_preference: updatesPref,
  };
  if (wantsProfileRowUpdate(formData)) {
    row.first_name = detail.firstName;
    row.last_name = detail.lastName;
    row.display_name = detail.fullName;
    row.phone = detail.phone;
  }

  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export function meta({ data: routeData }: Route.MetaArgs) {
  if (!routeData || !("jobTitle" in routeData) || !routeData.jobTitle) {
    return [{ title: "Apply — Fabielorg" }];
  }
  return [{ title: `Apply · ${routeData.jobTitle}` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const jobId = params.jobId;
  const demo = getDemoJob(jobId);
  const { supabase, headers } = createSupabaseServerClient(request);

  if (!supabase) {
    if (!demo) throw new Response("Job not found", { status: 404 });
    const job: JobPayload = {
      id: demo.id,
      title: demo.title,
      company: demo.company,
      referral_url: demo.referral_url,
      compensation: demo.compensation ?? null,
      remote_detail: demo.remote_detail ?? null,
      skills: demo.skills,
    };
    return data(
      {
        jobTitle: demo.title,
        job,
        prefill: null,
        isLoggedIn: false,
      },
      { headers },
    );
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, title, company, referral_url, compensation, remote_detail, skills, is_published")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job || !job.is_published) {
    if (demo) {
      const j: JobPayload = {
        id: demo.id,
        title: demo.title,
        company: demo.company,
        referral_url: demo.referral_url,
        compensation: demo.compensation ?? null,
        remote_detail: demo.remote_detail ?? null,
        skills: demo.skills,
      };
      const { data: auth } = await supabase.auth.getUser();
      const prefill = await buildPrefill(supabase, auth.user);
      return data(
        {
          jobTitle: demo.title,
          job: j,
          prefill,
          isLoggedIn: Boolean(auth.user),
        },
        { headers },
      );
    }
    throw new Response("Job not found", { status: 404 });
  }

  const { data: auth } = await supabase.auth.getUser();
  const prefill = await buildPrefill(supabase, auth.user);

  const j: JobPayload = {
    id: job.id,
    title: job.title,
    company: job.company,
    referral_url: job.referral_url,
    compensation: job.compensation ?? null,
    remote_detail: job.remote_detail ?? null,
    skills: normalizeJobSkills(job.skills),
  };

  return data(
    {
      jobTitle: job.title,
      job: j,
      prefill,
      isLoggedIn: Boolean(auth.user),
    },
    { headers },
  );
}

async function buildPrefill(supabase: SupabaseClient, user: User | null): Promise<Prefill | null> {
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, updates_contact_preference")
    .eq("id", user.id)
    .maybeSingle();
  const fromPhone = parseE164ToDialAndNational(profile?.phone ?? null);
  return {
    firstName: String(profile?.first_name ?? "").trim(),
    lastName: String(profile?.last_name ?? "").trim(),
    email: user.email ?? "",
    phoneCountry: fromPhone.dial,
    phoneNational: fromPhone.national,
    updatesContactPreference: parseUpdatesContactPreference(profile?.updates_contact_preference),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const jobId = params.jobId;
  const formData = await request.formData();
  const updatesPref = updatesContactPreferenceFromForm(formData);

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const emailFromForm = String(formData.get("email") ?? "").trim();
  const phoneResult = normalizeApplicationPhone(formData.get("phoneCountry"), formData.get("phoneNational"));
  const message = String(formData.get("message") ?? "").trim();
  const cvField = formData.get("cv");

  if (!firstName || !lastName) {
    return data({ error: "First name and last name are required." }, { status: 400, headers });
  }

  if (!phoneResult.ok) {
    return data({ error: phoneResult.error }, { status: 400, headers });
  }

  const phone = phoneResult.phone;
  const fullName = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim();

  let email = emailFromForm;
  let userId: string | null = null;
  if (supabase) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user?.email) {
      email = auth.user.email.trim();
    }
    userId = auth.user?.id ?? null;
  }

  if (!email) {
    return data({ error: "Email is required." }, { status: 400, headers });
  }

  const confirmPath = `/jobs/${jobId}/apply/confirm?contact=${encodeURIComponent(updatesPref)}`;

  const demo = getDemoJob(jobId);
  if (demo) {
    if (cvField instanceof File && cvField.size > 0) {
      return data(
        {
          error:
            "Sample jobs do not store CVs. Remove the file to continue, or apply to a live listing from your Supabase `jobs` table.",
        },
        { status: 400, headers },
      );
    }
    if (supabase && userId) {
      const patched = await patchProfileAfterApply(supabase, userId, formData, updatesPref, {
        firstName,
        lastName,
        fullName,
        phone: phone || null,
      });
      if (patched.error) {
        return data(
          {
            error:
              `Could not update your saved profile: ${patched.error}. If the column updates_contact_preference is missing, run the latest Supabase migration (see supabase/migrations). You can still edit your profile under Account.`,
          },
          { status: 500, headers },
        );
      }
    }
    return redirect(confirmPath, { headers });
  }

  if (!supabase) {
    return data(
      { error: "Server is not configured (missing Supabase). Your answers were not saved." },
      { status: 503, headers },
    );
  }

  let cv_storage_path: string | null = null;
  let cv_original_name: string | null = null;
  if (cvField instanceof File && cvField.size > 0) {
    const uploaded = await uploadApplicationCv(jobId, cvField);
    if (!uploaded.ok) {
      return data({ error: uploaded.error }, { status: 400, headers });
    }
    cv_storage_path = uploaded.path;
    cv_original_name = uploaded.originalName;
  }

  if (userId) {
    const patched = await patchProfileAfterApply(supabase, userId, formData, updatesPref, {
      firstName,
      lastName,
      fullName,
      phone: phone || null,
    });
    if (patched.error) {
      return data(
        {
          error:
            `Could not update your saved profile: ${patched.error}. Run supabase/migrations (or manual_sync_profiles_for_app.sql) so profiles has updates_contact_preference, then try again.`,
        },
        { status: 500, headers },
      );
    }
  }

  const { error } = await supabase.from("job_applications").insert({
    job_id: jobId,
    full_name: fullName,
    email,
    phone: phone || null,
    message: message || null,
    cv_storage_path,
    cv_original_name,
  });

  if (error) {
    return data({ error: "Could not save application. Try again." }, { status: 500, headers });
  }

  return redirect(confirmPath, { headers });
}

export default function JobApply({ loaderData, actionData }: Route.ComponentProps) {
  const { job, prefill, isLoggedIn } = loaderData;
  const err = actionData && "error" in actionData ? actionData.error : undefined;
  const [cvFileError, setCvFileError] = useState<string | null>(null);
  const maxMb = CV_MAX_BYTES / (1024 * 1024);
  const hasReferral = Boolean(job.referral_url?.trim());

  const [firstName, setFirstName] = useState(prefill?.firstName ?? "");
  const [lastName, setLastName] = useState(prefill?.lastName ?? "");
  const [phoneCountry, setPhoneCountry] = useState(prefill?.phoneCountry ?? "");
  const [phoneNational, setPhoneNational] = useState(prefill?.phoneNational ?? "");
  const [contactPref, setContactPref] = useState<UpdatesContactPreference>(
    prefill?.updatesContactPreference ?? "both",
  );

  useEffect(() => {
    if (!prefill) return;
    setFirstName(prefill.firstName);
    setLastName(prefill.lastName);
    setPhoneCountry(prefill.phoneCountry);
    setPhoneNational(prefill.phoneNational);
    setContactPref(prefill.updatesContactPreference);
  }, [prefill]);

  const profileDiffers = useMemo(
    () =>
      Boolean(
        isLoggedIn &&
          prefill &&
          (firstName.trim() !== prefill.firstName.trim() ||
            lastName.trim() !== prefill.lastName.trim() ||
            phoneCountry !== prefill.phoneCountry ||
            digitsOnly(phoneNational) !== digitsOnly(prefill.phoneNational)),
      ),
    [isLoggedIn, prefill, firstName, lastName, phoneCountry, phoneNational],
  );

  const contactDiffers = useMemo(
    () => Boolean(isLoggedIn && prefill && contactPref !== prefill.updatesContactPreference),
    [isLoggedIn, prefill, contactPref],
  );

  const showUpdateProfileCheckbox = profileDiffers || contactDiffers;

  /** Multipart + native checkbox is flaky; hidden field mirrors intent reliably. */
  const [syncProfile, setSyncProfile] = useState(true);
  useEffect(() => {
    if (showUpdateProfileCheckbox) setSyncProfile(true);
  }, [showUpdateProfileCheckbox]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p className="text-sm text-zinc-500">
        <Link to="/jobs" prefetch="intent" className="underline">
          ← Remote jobs
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-bold">Apply · {job.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{job.company}</p>
        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          Remote
        </span>
      </div>
      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/90 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/50">
        <CompensationLine compensation={job.compensation} />
        <RemoteDetailLine remoteDetail={job.remote_detail} />
        <JobSkillsList skills={job.skills} />
      </div>

      <aside className="mt-6 rounded-lg border border-zinc-200 bg-zinc-100/80 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
        {isLoggedIn ? (
          <>
            Your profile details are prefilled below—confirm and submit to continue quickly.
            {!hasReferral ? (
              <span className="block pt-2 text-zinc-600 dark:text-zinc-400">
                After you submit you will see a confirmation page with next steps and how we will reach you about this
                application.
              </span>
            ) : (
              <span className="block pt-2 text-zinc-600 dark:text-zinc-400">
                After you submit you will land on a short confirmation page before any external link opens.
              </span>
            )}
          </>
        ) : (
          <>
            <Link to="/sign-in" prefetch="intent" className="font-medium underline">
              Sign in
            </Link>{" "}
            and complete your profile to prefill this form next time.
          </>
        )}
      </aside>

      {err && (
        <p className="mt-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950/50 dark:text-red-200">
          {err}
        </p>
      )}

      <Form
        method="post"
        encType="multipart/form-data"
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          if (cvFileError) e.preventDefault();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="firstName">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="lastName">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          {isLoggedIn && prefill?.email ? (
            <>
              <p className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
                {prefill.email}
              </p>
              <input type="hidden" name="email" value={prefill.email} />
            </>
          ) : (
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={prefill?.email ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          )}
        </div>
        <div>
          <p className="block text-sm font-medium">Phone (optional)</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Choose a country code, then enter your number without the country prefix (digits only).
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <select
              id="phoneCountry"
              name="phoneCountry"
              value={phoneCountry}
              onChange={(e) => setPhoneCountry(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 sm:max-w-[min(100%,14rem)] sm:shrink-0"
            >
              {PHONE_COUNTRY_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              id="phoneNational"
              name="phoneNational"
              type="text"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="e.g. 5512345678"
              pattern="[0-9]*"
              value={phoneNational}
              onChange={(e) => setPhoneNational(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Application updates</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            How should we reach you about status updates for this application?
          </p>
          <ul className="mt-3 space-y-2">
            {UPDATES_CONTACT_OPTIONS.map((opt) => (
              <li key={opt.value}>
                <label className="flex cursor-pointer gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                  <input
                    type="radio"
                    name="updatesContactPreference"
                    value={opt.value}
                    checked={contactPref === opt.value}
                    onChange={() => setContactPref(opt.value)}
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

        {isLoggedIn ? (
          <div
            className={
              showUpdateProfileCheckbox
                ? "rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
                : "rounded-lg border border-zinc-200 bg-zinc-50/90 p-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200"
            }
          >
            <input type="hidden" name="updateProfile" value={syncProfile ? "on" : "off"} />
            <label className="flex cursor-pointer gap-2">
              <input
                type="checkbox"
                checked={syncProfile}
                onChange={(e) => setSyncProfile(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300"
              />
              <span>
                <strong>Update my saved profile</strong> with the name, phone, and application-update preference above.
                {showUpdateProfileCheckbox ? (
                  <span className="block pt-1 text-xs opacity-90">
                    These details differ from your saved profile—leave checked to save them, or uncheck to use them only
                    for this application.
                  </span>
                ) : (
                  <span className="block pt-1 text-xs opacity-90">
                    Uncheck if you only want this application to use what you typed without changing your profile.
                  </span>
                )}
              </span>
            </label>
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium" htmlFor="message">
            Note (optional)
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">CV / resume</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Allowed: <strong>PDF</strong> or <strong>Word</strong> (<code className="text-[0.7rem]">.pdf</code>,{" "}
            <code className="text-[0.7rem]">.doc</code>, <code className="text-[0.7rem]">.docx</code>) only. Max size:{" "}
            <strong>{maxMb} MB</strong>. Optional for live listings; sample jobs cannot accept uploads.
          </p>
          <input
            id="cv"
            name="cv"
            type="file"
            accept={CV_ACCEPT}
            className="mt-3 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setCvFileError(f ? validateCvFileForUpload(f) : null);
            }}
          />
          {cvFileError && (
            <p className="mt-2 text-xs font-medium text-red-700 dark:text-red-300" role="alert">
              {cvFileError}
            </p>
          )}
        </div>

        <NavigationFormBusyButton
          disabled={Boolean(cvFileError)}
          className="tap-scale w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Submit application
        </NavigationFormBusyButton>
      </Form>
    </div>
  );
}
