/**
 * Image relay for the share card only. BTTV's CDN sends no CORS header, so the
 * browser cannot draw its emotes on a canvas and still export it. Only public
 * images from the hosts below are relayed; nothing is stored.
 */
const HOSTS = new Set(['static-cdn.jtvnw.net', 'cdn.7tv.app', 'cdn.betterttv.net', 'cdn.frankerfacez.com']);

export async function relayImage(raw: string | null): Promise<Response> {
  let url: URL;
  try {
    url = new URL(raw ?? '');
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  if (url.protocol !== 'https:' || !HOSTS.has(url.hostname)) return new Response('Forbidden', { status: 403 });
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  const type = r?.headers.get('content-type') ?? '';
  if (!r?.ok || !type.startsWith('image/')) return new Response('Not found', { status: 404 });
  const body = await r.arrayBuffer();
  if (body.byteLength > 5_000_000) return new Response('Too large', { status: 413 });
  return new Response(body, {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' },
  });
}
