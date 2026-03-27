import { redirect } from "react-router";

import type { Route } from "./+types/auth.callback";
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

  return redirect("/account", { headers });
}
