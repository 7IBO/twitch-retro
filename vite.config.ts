import { defineConfig, loadEnv, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { enrich } from './server/enrich';
import { relayImage } from './server/img';

// Strict CSP on the built site: code from the site only. The only network
// calls are images from public CDNs (box art, avatars, emotes) and our own
// /api/enrich endpoint.
const IMG_HOSTS = [
  'https://static-cdn.jtvnw.net',
  'https://cdn.7tv.app',
  'https://cdn.betterttv.net',
  'https://cdn.frankerfacez.com',
];
const CSP = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${IMG_HOSTS.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

const csp = (): Plugin => ({
  name: 'csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

/** Serves /api/enrich in dev and preview, like the Vercel function does in production. */
const api = (env: Record<string, string>): Plugin => {
  const handler = async (req: any, res: any, next: () => void) => {
    if (req.url?.startsWith('/api/img?') && req.method === 'GET') {
      const r = await relayImage(new URL(req.url, 'http://x').searchParams.get('u'));
      res.statusCode = r.status;
      r.headers.forEach((v: string, k: string) => res.setHeader(k, v));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    if (req.url !== '/api/enrich' || req.method !== 'POST') return next();
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const data = await enrich(JSON.parse(body), env);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    } catch {
      res.statusCode = 400;
      res.end('Bad request');
    }
  };
  return {
    name: 'api',
    configureServer: (s) => void s.middlewares.use(handler),
    configurePreviewServer: (s) => void s.middlewares.use(handler),
  };
};

export default defineConfig(({ mode }) => ({
  plugins: [svelte(), csp(), api(loadEnv(mode, process.cwd(), 'TWITCH_'))],
  worker: { format: 'es' },
}));
