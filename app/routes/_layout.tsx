import { data, Link, Outlet, useRouteLoaderData } from "react-router";

import type { Route } from "./+types/_layout";
import { NavigationProgress } from "~/components/NavigationProgress";
import { SiteHeader } from "~/components/SiteHeader";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  let user = null;
  if (supabase) {
    const { data: auth } = await supabase.auth.getUser();
    user = auth.user ?? null;
  }
  return data({ user }, { headers });
}

export default function SiteLayout() {
  const { user } = useRouteLoaderData("site") as { user: import("@supabase/supabase-js").User | null };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <NavigationProgress />
      <SiteHeader user={user} />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-200 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p>Copyright {new Date().getFullYear()} fabiel.org. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              prefetch="intent"
              className="tap-scale hover:text-zinc-700 hover:underline dark:hover:text-zinc-200"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              prefetch="intent"
              className="tap-scale hover:text-zinc-700 hover:underline dark:hover:text-zinc-200"
            >
              Terms and Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
