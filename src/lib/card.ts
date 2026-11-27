import { t } from './i18n/index.svelte';
/** Draws the shareable card on a canvas. Everything happens in the browser. */

export interface CardItem {
  name: string;
  value: string;
  img?: string;
  shape: 'circle' | 'cover' | 'none';
}

export interface CardData {
  title: string; // "Ma rétro Twitch"
  period: string; // "2016 – 2026" or "2023"
  hero?: { name: string; img?: string; shape: 'circle' | 'cover'; caption: string };
  big: string; // "34 080"
  unit: string; // "heures"
  subline: string;
  facts: { value: string; label: string }[];
  lists: { title: string; items: CardItem[] }[];
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
/** French number spaces (U+202F) are missing from some canvas fonts. */
const sp = (s: string) => s.replace(/[  ]/g, ' ');
const SANS = '"Inter Variable", Inter, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

/** Loads an image the canvas may export: directly, or through our relay when the CDN has no CORS. */
async function loadImg(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return (await loadDirect(src)) ?? (await loadDirect('/api/img?u=' + encodeURIComponent(src)));
}

function loadDirect(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fit(ctx: CanvasRenderingContext2D, raw: string, max: number) {
  const text = sp(raw);
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  shape: 'circle' | 'cover',
  x: number,
  y: number,
  w: number,
  h: number,
  fallback: string,
) {
  ctx.save();
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
  else ctx.roundRect(x, y, w, h, Math.max(4, w / 12));
  ctx.clip();
  if (img) ctx.drawImage(img, x, y, w, h);
  else {
    ctx.fillStyle = C.raised;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.text2;
    ctx.font = `500 ${Math.round(w * 0.42)}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fallback.slice(0, 1).toUpperCase(), x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

export async function drawCard(canvas: HTMLCanvasElement, d: CardData, format: 'post' | 'story') {
  const W = 1080, H = format === 'post' ? 1350 : 1920;
  const story = format === 'story';
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await Promise.all([document.fonts.load(`500 40px "Inter Variable"`), document.fonts.load(`400 24px "JetBrains Mono"`)]).catch(() => {});
  const [hero, emote, ...listImgs] = await Promise.all([
    loadImg(d.hero?.img),
    loadImg(d.emote?.url),
    ...d.lists.flatMap((l) => l.items.map((it) => loadImg(it.shape === 'none' ? undefined : it.img))),
  ]);

  const P = 72;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

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

  // Hero (a streamer or a category)
  if (d.hero) {
    y += story ? 96 : 56;
    const hw = d.hero.shape === 'circle' ? 120 : 108;
    const hh = d.hero.shape === 'circle' ? 120 : 144;
    drawImage(ctx, hero, d.hero.shape, P, y, hw, hh, d.hero.name);
    ctx.fillStyle = C.text;
    ctx.font = `500 56px ${SANS}`;
    ctx.fillText(fit(ctx, d.hero.name, W - 2 * P - hw - 32), P + hw + 32, y + hh / 2 + 4);
    ctx.fillStyle = C.text2;
    ctx.font = `400 26px ${SANS}`;
    ctx.fillText(fit(ctx, d.hero.caption, W - 2 * P - hw - 32), P + hw + 32, y + hh / 2 + 44);
    y += hh;
  }

  // Big figure
  y += d.hero ? (story ? 190 : 150) : story ? 230 : 150;
  ctx.fillStyle = C.accent;
  ctx.font = `500 ${d.hero ? 140 : 168}px ${SANS}`;
  ctx.fillText(sp(d.big), P - 6, y);
  const bw = ctx.measureText(sp(d.big)).width;
  ctx.fillStyle = C.text;
  ctx.font = `400 48px ${SANS}`;
  ctx.fillText(d.unit, P + bw + 18, y);
  y += 56;
  ctx.fillStyle = C.text2;
  ctx.font = `400 30px ${SANS}`;
  ctx.fillText(fit(ctx, d.subline, W - 2 * P), P, y);

  // Facts
  y += story ? 96 : 52;
  const n = d.facts.length;
  const fw = (W - 2 * P - 16 * (n - 1)) / n;
  d.facts.forEach((f, i) => {
    const x = P + i * (fw + 16);
    ctx.fillStyle = C.card;
    ctx.beginPath();
    ctx.roundRect(x, y, fw, 128, 16);
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
  y += 128 + (story ? 96 : 52);

  // Two lists side by side, on one shared row grid so both columns line up.
  const colW = (W - 2 * P - 48) / 2;
  const footTop = H - P - (d.emote ? 200 : 72);
  const boxOf = (shape: CardItem['shape']) =>
    shape === 'cover' ? { w: story ? 96 : 66, h: story ? 128 : 88 } : shape === 'circle' ? { w: 56, h: 56 } : { w: 0, h: 0 };
  const lists = d.lists.slice(0, 2);
  const rowH = Math.max(56, ...lists.flatMap((l) => l.items.map((it) => boxOf(it.shape).h))) + (story ? 24 : 16);
  ctx.fillStyle = C.text2;
  ctx.font = `400 24px ${SANS}`;
  lists.forEach((list, li) => ctx.fillText(list.title, P + li * (colW + 48), y));
  const top = y + 28;
  let img = 0;
  lists.forEach((list, li) => {
    const x0 = P + li * (colW + 48);
    list.items.forEach((it, r) => {
      const pic = listImgs[img++];
      const rowTop = top + r * rowH;
      if (rowTop + rowH - 8 > footTop) return;
      const box = boxOf(it.shape);
      const mid = rowTop + (rowH - (story ? 24 : 16)) / 2;
      if (box.w) drawImage(ctx, pic, it.shape as 'circle' | 'cover', x0, mid - box.h / 2, box.w, box.h, it.name);
      const tx = x0 + (box.w ? box.w + 20 : 0);
      ctx.fillStyle = C.text;
      ctx.font = `500 30px ${SANS}`;
      if (box.w) {
        ctx.fillText(fit(ctx, it.name, colW - (tx - x0) - 8), tx, mid - 4);
        ctx.fillStyle = C.muted;
        ctx.font = `400 22px ${MONO}`;
        ctx.fillText(sp(it.value), tx, mid + 28);
      } else {
        // Text-only rows: name left, value right, on the row's centre line.
        ctx.fillText(fit(ctx, it.name, colW - 160), tx, mid + 10);
        ctx.fillStyle = C.muted;
        ctx.font = `400 22px ${MONO}`;
        ctx.textAlign = 'right';
        ctx.fillText(sp(it.value), x0 + colW, mid + 10);
        ctx.textAlign = 'left';
      }
    });
  });

  // Emote and footer
  const footY = H - P;
  if (d.emote) {
    const ey = footY - 120;
    ctx.fillStyle = C.card;
    ctx.beginPath();
    ctx.roundRect(P, ey - 44, W - 2 * P, 96, 16);
    ctx.fill();
    if (emote) {
      const ratio = emote.naturalWidth / emote.naturalHeight || 1;
      ctx.drawImage(emote, P + 24, ey - 28, Math.min(160, 64 * ratio), 64);
    }
    ctx.fillStyle = C.text;
    ctx.font = `500 30px ${SANS}`;
    ctx.fillText(fit(ctx, t('Emote préférée : {name}', { name: d.emote.name }), W - 2 * P - 340), P + 120 + (emote && emote.naturalWidth > emote.naturalHeight * 1.5 ? 40 : 0), ey + 14);
    ctx.fillStyle = C.muted;
    ctx.font = `400 24px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText(sp(t('{n} fois', { n: d.emote.count })), W - P - 24, ey + 14);
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
  ctx.fillText(t("Rétro Twitch · d'après mon export de données Twitch"), P, footY);
}

export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('export'))), 'image/png'));
}
