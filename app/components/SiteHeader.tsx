import { Form, Link, NavLink } from "react-router";
import type { User } from "@supabase/supabase-js";

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

function initialsFromUser(user: User): string {
  const fromName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
  if (fromName) {
    const parts = fromName.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
  }
  return (user.email?.[0] ?? "U").toUpperCase();
}

export function SiteHeader({ user }: { user: User | null }) {
  const avatarUrl =
    user && typeof user.user_metadata?.avatar_url === "string"
      ? (user.user_metadata.avatar_url as string)
      : null;

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Fabielorg
        </Link>
        {user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/account"
              className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              aria-label="Open account"
              title={user.email ?? "Account"}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{initialsFromUser(user)}</span>
              )}
            </Link>
            <Form action="/sign-out" method="post" className="inline">
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </Form>
          </div>
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
