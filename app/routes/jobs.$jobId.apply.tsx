import { data, Form, Link, redirect } from "react-router";

import type { Route } from "./+types/jobs.$jobId.apply";
import { uploadApplicationCv } from "~/lib/cv-upload.server";
import { CompensationLine, JobSkillsList, RemoteDetailLine } from "~/lib/job-display";
import { getDemoJob } from "~/lib/demo-jobs";
import { normalizeJobSkills } from "~/lib/job-skills";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export function meta({ data }: Route.MetaArgs) {
  const title = data && "jobTitle" in data && data.jobTitle ? data.jobTitle : null;
  if (!title) {
    return [{ title: "Apply — Fabielorg" }];
  }
  return [{ title: `Apply · ${title}` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const jobId = params.jobId;
  const demo = getDemoJob(jobId);

  if (!supabase) {
    if (!demo) throw new Response("Job not found", { status: 404 });
    return data(
      {
        jobTitle: demo.title,
        job: {
          id: demo.id,
          title: demo.title,
          company: demo.company,
          referral_url: demo.referral_url,
          compensation: demo.compensation ?? null,
          remote_detail: demo.remote_detail ?? null,
          skills: demo.skills,
        },
        skipForm: false,
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
      return data(
        {
          jobTitle: demo.title,
          job: {
            id: demo.id,
            title: demo.title,
            company: demo.company,
            referral_url: demo.referral_url,
            compensation: demo.compensation ?? null,
            remote_detail: demo.remote_detail ?? null,
            skills: demo.skills,
          },
          skipForm: false,
        },
        { headers },
      );
    }
    throw new Response("Job not found", { status: 404 });
  }

  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    return redirect(job.referral_url, { headers });
  }

  return data(
    {
      jobTitle: job.title,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        referral_url: job.referral_url,
        compensation: job.compensation ?? null,
        remote_detail: job.remote_detail ?? null,
        skills: normalizeJobSkills(job.skills),
      },
      skipForm: false,
    },
    { headers },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const jobId = params.jobId;
  const formData = await request.formData();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const cvField = formData.get("cv");

  if (!fullName || !email) {
    return data({ error: "Name and email are required." }, { status: 400, headers });
  }

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
    return redirect(demo.referral_url, { headers });
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

  const { data: job } = await supabase
    .from("jobs")
    .select("referral_url")
    .eq("id", jobId)
    .maybeSingle();

  const nextUrl = job?.referral_url ?? "/jobs";
  return redirect(nextUrl, { headers });
}

export default function JobApply({ loaderData, actionData }: Route.ComponentProps) {
  const { job } = loaderData;
  const err = actionData && "error" in actionData ? actionData.error : undefined;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p className="text-sm text-zinc-500">
        <Link to="/jobs" className="underline">
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
        Signed-in members skip this form and go directly to the referral link.{" "}
        <Link to="/sign-in" className="font-medium underline">
          Create a free account
        </Link>
      </aside>

      {err && (
        <p className="mt-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950/50 dark:text-red-200">
          {err}
        </p>
      )}

      <Form method="post" encType="multipart/form-data" className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="phone">
            Phone (optional)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
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
            PDF or Word (.doc, .docx), up to 5 MB. Optional but recommended for live listings; sample jobs cannot
            accept uploads.
          </p>
          <input
            id="cv"
            name="cv"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="mt-3 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Submit and continue to referral
        </button>
      </Form>
    </div>
  );
}
