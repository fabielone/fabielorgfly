import { data, Form, Link, redirect } from "react-router";

import type { Route } from "./+types/sign-in";
import { MonthPromotionPricing } from "~/components/MonthPromotionPricing";
import { newSubscriberMonthlyMxn } from "~/lib/pricing";
import { appendOAuthReturnCookie, safeOAuthReturnPath } from "~/lib/oauth-return-path.server";
import { getActivePayingSubscriptionCount } from "~/lib/subscription-count.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Log in — Fabielorg" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const activePayingCount = await getActivePayingSubscriptionCount();
  const { supabase, headers } = createSupabaseServerClient(request);
  const returnTo = safeOAuthReturnPath(new URL(request.url).searchParams.get("redirectTo"));

  if (supabase) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      return redirect(returnTo, { headers });
    }
  }

  const error = new URL(request.url).searchParams.get("error");
  return data(
    {
      promoMonthlyMxn: newSubscriberMonthlyMxn(activePayingCount),
      oauthError: error,
      oauthReturnPath: returnTo,
    },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (!supabase) {
    return data(
      { error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.", ok: false },
      { status: 503, headers },
    );
  }

  const origin = new URL(request.url).origin;

  if (intent === "oauth-google" || intent === "oauth-github") {
    const provider = intent === "oauth-google" ? "google" : "github";
    const returnPath = safeOAuthReturnPath(String(formData.get("redirectTo") ?? ""));
    const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback` },
    });

    if (error || !oauthData?.url) {
      return data({ error: error?.message ?? "Could not start OAuth login.", ok: false }, { status: 400, headers });
    }

    const out = new Headers(headers);
    appendOAuthReturnCookie(out, returnPath);
    return redirect(oauthData.url, { headers: out });
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return data({ error: "Email and password are required.", ok: false }, { status: 400, headers });
  }

  if (intent === "login") {
    const returnPath = safeOAuthReturnPath(String(formData.get("redirectTo") ?? ""));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return data({ error: error.message, ok: false }, { status: 400, headers });
    }
    return redirect(returnPath, { headers });
  }

  if (intent === "signup") {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });

    if (error) {
      return data({ error: error.message, ok: false }, { status: 400, headers });
    }

    return data(
      {
        ok: true,
        error: null,
        message:
          "Account created. If email confirmation is enabled in Supabase, check your inbox first; otherwise you can log in now.",
      },
      { headers },
    );
  }

  return data({ error: "Invalid action.", ok: false }, { status: 400, headers });
}

export default function SignIn({ loaderData, actionData }: Route.ComponentProps) {
  const err =
    (actionData && "error" in actionData && actionData.error) ||
    (loaderData.oauthError ? decodeURIComponent(loaderData.oauthError) : null);
  const msg = actionData && "message" in actionData ? actionData.message : null;
  const { promoMonthlyMxn, oauthReturnPath } = loaderData;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Free account</h1>
      <div className="mt-4">
        <MonthPromotionPricing effectiveMonthlyMxn={promoMonthlyMxn} variant="inline" />
      </div>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Log in with Google, GitHub, or email/password. No magic links.
      </p>

      {msg && (
        <p className="mt-6 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {msg}
        </p>
      )}

      {err && (
        <p className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Form method="post">
          <input type="hidden" name="intent" value="oauth-google" />
          <input type="hidden" name="redirectTo" value={oauthReturnPath} />
          <button
            type="submit"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Continue with Google
          </button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="oauth-github" />
          <input type="hidden" name="redirectTo" value={oauthReturnPath} />
          <button
            type="submit"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Continue with GitHub
          </button>
        </Form>
      </div>

      <div className="my-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        <span className="text-xs uppercase tracking-wide text-zinc-500">or</span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
      </div>

      <Form method="post" className="space-y-4">
        <input type="hidden" name="redirectTo" value={oauthReturnPath} />
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            name="intent"
            value="login"
            className="rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Log in
          </button>
          <button
            type="submit"
            name="intent"
            value="signup"
            className="rounded-lg border border-zinc-300 bg-white py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Sign up
          </button>
        </div>
      </Form>

      <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Paid courses and repo access: {" "}
        <Link to="/subscribe" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Subscribe
        </Link>
      </p>
    </div>
  );
}
