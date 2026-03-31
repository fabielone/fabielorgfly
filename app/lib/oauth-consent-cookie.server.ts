import type { UpdatesContactPreference } from "~/lib/updates-contact-preference";

const COOKIE_NAME = "fabiel_oauth_consent";
const MAX_AGE_SEC = 600;

export type OAuthConsentPayload = {
  jobNotifications: boolean;
  marketingEmails: boolean;
  updatesContactPreference: UpdatesContactPreference;
};

function encodePref(p: UpdatesContactPreference): string {
  if (p === "email") return "e";
  if (p === "phone") return "p";
  return "b";
}

function decodePref(c: unknown): UpdatesContactPreference {
  if (c === "e") return "email";
  if (c === "p") return "phone";
  return "both";
}

function encode(payload: OAuthConsentPayload): string {
  return JSON.stringify({
    j: payload.jobNotifications ? 1 : 0,
    m: payload.marketingEmails ? 1 : 0,
    c: encodePref(payload.updatesContactPreference),
  });
}

export function appendOAuthConsentCookie(headers: Headers, payload: OAuthConsentPayload): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const value = encodeURIComponent(encode(payload));
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${value}; Path=/; Max-Age=${MAX_AGE_SEC}; HttpOnly; SameSite=Lax${secure}`,
  );
}

export function readOAuthConsentCookieAndClear(request: Request): {
  consent: OAuthConsentPayload | null;
  clearCookie: string;
} {
  const cookie = request.headers.get("Cookie") ?? "";
  const re = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`);
  const m = cookie.match(re);
  let consent: OAuthConsentPayload | null = null;
  if (m?.[1]) {
    try {
      const raw = JSON.parse(decodeURIComponent(m[1])) as { j?: number; m?: number; c?: string };
      if (typeof raw.j === "number" && typeof raw.m === "number") {
        consent = {
          jobNotifications: raw.j === 1,
          marketingEmails: raw.m === 1,
          updatesContactPreference: raw.c !== undefined ? decodePref(raw.c) : "both",
        };
      }
    } catch {
      consent = null;
    }
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const clearCookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
  return { consent, clearCookie };
}
