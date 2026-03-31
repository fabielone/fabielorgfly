/** Client-only localStorage key for cookie / tracking choices. */
export const COOKIE_CONSENT_STORAGE_KEY = "fabiel_cookie_consent";

export type CookieConsentValue = "all" | "essential";

export function isCookieConsentValue(v: string | null): v is CookieConsentValue {
  return v === "all" || v === "essential";
}
