import { Form, Link, NavLink } from "react-router";
import type { User } from "@supabase/supabase-js";

import { UserAccountMenu } from "~/components/UserAccountMenu";

const primaryNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;

const authLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;

export function SiteHeader({ user }: { user: User | null }) {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Fabielorg
        </Link>
        {user ? (
          <UserAccountMenu user={user} />
        ) : (
          <div className="flex items-center gap-1">
            <NavLink to="/sign-in" className={authLinkClass}>
              Log in
            </NavLink>
            <NavLink to="/sign-in" className={authLinkClass}>
              Create account
            </NavLink>
          </div>
        )}
      </div>
      <div className="border-t border-zinc-200/80 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent dark:from-zinc-950" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent dark:from-zinc-950" />
            <nav className="hide-scrollbar overflow-x-auto">
              <div className="flex min-w-max items-center gap-2 pr-2">
                <NavLink to="/" className={primaryNavLinkClass} end>
                  Home
                </NavLink>
                <NavLink to="/jobs" className={primaryNavLinkClass}>
                  Remote jobs
                </NavLink>
                <NavLink to="/courses" className={primaryNavLinkClass}>
                  Courses
                </NavLink>
                <NavLink to="/subscribe" className={primaryNavLinkClass}>
                  Subscribe
                </NavLink>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
