// Vercel serverless function. Same handler as the dev server (vite.config.ts).
import { enrich } from '../server/enrich.js';
import { fromOtherSite } from '../server/guard.js';

export async function POST(request: Request): Promise<Response> {
  if (fromOtherSite(request)) return new Response('Forbidden', { status: 403 });
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 200_000) return new Response('Too large', { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  const data = await enrich(body as Parameters<typeof enrich>[0], process.env);
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
