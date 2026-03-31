import { Link, NavLink } from "react-router";
import type { User } from "@supabase/supabase-js";

import { UserAccountMenu } from "~/components/UserAccountMenu";

const authLinkClass = ({ isActive }: { isActive: boolean }) =>
  `tap-scale rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
    isActive
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;

export function SiteHeader({ user }: { user: User | null }) {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link
          to="/jobs"
          prefetch="intent"
          className="tap-scale text-lg font-semibold tracking-tight text-zinc-900 transition-opacity hover:opacity-80 dark:text-zinc-50"
          aria-label="Remote jobs"
        >
          fabiel.org
        </Link>
        {user ? (
          <UserAccountMenu user={user} />
        ) : (
          <div className="flex items-center gap-1">
            <NavLink to="/sign-in" prefetch="intent" className={authLinkClass}>
              Log in
            </NavLink>
            <NavLink to="/sign-in" prefetch="intent" className={authLinkClass}>
              Create account
            </NavLink>
          </div>
        )}
      </div>
    </header>
  );
}
