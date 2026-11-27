/** Draws the shareable card on a canvas. Everything happens in the browser. */

export interface CardData {
  title: string; // "Ma rétro Twitch"
  period: string; // "2016 – 2026" or "2023"
  login: string;
  hours: string;
  facts: { value: string; label: string }[];
  streamers: { name: string; hours: string; avatar?: string }[];
  games: { name: string; hours: string; art?: string }[];
  emote?: { name: string; url: string; count: string };
}

const C = {
  bg: '#141415',
  card: '#19191b',
  raised: '#232325',
  line: 'rgba(237,237,237,0.08)',
  text: '#ededed',
  text2: '#a1a1a6',
  muted: '#85858b',
  accent: '#a970ff',
};
const SANS = '"Inter Variable", Inter, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

function loadImg(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

export async function drawCard(canvas: HTMLCanvasElement, d: CardData, format: 'post' | 'story') {
  const W = 1080, H = format === 'post' ? 1350 : 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await Promise.all([
    document.fonts.load(`500 40px "Inter Variable"`),
    document.fonts.load(`400 24px "JetBrains Mono"`),
  ]).catch(() => {});
  const [avatars, arts, emote] = await Promise.all([
    Promise.all(d.streamers.map((s) => loadImg(s.avatar))),
    Promise.all(d.games.map((g) => loadImg(g.art))),
    loadImg(d.emote?.url),
  ]);

  const P = 72;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // Header
  let y = P + 28;
  ctx.fillStyle = C.text;
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText(d.title, P, y);
  ctx.fillStyle = C.text2;
  ctx.font = `400 26px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(d.period, W - P, y);
  ctx.textAlign = 'left';

  // Big figure
  y += format === 'post' ? 150 : 230;
  ctx.fillStyle = C.accent;
  ctx.font = `500 168px ${SANS}`;
  ctx.fillText(d.hours, P - 6, y);
  const hw = ctx.measureText(d.hours).width;
  ctx.fillStyle = C.text;
  ctx.font = `400 48px ${SANS}`;
  ctx.fillText('heures', P + hw + 18, y);
  y += 56;
  ctx.fillStyle = C.text2;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(d.login ? `regardées par ${d.login}` : 'regardées sur Twitch', P, y);

  // Facts row
  y += format === 'post' ? 56 : 96;
  const fw = (W - 2 * P - 16 * (d.facts.length - 1)) / d.facts.length;
  d.facts.forEach((f, i) => {
    const x = P + i * (fw + 16);
    ctx.fillStyle = C.card;
    rrect(ctx, x, y, fw, 128, 16);
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.font = `500 44px ${SANS}`;
    ctx.fillText(fit(ctx, f.value, fw - 48), x + 24, y + 62);
    ctx.fillStyle = C.muted;
    ctx.font = `400 22px ${SANS}`;
    ctx.fillText(fit(ctx, f.label, fw - 48), x + 24, y + 100);
  });
  y += 128 + (format === 'post' ? 56 : 96);

  // Streamers and games side by side
  const colW = (W - 2 * P - 48) / 2;
  ctx.fillStyle = C.text2;
  ctx.font = `400 24px ${SANS}`;
  ctx.fillText('Streamers', P, y);
  ctx.fillText('Catégories', P + colW + 48, y);
  y += 32;
  const rowH = format === 'post' ? 84 : 112;
  d.streamers.forEach((s, i) => {
    const ry = y + i * rowH;
    const r = 28;
    ctx.save();
    ctx.beginPath();
    ctx.arc(P + r, ry + r, r, 0, Math.PI * 2);
    ctx.clip();
    if (avatars[i]) ctx.drawImage(avatars[i]!, P, ry, r * 2, r * 2);
    else {
      ctx.fillStyle = C.raised;
      ctx.fillRect(P, ry, r * 2, r * 2);
      ctx.fillStyle = C.text2;
      ctx.font = `500 26px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(s.name.slice(0, 1).toUpperCase(), P + r, ry + r + 9);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    ctx.fillStyle = i === 0 ? C.text : C.text;
    ctx.font = `500 30px ${SANS}`;
    ctx.fillText(fit(ctx, `${i + 1}. ${s.name}`, colW - 80), P + 76, ry + 26);
    ctx.fillStyle = C.muted;
    ctx.font = `400 22px ${MONO}`;
    ctx.fillText(`${s.hours} h`, P + 76, ry + 56);
  });

  // Games: covers in a column of up to 3
  const gx = P + colW + 48;
  const artW = format === 'post' ? 96 : 128, artH = Math.round(artW * 4 / 3);
  const gStep = format === 'post' ? Math.max(artH + 12, 0) : artH + 24;
  d.games.slice(0, 3).forEach((g, i) => {
    const gy = y + i * gStep;
    ctx.save();
    rrect(ctx, gx, gy, artW, artH, 8);
    ctx.clip();
    if (arts[i]) ctx.drawImage(arts[i]!, gx, gy, artW, artH);
    else {
      ctx.fillStyle = C.raised;
      ctx.fillRect(gx, gy, artW, artH);
    }
    ctx.restore();
    ctx.fillStyle = C.text;
    ctx.font = `500 28px ${SANS}`;
    ctx.fillText(fit(ctx, g.name, colW - artW - 24), gx + artW + 20, gy + 40);
    ctx.fillStyle = C.muted;
    ctx.font = `400 22px ${MONO}`;
    ctx.fillText(`${g.hours} h`, gx + artW + 20, gy + 72);
  });

  // Emote + footer
  const footY = H - P;
  if (d.emote) {
    const ey = footY - 120;
    ctx.fillStyle = C.card;
    rrect(ctx, P, ey - 44, W - 2 * P, 96, 16);
    ctx.fill();
    if (emote) {
      const ratio = emote.naturalWidth / emote.naturalHeight || 1;
      ctx.drawImage(emote, P + 24, ey - 28, 64 * ratio, 64);
    }
    ctx.fillStyle = C.text;
    ctx.font = `500 30px ${SANS}`;
    ctx.fillText(fit(ctx, `Emote préférée : ${d.emote.name}`, W - 2 * P - 340), P + 120, ey + 14);
    ctx.fillStyle = C.muted;
    ctx.font = `400 24px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${d.emote.count} fois`, W - P - 24, ey + 14);
    ctx.textAlign = 'left';
  }
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P, footY - 36);
  ctx.lineTo(W - P, footY - 36);
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText("Calculé depuis mon export de données Twitch, sans rien stocker", P, footY);
}

export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('export'))), 'image/png'));
}
