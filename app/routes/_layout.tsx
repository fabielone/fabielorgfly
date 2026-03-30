import { data, Link, Outlet, useRouteLoaderData } from "react-router";

import type { Route } from "./+types/_layout";
import { SiteHeader } from "~/components/SiteHeader";
import { hasActiveSubscriberAccess } from "~/lib/subscription-access.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  let user = null;
  if (supabase) {
    const { data: auth } = await supabase.auth.getUser();
    user = auth.user ?? null;
  }

  let showSubscribeNav = true;
  if (supabase && user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, grace_period_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();
    showSubscribeNav = !hasActiveSubscriberAccess(sub);
  }

  return data({ user, showSubscribeNav }, { headers });
}

export default function SiteLayout() {
  const { user, showSubscribeNav } = useRouteLoaderData("site") as {
    user: import("@supabase/supabase-js").User | null;
    showSubscribeNav: boolean;
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <SiteHeader user={user} showSubscribeNav={showSubscribeNav} />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-200 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p>Copyright {new Date().getFullYear()} fabiel.org. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-zinc-700 hover:underline dark:hover:text-zinc-200">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-zinc-700 hover:underline dark:hover:text-zinc-200">
              Terms and Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
