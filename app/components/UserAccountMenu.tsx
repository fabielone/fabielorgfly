import { useEffect, useId, useRef, useState } from "react";
import { Form, Link } from "react-router";
import type { User } from "@supabase/supabase-js";

function initialsFromUser(user: User): string {
  const fromName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
  if (fromName) {
    const parts = fromName.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
  }
  return (user.email?.[0] ?? "U").toUpperCase();
}

const itemClass =
  "block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function UserAccountMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? (user.user_metadata.avatar_url as string) : null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`${menuId}-menu`}
        aria-label={user.email ? `Account menu, ${user.email}` : "Account menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-700 ring-offset-2 transition hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-600 dark:focus-visible:ring-zinc-500"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{initialsFromUser(user)}</span>
        )}
      </button>

      {open ? (
        <div
          id={`${menuId}-menu`}
          role="menu"
          aria-labelledby={menuId}
          className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <Link to="/account#profile" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            Profile
          </Link>
          <Link to="/jobs?view=saved" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            Saved jobs
          </Link>
          <Link to="/jobs?showHidden=1" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            Hidden jobs
          </Link>
          <Link to="/account#settings" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            Settings
          </Link>
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" role="separator" />
          <Form action="/sign-out" method="post">
            <button type="submit" role="menuitem" className={`${itemClass} font-medium text-zinc-900 dark:text-zinc-50`}>
              Sign out
            </button>
          </Form>
        </div>
      ) : null}
    </div>
  );
}
