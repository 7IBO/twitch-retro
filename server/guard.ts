/**
 * The API is for this site's own pages. A browser on another site gets a 403,
 * so nobody embeds it and spends the site's Twitch quota from their page.
 * Scripts can still call it, like any public endpoint: the inputs are
 * bounded in enrich.ts and img.ts, and the answers are public data.
 */
export function fromOtherSite(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return true;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}
