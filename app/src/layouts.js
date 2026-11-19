// Panel layouts for Neon Nights Cover Studio.
// A layout is a function of the cover's pixel width and height. It returns the
// panel rectangles (fractions of the cover, converted to pixels here) and the
// three caption bands the title can sit in: top, middle and bottom. Panels are
// drawn with thick dark gutters between them, the comic-book poster look.

const GUTTER = 0.014; // gutter width, as a fraction of the cover's short side

/** Turns fraction rectangles into pixel rectangles with gutters cut out. */
export function toPixels(w, h, fracs) {
  const g = Math.round(Math.min(w, h) * GUTTER);
  return fracs.map((f) => ({
    x: Math.round(f.x * w) + g,
    y: Math.round(f.y * h) + g,
    w: Math.round(f.w * w) - 2 * g,
    h: Math.round(f.h * h) - 2 * g,
  }));
}

/** One big hero panel over two small ones; the title rides the seam. */
export function layoutPoster(w, h) {
  return {
    name: 'poster',
    panels: toPixels(w, h, [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ]),
    bands: {
      top: { x: 0, y: 0.03 * h, w, h: 0.14 * h },
      middle: { x: 0, y: 0.52 * h, w, h: 0.16 * h },
      bottom: { x: 0, y: 0.82 * h, w, h: 0.14 * h },
    },
  };
}

/** Four equal panels in a grid; the title cuts across the middle. */
export function layoutGrid(w, h) {
  return {
    name: 'grid',
    panels: toPixels(w, h, [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ]),
    bands: {
      top: { x: 0, y: 0.03 * h, w, h: 0.14 * h },
      middle: { x: 0, y: 0.42 * h, w, h: 0.16 * h },
      bottom: { x: 0, y: 0.82 * h, w, h: 0.14 * h },
    },
  };
}

/** A tall hero on the left, two stacked panels on the right. */
export function layoutWide(w, h) {
  return {
    name: 'wide',
    panels: toPixels(w, h, [
      { x: 0, y: 0, w: 0.58, h: 1 },
      { x: 0.58, y: 0, w: 0.42, h: 0.5 },
      { x: 0.58, y: 0.5, w: 0.42, h: 0.5 },
    ]),
    bands: {
      top: { x: 0, y: 0.03 * h, w, h: 0.14 * h },
      middle: { x: 0, y: 0.42 * h, w, h: 0.16 * h },
      bottom: { x: 0, y: 0.8 * h, w, h: 0.16 * h },
    },
  };
}

export const LAYOUTS = { poster: layoutPoster, grid: layoutGrid, wide: layoutWide };
export const LAYOUT_NAMES = ['poster', 'grid', 'wide'];
