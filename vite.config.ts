import { defineConfig, type Plugin } from 'vite';

// Strict CSP on the built site: scripts from the site only, no network calls
// except Twitch's public box-art CDN for images.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: https://static-cdn.jtvnw.net",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
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

export default defineConfig({
  plugins: [csp()],
  worker: { format: 'es' },
});
