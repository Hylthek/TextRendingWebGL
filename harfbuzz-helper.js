import opentype from './node_modules/opentype.js/dist/opentype.module.js'

let hbInstance = null;
async function InitHarfBuzz() {
  if (hbInstance) return hbInstance;

  // Wait for createHarfBuzz to be available (loaded via script tag)
  let attempts = 0;
  while (typeof createHarfBuzz === 'undefined' && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  if (typeof createHarfBuzz === 'undefined') {
    throw new Error('HarfBuzz not loaded! Make sure hb.js and hbjs.js are in HTML');
  }

  // Initialize HarfBuzz WASM module
  const hbModule = await createHarfBuzz();
  // Wrap with the hbjs helper
  hbInstance = hbjs(hbModule);

  return hbInstance;
}

export async function LoadHBFont(fontUrl) {
  // Ensure HarfBuzz is initialized
  const hb = await InitHarfBuzz();

  // Load font file
  const response = await fetch(fontUrl);
  const arrayBuffer = await response.arrayBuffer();

  // Create HarfBuzz font
  const blob = hb.createBlob(new Uint8Array(arrayBuffer));
  const hbFace = hb.createFace(blob, 0);
  const hbFont = hb.createFont(hbFace);

  // Also load with opentype.js
  const openTypeFont = opentype.parse(arrayBuffer)

  // Set scale to match opentype font's scale.
  hbFont.setScale(openTypeFont.unitsPerEm, openTypeFont.unitsPerEm);

  return { hbFont, hbFace, openTypeFont, hb };
}

export function ShapeText(hb, hbFont, text) {
  if (!hb) throw new Error('HarfBuzz not initialized. Call InitHarfBuzz() first.');

  // Create buffer
  const buffer = hb.createBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();

  // Shape (this applies kerning automatically!)
  const features = "+kern,+calt" // kerning and ligatures.
  hb.shape(hbFont, buffer, features);

  // Get results as JSON
  const result = buffer.json(hbFont);

  // Clean up
  buffer.destroy();

  return result;
}

export function ShapedToLayout(shaped, px_per_unit, x_offset_px = 0, y_offset_px = 0) {
  let x_cursor_px = x_offset_px;
  let y_cursor_px = y_offset_px;

  return shaped.map((item) => {
    const glyphId = item.g; // This is same as opentype's "id".
    const xOffset = (item.dx || 0) * px_per_unit;
    const yOffset = (item.dy || 0) * px_per_unit;

    const layoutData = {
      glyphId: glyphId,
      x: x_cursor_px + xOffset,
      y: y_cursor_px + yOffset,
    };

    const xAdvance = (item.ax || 0) * px_per_unit;
    const yAdvance = (item.ay || 0) * px_per_unit;
    x_cursor_px += xAdvance;
    y_cursor_px += yAdvance;

    return layoutData;
  });
}