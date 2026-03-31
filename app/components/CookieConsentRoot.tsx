import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentValue,
  isCookieConsentValue,
} from "~/lib/cookie-consent";

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;

/**
 * Cookie consent banner + optional analytics (Plausible) only after "Accept all".
 * Essential-only keeps the site working without non-essential scripts.
 */
export function CookieConsentRoot() {
  const [consent, setConsent] = useState<CookieConsentValue | null | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      setConsent(isCookieConsentValue(raw) ? raw : null);
    } catch {
      setConsent(null);
    }
  }, []);

  useEffect(() => {
    const onExternal = (e: Event) => {
      const ce = e as CustomEvent<CookieConsentValue>;
      if (isCookieConsentValue(ce.detail)) setConsent(ce.detail);
    };
    window.addEventListener("fabiel-cookie-consent", onExternal);
    return () => window.removeEventListener("fabiel-cookie-consent", onExternal);
  }, []);

  useEffect(() => {
    if (consent !== null) {
      document.body.style.paddingBottom = "";
      return;
    }
    document.body.style.paddingBottom = "max(7.5rem, env(safe-area-inset-bottom, 0px))";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [consent]);

  useEffect(() => {
    if (consent !== "all" || !PLAUSIBLE_DOMAIN) return;
    const marker = "data-fabiel-plausible";
    if (document.querySelector(`script[${marker}]`)) return;
    const s = document.createElement("script");
    s.defer = true;
    s.setAttribute(marker, "1");
    s.dataset.domain = PLAUSIBLE_DOMAIN;
    s.src = "https://plausible.io/js/script.js";
    document.body.appendChild(s);
  }, [consent]);

  const save = (value: CookieConsentValue) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
    } catch {
      /* ignore quota / private mode */
    }
    setConsent(value);
    window.dispatchEvent(new CustomEvent<CookieConsentValue>("fabiel-cookie-consent", { detail: value }));
  };

  if (consent !== null) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-zinc-200 bg-white/95 p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-950/95 dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 id="cookie-consent-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Cookies & privacy
          </h2>
          <p id="cookie-consent-desc" className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            We use essential cookies so the site and login work. With your permission we also load privacy-friendly
            analytics to understand traffic{PLAUSIBLE_DOMAIN ? "" : " (not configured on this build)"}. See our{" "}
            <Link to="/privacy" className="font-medium text-emerald-700 underline dark:text-emerald-400">
              Privacy
            </Link>{" "}
            page for details.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            className="tap-scale rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => save("essential")}
          >
            Essential only
          </button>
          <button
            type="button"
            className="tap-scale rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            onClick={() => save("all")}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
