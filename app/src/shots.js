// Fixed scenes for screenshots: ?shot=editor shows the editor with a photo
// loaded; ?shot=cover shows the cover alone, filling the viewport, at the
// export size the query names. window.__shotReady is set once painted, so a
// headless browser can wait for it before taking the screenshot.

const SAMPLES = ['samples/boulevard.jpg', 'samples/pier.jpg', 'samples/nightdrive.jpg'];

export async function runShot(shot, query, app) {
  const caption = query.get('caption') ?? 'NEON NIGHTS';
  const sizeKey = query.get('size') ?? '1080x1080';
  const layout = query.get('layout') ?? 'poster';
  const grade = query.get('grade') ?? 'sunset';
  const band = query.get('band') ?? 'middle';

  await document.fonts.ready;
  await Promise.all(SAMPLES.map((url, slot) => app.loadSlot(slot, url)));

  app.setState({ sizeKey, layout, grade, caption, captionBand: band });
  app.captionInput.value = caption;
  app.syncPanelControls();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const [w, h] = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] }[sizeKey];
    app.canvas.width = w;
    app.canvas.height = h;
    // A cover shot shows the exported art, never the editor's selection mark.
    app.redraw(false);
  } else {
    app.redraw();
  }
  // The cover shot draws at export size; the editor shot at preview size.
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
