import { redirect } from "react-router";

import type { Route } from "./+types/auth.callback";
import { readOAuthConsentCookieAndClear } from "~/lib/oauth-consent-cookie.server";
import { readOAuthReturnPathAndClearCookie } from "~/lib/oauth-return-path.server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "~/lib/supabase.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const { supabase, headers } = createSupabaseServerClient(request);

  if (!code || !supabase) {
    return redirect("/sign-in", { headers });
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirect(`/sign-in?error=${encodeURIComponent(error.message)}`, { headers });
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  const { consent, clearCookie: clearConsent } = readOAuthConsentCookieAndClear(request);
  const admin = createSupabaseServiceClient();
  if (userId && consent && admin) {
    await admin
      .from("profiles")
      .update({
        consent_job_notifications: consent.jobNotifications,
        consent_marketing_emails: consent.marketingEmails,
        updates_contact_preference: consent.updatesContactPreference,
      })
      .eq("id", userId);
  }

  const { nextPath, clearCookie: clearReturn } = readOAuthReturnPathAndClearCookie(request);
  const out = new Headers(headers);
  out.append("Set-Cookie", clearReturn);
  out.append("Set-Cookie", clearConsent);
  return redirect(nextPath, { headers: out });
}
