import { redirect } from "react-router";

import type { Route } from "./+types/sign-out";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export function loader() {
  return redirect("/");
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  if (supabase) {
    await supabase.auth.signOut();
  }
  return redirect("/", { headers });
}
