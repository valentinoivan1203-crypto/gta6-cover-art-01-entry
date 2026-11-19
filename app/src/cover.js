// Draws the cover: the photo panels, the colour grade, and the bold caption.
// Everything is drawn from the state object, at whatever size the canvas is,
// so the live preview and the exported PNG are the same drawing.

import { LAYOUTS } from './layouts.js';

export const GRADES = {
  sunset: {
    label: 'Sunset',
    tintTop: 'rgba(255, 178, 80, 0.10)',
    tintBottom: 'rgba(214, 38, 120, 0.30)',
    caption: '#ffffff',
    captionShadow: '#c2185b',
    outline: '#1a0b2e',
    empty: ['#3a1c5e', '#ff7e5f'],
  },
  neon: {
    label: 'Neon',
    tintTop: 'rgba(0, 224, 255, 0.12)',
    tintBottom: 'rgba(150, 40, 220, 0.32)',
    caption: '#ffffff',
    captionShadow: '#00e5ff',
    outline: '#0b0b26',
    empty: ['#0b2a4a', '#b537f2'],
  },
  noir: {
    label: 'Noir',
    tintTop: 'rgba(255, 255, 255, 0.04)',
    tintBottom: 'rgba(0, 0, 0, 0.34)',
    caption: '#ffe45e',
    captionShadow: '#111111',
    outline: '#000000',
    empty: ['#2b2b33', '#55555f'],
  },
};

/**
 * Draws one photo into one panel, cropped around its focal point.
 * `panel` is the photo's state: { photo, fx, fy, zoom } where fx/fy are the
 * focal point as fractions of the image (0..1) and zoom is 1..3.
 */
export function drawPanel(ctx, rect, photo, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (!photo) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, grade.empty[0]);
    g.addColorStop(1, grade.empty[1]);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    for (let d = -h; d < w; d += Math.max(24, w * 0.08)) {
      ctx.beginPath();
      ctx.moveTo(x + d, y + h);
      ctx.lineTo(x + d + h, y);
      ctx.stroke();
    }
  } else {
    const iw = photo.naturalWidth;
    const ih = photo.naturalHeight;
    const base = Math.max(w / iw, h / ih);
    const scale = base * (panel.zoom || 1);
    const srcW = Math.min(iw, w / scale);
    const srcH = Math.min(ih, h / scale);
    let srcX = (panel.fx ?? 0.5) * iw - srcW / 2;
    let srcY = (panel.fy ?? 0.5) * ih - srcH / 2;
    srcX = Math.max(0, Math.min(iw - srcW, srcX));
    srcY = Math.max(0, Math.min(ih - srcH, srcY));
    if (grade === GRADES.noir) ctx.filter = 'grayscale(0.85) contrast(1.15) brightness(0.96)';
    ctx.drawImage(photo, srcX, srcY, srcW, srcH, x, y, w, h);
    ctx.filter = 'none';
  }

  // Colour grade wash over the panel.
  const tint = ctx.createLinearGradient(x, y, x, y + h);
  tint.addColorStop(0, grade.tintTop);
  tint.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);

  // Thick comic-book frame and a thin inner highlight.
  ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.012);
  ctx.strokeStyle = '#14101c';
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.003);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
  ctx.restore();
}

/**
 * Draws the caption in big condensed capitals across a band, tilted a touch,
 * with a coloured drop shadow and a dark outline so it reads over any photo.
 */
export function drawCaption(ctx, band, text, sizeScale, grade) {
  const words = (text || '').trim().toUpperCase();
  if (!words) return;
  const { x, y, w, h } = band;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // A soft dark scrim behind the words so they read over bright photos.
  const scrim = ctx.createLinearGradient(0, y, 0, y + h);
  scrim.addColorStop(0, 'rgba(10, 5, 20, 0)');
  scrim.addColorStop(0.5, 'rgba(10, 5, 20, 0.38)');
  scrim.addColorStop(1, 'rgba(10, 5, 20, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(x, y, w, h);

  let size = h * 0.92 * (sizeScale || 1);
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (ctx.measureText(words).width > w * 0.92 && size > 10) {
    size -= 2;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // Coloured drop shadow, offset down-right.
  ctx.fillStyle = grade.captionShadow;
  ctx.fillText(words, size * 0.045, size * 0.055);
  // Dark outline, then the bright fill.
  ctx.lineWidth = Math.max(2, size * 0.13);
  ctx.strokeStyle = grade.outline;
  ctx.strokeText(words, 0, 0);
  ctx.fillStyle = grade.caption;
  ctx.fillText(words, 0, 0);
  ctx.restore();
}

/**
 * Draws the whole cover onto the canvas at the canvas's own size.
 * `state` carries size, layout, grade, caption, captionSize, captionBand,
 * photos (images or null, one per slot) and panels (one per panel of the
 * layout). With `preview` set, the selected panel gets a highlight outline.
 */
export function drawCover(canvas, state, preview) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout](w, h);

  ctx.fillStyle = '#14101c';
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: 0, fx: 0.5, fy: 0.5, zoom: 1 };
    const photo = state.photos[panel.photo] || null;
    drawPanel(ctx, rect, photo, panel, grade);
  });

  // A vignette to pull the eye to the middle.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  drawCaption(ctx, layout.bands[state.captionBand] || layout.bands.middle, state.caption, state.captionSize, grade);

  if (preview && typeof state.selected === 'number' && layout.panels[state.selected]) {
    const r = layout.panels[state.selected];
    ctx.save();
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
    ctx.strokeStyle = '#00e5ff';
    ctx.setLineDash([Math.max(8, w * 0.012), Math.max(6, w * 0.008)]);
    ctx.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    ctx.restore();
  }
}
