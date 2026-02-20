import opentype from './node_modules/opentype.js/dist/opentype.module.js'
import { GlyphLayoutArray } from './load-char-texture.js';

/**
 * HarfBuzz helper module for proper text shaping with kerning
 * Uses global createHarfBuzz and hbjs functions from script tags
 */

let hbInstance = null;

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

  return hbInstance;
}

/**
 * Create a HarfBuzz font from a font file
 * @param {string} fontUrl - Path to the font file
 * @returns {Promise<{hbFont, hbFace, openTypeFont}>}
 */
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

  // Also load with opentype.js for glyph paths
  const openTypeFont = await new Promise((resolve, reject) => {
    opentype.load(fontUrl, (err, font) => {
      if (err) reject(err);
      else resolve(font);
    });
  });

  // Set scale to match opentype font's scale.
  hbFont.setScale(openTypeFont.unitsPerEm, openTypeFont.unitsPerEm);

  return { hbFont, hbFace, openTypeFont, hb };
}

/**
 * Shape text with HarfBuzz (applies kerning and all OpenType features)
 * @param {Object} hb - HarfBuzz instance
 * @param {Object} hbFont - HarfBuzz font object
 * @param {string} text - Text to shape
 * @param {Object} options - Shaping options
 * @returns {Array} Array of shaped glyphs with positions
 */
export function ShapeText(hb, hbFont, text) {
  if (!hb) throw new Error('HarfBuzz not initialized. Call InitHarfBuzz() first.');

  // Create buffer
  const buffer = hb.createBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();

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
 * @param {Object} em_per_units - OpenType.js font for getting glyph data
 * @param {number} px_per_em - Font size in pixels
 * @returns {Array} Array of {glyphId, x, y, advanceX, advanceY}
 */
export function ShapedToLayout(shaped, px_per_unit) {
  let cursorX = 0;
  let cursorY = 0;

  return shaped.map((item) => {
    const glyphId = item.g; // This is same as opentype's id.
    const xOffset = (item.dx || 0) * px_per_unit;
    const yOffset = (item.dy || 0) * px_per_unit;
    const xAdvance = (item.ax || 0) * px_per_unit;
    const yAdvance = (item.ay || 0) * px_per_unit;

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

    console.log("hb layout", layoutData)

    return layoutData;
  });
}

export function TextToGlyphLayoutArray(hb, hbFont, text, px_per_unit) {
  // Shape text.
  const shaped_text = ShapeText(hb, hbFont, text);
  // Get glyph layouts.
  const hb_layouts = ShapedToLayout(shaped_text, px_per_unit);
  // Turn into glyph layouts array.
  const glyph_layouts = new GlyphLayoutArray(hb_layouts.length);
  hb_layouts.forEach((item, i) => {
    glyph_layouts[i] = {
      x: item.x,
      y: item.y,
      id: item.glyphId,
      size: px_per_unit
    };
    console.log("glyph layouts", glyph_layouts[i])
  });
  return glyph_layouts;
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