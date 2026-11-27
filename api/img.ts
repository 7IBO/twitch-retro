// Vercel serverless function: image relay for the share card (see server/img.ts).
import { relayImage } from '../server/img.js';
import { fromOtherSite } from '../server/guard.js';

export async function GET(request: Request): Promise<Response> {
  if (fromOtherSite(request)) return new Response('Forbidden', { status: 403 });
  return relayImage(new URL(request.url).searchParams.get('u'));
}
