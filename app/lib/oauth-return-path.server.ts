const COOKIE_NAME = "fabiel_oauth_next";
const MAX_AGE_SEC = 600;

const DUMMY_ORIGIN = "https://fabiel.local";

/**
 * Same-origin relative paths only (optional query and hash). Used after OAuth and for post-login redirects.
 * Default `/jobs` when missing or unsafe.
 */
export function safeOAuthReturnPath(raw: string | null | undefined): string {
  const fallback = "/jobs";
  if (!raw || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  try {
    const u = new URL(t, DUMMY_ORIGIN);
    if (u.origin !== DUMMY_ORIGIN) return fallback;
    if (u.pathname.includes("..")) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

export function appendOAuthReturnCookie(headers: Headers, path: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(path)}; Path=/; Max-Age=${MAX_AGE_SEC}; HttpOnly; SameSite=Lax${secure}`,
  );
}

export function readOAuthReturnPathAndClearCookie(request: Request): { nextPath: string; clearCookie: string } {
  const cookie = request.headers.get("Cookie") ?? "";
  const re = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`);
  const m = cookie.match(re);
  let next = "/jobs";
  if (m?.[1]) {
    try {
      next = safeOAuthReturnPath(decodeURIComponent(m[1]));
    } catch {
      next = "/jobs";
    }
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const clearCookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
  return { nextPath: next, clearCookie };
}
