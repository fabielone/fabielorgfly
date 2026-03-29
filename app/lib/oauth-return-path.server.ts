const COOKIE_NAME = "fabiel_oauth_next";
const MAX_AGE_SEC = 600;

/** Only same-origin paths; default `/account`. */
export function safeOAuthReturnPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/account";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/account";
  if (t.includes("?") || t.includes("#")) return "/account";
  return t;
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
  let next = "/account";
  if (m?.[1]) {
    try {
      next = safeOAuthReturnPath(decodeURIComponent(m[1]));
    } catch {
      next = "/account";
    }
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const clearCookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
  return { nextPath: next, clearCookie };
}
