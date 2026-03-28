/**
 * Fly.io always serves the default hostname (e.g. fabielorg.fly.dev). Send browsers and
 * crawlers to the canonical site with 301/308. Paths under /api/ are skipped so provider
 * webhooks can keep using fly.dev until you point them at the custom domain.
 */
export function redirectResponseIfFlyDevHost(request: Request): Response | null {
  const hostHeader = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";
  const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname.endsWith(".fly.dev")) {
    return null;
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    return null;
  }

  const raw = (process.env.CANONICAL_ORIGIN ?? "https://fabiel.org").trim().replace(/\/$/, "");
  let base: string;
  try {
    base = new URL(raw).origin;
  } catch {
    base = "https://fabiel.org";
  }

  const target = new URL(url.pathname + url.search, base);

  if (request.method === "GET" || request.method === "HEAD") {
    return Response.redirect(target.href, 301);
  }

  return Response.redirect(target.href, 308);
}
