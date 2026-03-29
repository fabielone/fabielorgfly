import { redirect } from "react-router";

import type { Route } from "./+types/auth.callback";
import { readOAuthReturnPathAndClearCookie } from "~/lib/oauth-return-path.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";

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

  const { nextPath, clearCookie } = readOAuthReturnPathAndClearCookie(request);
  const out = new Headers(headers);
  out.append("Set-Cookie", clearCookie);
  return redirect(nextPath, { headers: out });
}
