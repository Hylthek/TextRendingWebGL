import opentype from './node_modules/opentype.js/dist/opentype.module.js'

/**
 * HarfBuzz helper module for proper text shaping with kerning
 * Uses global createHarfBuzz and hbjs functions from script tags
 */

let hbInstance = null;
let hbFontCache = new Map();

/**
 * Initialize HarfBuzz (call once at startup)
 * @returns {Promise} HarfBuzz instance
 */
export async function InitHarfBuzz() {
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

  console.log('✓ HarfBuzz initialized');
  return hbInstance;
}

/**
 * Create a HarfBuzz font from a font file
 * @param {string} fontUrl - Path to the font file
 * @returns {Promise<{hbFont, hbFace, openTypeFont}>}
 */
export async function LoadHBFont(fontUrl) {
  // Check cache
  if (hbFontCache.has(fontUrl)) {
    return hbFontCache.get(fontUrl);
  }

  // Ensure HarfBuzz is initialized
  const hb = await InitHarfBuzz();

  // Load font file
  const response = await fetch(fontUrl);
  const arrayBuffer = await response.arrayBuffer();

  // Create HarfBuzz font
  const blob = hb.createBlob(new Uint8Array(arrayBuffer));
  const hbFace = hb.createFace(blob, 0);
  const hbFont = hb.createFont(hbFace);

  // Also load with opentype.js for glyph paths
  const openTypeFont = await new Promise((resolve, reject) => {
    opentype.load(fontUrl, (err, font) => {
      if (err) reject(err);
      else resolve(font);
    });
  });

  const fontData = { hbFont, hbFace, openTypeFont, hb };
  hbFontCache.set(fontUrl, fontData);

  console.log(`✓ Loaded HarfBuzz font: ${fontUrl}`);
  return fontData;
}

/**
 * Shape text with HarfBuzz (applies kerning and all OpenType features)
 * @param {Object} hb - HarfBuzz instance
 * @param {Object} hbFont - HarfBuzz font object
 * @param {string} text - Text to shape
 * @param {Object} options - Shaping options
 * @returns {Array} Array of shaped glyphs with positions
 */
export function ShapeText(hb, hbFont, text, options = {}) {
  if (!hb) throw new Error('HarfBuzz not initialized. Call InitHarfBuzz() first.');

  // Create buffer
  const buffer = hb.createBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();

  // Set options
  if (options.script) buffer.setScript(options.script);
  if (options.language) buffer.setLanguage(options.language);
  if (options.direction) buffer.setDirection(options.direction);

  // Shape (this applies kerning automatically!)
  hb.shape(hbFont, buffer);

  // Get results as JSON
  const result = buffer.json(hbFont);

  // Clean up
  buffer.destroy();

  return result;
}

/**
 * Convert HarfBuzz shaped output to glyph layout data
 * @param {Array} shaped - Output from ShapeText()
 * @param {Object} openTypeFont - OpenType.js font for getting glyph data
 * @param {number} fontSize - Font size in pixels
 * @returns {Array} Array of {glyphId, x, y, advanceX, advanceY}
 */
export function ShapedToLayout(shaped, openTypeFont, fontSize) {
  const scale = fontSize / openTypeFont.unitsPerEm;

  let cursorX = 0;
  let cursorY = 0;

  const layout = shaped.map((item) => {
    const glyphId = item.g;
    const xOffset = (item.dx || 0) * scale;
    const yOffset = (item.dy || 0) * scale;
    const xAdvance = (item.ax || 0) * scale;
    const yAdvance = (item.ay || 0) * scale;

    const layoutData = {
      glyphId: glyphId,
      x: cursorX + xOffset,
      y: cursorY + yOffset,
      advanceX: xAdvance,
      advanceY: yAdvance,
      cluster: item.cl
    };

    cursorX += xAdvance;
    cursorY += yAdvance;

    return layoutData;
  });

  return layout;
}

/**
 * Get total text width with kerning
 * @param {Array} shaped - Output from ShapeText()
 * @param {Object} openTypeFont - OpenType.js font
 * @param {number} fontSize - Font size in pixels
 * @returns {number} Total width in pixels
 */
export function GetShapedWidth(shaped, openTypeFont, fontSize) {
  const scale = fontSize / openTypeFont.unitsPerEm;
  return shaped.reduce((sum, item) => sum + (item.ax || 0) * scale, 0);
}

export { hbInstance };