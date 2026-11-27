// Vercel serverless function: image relay for the share card (see server/img.ts).
import { relayImage } from '../server/img.js';

export function GET(request: Request): Promise<Response> {
  return relayImage(new URL(request.url).searchParams.get('u'));
}
