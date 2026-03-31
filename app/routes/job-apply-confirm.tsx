import { data, Link } from "react-router";

import type { Route } from "./+types/job-apply-confirm";
import { getDemoJob } from "~/lib/demo-jobs";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import {
  type UpdatesContactPreference,
  parseUpdatesContactPreference,
} from "~/lib/updates-contact-preference";

export function meta({ data: routeData }: Route.MetaArgs) {
  if (!routeData?.jobTitle) {
    return [{ title: "Application sent — Fabielorg" }];
  }
  return [{ title: `Application sent · ${routeData.jobTitle}` }];
}

function StayTunedLine({ preference }: { preference: UpdatesContactPreference }) {
  if (preference === "email") {
    return (
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Stay tuned for updates via the <strong>email</strong> on your application—we will use that as your primary
        channel for this role.
      </p>
    );
  }
  if (preference === "phone") {
    return (
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Stay tuned for updates via the <strong>phone number</strong> you provided (text or call when it matters).
      </p>
    );
  }
  return (
    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
      Stay tuned on <strong>email</strong> and <strong>phone</strong> (if you shared one) for next steps about this
      application.
    </p>
  );
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const jobId = params.jobId;
  const url = new URL(request.url);
  const contactPreference = parseUpdatesContactPreference(url.searchParams.get("contact"));

  const demo = getDemoJob(jobId);
  const { supabase, headers } = createSupabaseServerClient(request);

  if (demo) {
    const referralUrl = demo.referral_url?.trim() || null;
    return data(
      {
        jobTitle: demo.title,
        company: demo.company,
        referralUrl,
        contactPreference,
      },
      { headers },
    );
  }

  if (!supabase) {
    throw new Response("Job not found", { status: 404 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("title, company, referral_url, is_published")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || !job.is_published) {
    throw new Response("Job not found", { status: 404 });
  }

  const referralUrl = typeof job.referral_url === "string" ? job.referral_url.trim() || null : null;

  return data(
    {
      jobTitle: job.title,
      company: job.company,
      referralUrl,
      contactPreference,
    },
    { headers },
  );
}

export default function JobApplyConfirm({ loaderData }: Route.ComponentProps) {
  const { jobTitle, company, referralUrl, contactPreference } = loaderData;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p className="text-sm text-zinc-500">
        <Link to="/jobs" prefetch="intent" className="underline">
          ← Remote jobs
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-bold">Application received</h1>
      <p className="mt-3 text-zinc-700 dark:text-zinc-300">
        Thanks for applying to <strong>{jobTitle}</strong>
        {company ? (
          <>
            {" "}
            at <strong>{company}</strong>
          </>
        ) : null}
        .
      </p>

      {referralUrl ? (
        <>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            This listing has an external application or details page. Continue there to finish any steps the employer
            requires.
          </p>
          <a
            href={referralUrl}
            rel="noopener noreferrer"
            className="tap-scale mt-6 inline-flex rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Continue to posting
          </a>
          <StayTunedLine preference={contactPreference} />
        </>
      ) : (
        <>
          <StayTunedLine preference={contactPreference} />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            You can change how we reach you for application updates anytime in{" "}
            <Link to="/account#settings" className="font-medium text-emerald-700 underline dark:text-emerald-400">
              your profile
            </Link>
            .
          </p>
        </>
      )}

      <Link
        to="/jobs"
        prefetch="intent"
        className="tap-scale mt-8 inline-flex rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Back to job board
      </Link>
    </div>
  );
}
