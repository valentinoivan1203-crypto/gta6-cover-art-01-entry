// Wires the page: load photos into three slots, pick a layout, size and colour
// grade, write the caption, drag a panel to reposition its photo, and export
// the cover as a PNG. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js).
import { drawCover } from './cover.js';
import { LAYOUTS } from './layouts.js';
import { runShot } from './shots.js';

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const SAMPLES = ['samples/boulevard.jpg', 'samples/pier.jpg', 'samples/nightdrive.jpg'];

export const state = {
  sizeKey: '1080x1080',
  layout: 'poster',
  grade: 'sunset',
  caption: 'NEON NIGHTS',
  captionSize: 1,
  captionBand: 'middle',
  photos: [null, null, null],
  panels: [
    { photo: 0, fx: 0.5, fy: 0.45, zoom: 1 },
    { photo: 1, fx: 0.5, fy: 0.5, zoom: 1 },
    { photo: 2, fx: 0.5, fy: 0.5, zoom: 1 },
    { photo: 0, fx: 0.5, fy: 0.5, zoom: 1.15 },
  ],
  selected: 0,
};

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const zoomInput = document.getElementById('zoom');
const panelPhoto = document.getElementById('panel-photo');

/** Sizes the preview canvas to the chosen export size, long side 560 px.
 * A cover screenshot keeps the canvas at export size instead. */
export function fitPreview() {
  if (document.body.classList.contains('shot-cover')) return;
  const [w, h] = SIZES[state.sizeKey];
  const s = 560 / Math.max(w, h);
  canvas.width = Math.round(w * s);
  canvas.height = Math.round(h * s);
}

export function redraw(preview = true) {
  fitPreview();
  drawCover(canvas, state, preview);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function setStatus(text) {
  status.textContent = text;
}

/** Loads a photo into a slot and redraws. */
export async function loadSlot(slot, url) {
  const img = await loadImage(url);
  state.photos[slot] = img;
  document.getElementById(`thumb-${slot}`).src = url;
  redraw();
}

// Photo slots: a file of your own, or one of the built-in samples.
for (let slot = 0; slot < 3; slot++) {
  document.getElementById(`photo-${slot}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await loadSlot(slot, URL.createObjectURL(file));
      setStatus(`Photo ${slot + 1} loaded from your machine.`);
    } catch {
      setStatus('That file could not be read as a photo.');
    }
  });
  document.getElementById(`sample-${slot}`).addEventListener('click', async () => {
    await loadSlot(slot, SAMPLES[slot]);
    setStatus(`Photo ${slot + 1} is the built-in sample.`);
  });
  document.getElementById(`fill-${slot}`).addEventListener('click', () => {
    state.panels.forEach((p) => { p.photo = slot; });
    redraw();
    setStatus(`Every panel now uses photo ${slot + 1}.`);
  });
}

// Layout, size and grade buttons.
function wireGroup(id, key, values) {
  const group = document.getElementById(id);
  group.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state[key] = btn.dataset.value;
      group.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
      if (key === 'layout') state.selected = 0;
      syncPanelControls();
      redraw();
    });
  });
}
wireGroup('layout-group', 'layout');
wireGroup('size-group', 'sizeKey');
wireGroup('grade-group', 'grade');

// Caption text, size and band.
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
document.getElementById('caption-size').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  redraw();
});
document.getElementById('caption-band').addEventListener('change', (e) => {
  state.captionBand = e.target.value;
  redraw();
});

// The selected panel's photo and zoom.
function syncPanelControls() {
  const panel = state.panels[state.selected];
  panelPhoto.value = String(panel.photo);
  zoomInput.value = String(panel.zoom);
  document.getElementById('panel-label').textContent = `Panel ${state.selected + 1} of ${LAYOUTS[state.layout](canvas.width, canvas.height).panels.length}`;
}
panelPhoto.addEventListener('change', () => {
  state.panels[state.selected].photo = Number(panelPhoto.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomInput.value);
  redraw();
});

// Click a panel to select it; drag it to move its photo inside the frame.
let drag = null;
function panelAt(px, py) {
  const rects = LAYOUTS[state.layout](canvas.width, canvas.height).panels;
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  state.selected = i;
  syncPanelControls();
  drag = { panel: i, x: p.x, y: p.y, fx: state.panels[i].fx, fy: state.panels[i].fy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[drag.panel];
  const rects = LAYOUTS[state.layout](canvas.width, canvas.height).panels;
  const r = rects[drag.panel];
  const img = state.photos[panel.photo];
  if (!img) return;
  const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * panel.zoom;
  panel.fx = Math.max(0, Math.min(1, drag.fx - (p.x - drag.x) / scale / img.naturalWidth));
  panel.fy = Math.max(0, Math.min(1, drag.fy - (p.y - drag.y) / scale / img.naturalHeight));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// Export: render the cover at full size and download it as a PNG.
document.getElementById('export').addEventListener('click', async () => {
  const [w, h] = SIZES[state.sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  try {
    await document.fonts.load(`${Math.round(h * 0.1)}px Anton`);
  } catch { /* the fallback font still draws */ }
  drawCover(off, state, false);
  off.toBlob((blob) => {
    if (!blob) { setStatus('The export failed; try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${state.sizeKey}.png`;
    a.click();
    setStatus(`Saved cover-${state.sizeKey}.png (${w} x ${h}).`);
  }, 'image/png');
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSlot,
    setState(patch) { Object.assign(state, patch); },
    redraw,
    canvas,
    captionInput,
    syncPanelControls,
  });
} else {
  (async () => {
    await document.fonts.ready;
    await Promise.all(SAMPLES.map((url, slot) => loadSlot(slot, url)));
    syncPanelControls();
    redraw();
  })();
}
