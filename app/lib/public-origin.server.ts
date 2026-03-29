/**
 * Canonical public origin for OAuth redirects, Mercado Pago `back_url`, etc.
 * Prefer env in production so links match your custom domain.
 */
export function getPublicOrigin(request: Request): string {
  const fromEnv = process.env.PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}
