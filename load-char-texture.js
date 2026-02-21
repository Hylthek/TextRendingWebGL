import { ShapeText, ShapedToLayout } from "./harfbuzz-helper.js";

export class GlyphLayoutArray {
  constructor(length) {
    this.structSize = 16; // Size of each struct in bytes
    this.length = length; // Number of structs
    this.buffer = new ArrayBuffer(this.structSize * length); // Backing buffer
    this.data_view = new DataView(this.buffer);

    // Return a Proxy to overload the [] operator
    return new Proxy(this, {
      get: (target, prop) => {
        if (typeof prop === "string" && !isNaN(prop)) {
          // Handle numeric index access
          return target.get(parseInt(prop));
        }
        return target[prop]; // Default behavior for other properties
      },
      set: (target, prop, value) => {
        if (typeof prop === "string" && !isNaN(prop)) {
          // Handle numeric index assignment
          target.set(parseInt(prop), value);
          return true;
        }
        target[prop] = value; // Default behavior for other properties
        return true;
      },
    });
  }

  // Set a struct at a specific index
  set(index, { x, y, id, size }) {
    const offset = index * this.structSize;
    this.data_view.setFloat32(offset, x, true);
    this.data_view.setFloat32(offset + 4, y, true);
    this.data_view.setFloat32(offset + 8, id, true);
    this.data_view.setFloat32(offset + 12, size, true);
  }

  // Get a struct at a specific index
  get(index) {
    if (index < 0 || index >= this.length)
      console.error("Index out of bounds")
    const offset = index * this.structSize;
    return {
      x: this.data_view.getFloat32(offset, true),
      y: this.data_view.getFloat32(offset + 4, true),
      id: this.data_view.getFloat32(offset + 8, true),
      size: this.data_view.getFloat32(offset + 12, true),
    };
  }

  slice(start, end) {
    const result = new GlyphLayoutArray(end - start);
    for (let i = start; i < end; i++) {
      result[i - start] = this.get(i);
    }
    return result;
  }
}

class LineLayoutArray {
  constructor(length) {
    this.structSize = 32; // Size of each struct in bytes
    this.length = length; // Number of structs
    this.buffer = new ArrayBuffer(this.structSize * length); // Backing buffer
    this.data_view = new DataView(this.buffer);

    // Return a Proxy to overload the [] operator
    return new Proxy(this, {
      get: (target, prop) => {
        if (typeof prop === "string" && !isNaN(prop)) {
          // Handle numeric index access
          return target.get(parseInt(prop));
        }
        return target[prop]; // Default behavior for other properties
      },
      set: (target, prop, value) => {
        if (typeof prop === "string" && !isNaN(prop)) {
          // Handle numeric index assignment
          target.set(parseInt(prop), value);
          return true;
        }
        target[prop] = value; // Default behavior for other properties
        return true;
      },
    });
  }

  // Set a struct at a specific index
  set(index, { x1, x2, y1, y2, buffer_offset, num_chars }) {
    const offset = index * this.structSize;
    this.data_view.setFloat32(offset, x1, true);
    this.data_view.setFloat32(offset + 4, x2, true);
    this.data_view.setFloat32(offset + 8, y1, true);
    this.data_view.setFloat32(offset + 12, y2, true);
    this.data_view.setFloat32(offset + 16, buffer_offset, true);
    this.data_view.setFloat32(offset + 20, num_chars, true);
    this.data_view.setFloat32(offset + 24, 0, true);
    this.data_view.setFloat32(offset + 28, 0, true);
  }

  // Get a struct at a specific index
  get(index) {
    const offset = index * this.structSize;
    return {
      x1: this.data_view.getFloat32(offset, true),
      x2: this.data_view.getFloat32(offset + 4, true),
      y1: this.data_view.getFloat32(offset + 8, true),
      y2: this.data_view.getFloat32(offset + 12, true),
      buffer_offset: this.data_view.getFloat32(offset + 16, true),
      num_chars: this.data_view.getFloat32(offset + 20, true),
    };
  }

  slice(start, end) {
    const result = new LineLayoutArray(end - start);
    for (let i = start; i < end; i++) {
      result[i - start] = this.get(i);
    }
    return result;
  }
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLBuffer} uniform_buffer_object 
 * @param {String} string_in 
 * @param {Number} px_per_em The size of the text in ems.
 */
function TextureFromString(gl, string_in, fontData, px_per_em, programInfo) {
  const { openTypeFont } = fontData;
  const px_per_unit = px_per_em / openTypeFont.unitsPerEm;

  // Get line layouts.
  const { glyph_layouts, line_layouts } = StringToLayoutArrays(string_in, fontData, px_per_unit, 0, 0);

  // Update texture.
  const texture = LoadTextureFromLayoutArray(gl, glyph_layouts, line_layouts);

  // Update uniform.
  gl.uniform1i(programInfo.uniformLocations.uNumLines, line_layouts.length);

  return texture;
}

// Texture dimension consts.
export const gTextureWidth = 2048; // Must be even
export const gTextureHeight = 2048;

/**
 * 
 * @param {String} string_in
 */
function StringToLayoutArrays(string_in, fontData, px_per_unit, x_offset, y_offset) {
  // Get fonts.
  const { hb, hbFont, openTypeFont: opentype_font } = fontData;
  // Get max distance a glyph reaches away from its origin.
  const glyph_radius_px = GetGlyphBoundingRadiusUnits(opentype_font) * px_per_unit;

  // Get an array of strings for each line, doesn't reduce total char count.
  const lines = string_in.split(/(?<=\n)/);


  // Iterate over lines.
  const glyph_layout_js_array = []
  const line_layout_js_array = [];
  const line_height_px = GetLineHeightUnits(opentype_font) * px_per_unit;
  for (let i_line = 0; i_line < lines.length; i_line++) {
    const curr_line = lines[i_line];

    // The GlyphLayoutArray index of the line's first glyph.
    const buffer_offset = glyph_layout_js_array.length;

    // Shape text.
    const shaped_text = ShapeText(hb, hbFont, curr_line);
    // Push glyph layouts to the js array.
    const hb_layout = ShapedToLayout(shaped_text, px_per_unit, 0, -i_line * line_height_px)
    glyph_layout_js_array.push(...hb_layout);

    // Calc line layout data and push to js array.
    line_layout_js_array.push({
      x1: hb_layout[0].x - glyph_radius_px,
      x2: hb_layout[hb_layout.length - 1].x + glyph_radius_px,
      y1: hb_layout[0].y - glyph_radius_px,
      y2: hb_layout[0].y + glyph_radius_px,
      buffer_offset: buffer_offset,
      num_chars: hb_layout.length
    })
  }

  // Convert js array into GlyphLayoutArray.
  const glyph_layouts_out = new GlyphLayoutArray(glyph_layout_js_array.length);
  glyph_layout_js_array.forEach((item, i) => {
    // Don't render 'no glyph' glyph.
    if (item.glyphId === 0)
      glyph_layouts_out[i] = {
        x: Infinity,
        y: Infinity,
        id: item.glyphId,
        size: px_per_unit
      };
    else
      glyph_layouts_out[i] = {
        x: item.x,
        y: item.y,
        id: item.glyphId,
        size: px_per_unit
      };
  });
  // Convert js array into LineLayoutArray.
  const line_layouts_out = new LineLayoutArray(lines.length);
  line_layout_js_array.forEach((item, i) => {
    line_layouts_out[i] = item;
  });

  return {
    glyph_layouts: glyph_layouts_out,
    line_layouts: line_layouts_out
  };
}

function GetGlyphBoundingRadiusUnits(opentype_font) {
  const head = opentype_font.tables.head;
  const horz = Math.max(head.xMax, -head.xMin);
  const vert = Math.max(head.yMax, -head.yMin);
  const boundingRadius = Math.sqrt((horz) ** 2 + (vert) ** 2);
  return boundingRadius;
}

function GetLineHeightUnits(opentype_font) {
  // Check which metrics to use
  const useTypoMetrics = opentype_font.tables.os2.fsSelection & (1 << 7);
  // Get metrics.
  let ascender, descender, lineGap;
  if (useTypoMetrics) {
    ascender = opentype_font.tables.os2.sTypoAscender;
    descender = opentype_font.tables.os2.sTypoDescender;
    lineGap = opentype_font.tables.os2.sTypoLineGap;
  } else {
    ascender = opentype_font.tables.hhea.ascender;
    descender = opentype_font.tables.hhea.descender;
    lineGap = opentype_font.tables.hhea.lineGap;
  }
  // Calc and return line height.
  const line_height_units = ascender - descender + lineGap;
  return line_height_units
}

/**
 * @param {WebGL2RenderingContext} gl 
 * @param {GlyphLayoutArray} glyph_layouts 
 * @param {LineLayoutArray} line_layouts 
 */
function LoadTextureFromLayoutArray(gl, glyph_layouts, line_layouts) {
  // Init texture if not done yet.
  if (!window.gCurrTexture)
    window.gCurrTexture = InitTexture(gl);

  // Fill texture with glyph and line layouts.
  FillDataTexture(gl, window.gCurrTexture, glyph_layouts, false);
  FillDataTexture(gl, window.gCurrTexture, line_layouts, true);

  return window.gCurrTexture;
}

/**
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLTexture} texture 
 * @param {GlyphLayoutArray} layout_array 
 * @param {boolean} from_top 
 */
function FillDataTexture(gl, texture, layout_array, from_top) {
  const pixels_per_object = layout_array.structSize / 16;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const format = gl.RGBA;
  const type = gl.FLOAT;
  const level = 0; // mipmap thing, keep 0 for "NPOT" textures.

  const object_array_pixels = layout_array.length * pixels_per_object; // 2 pixels per line_layout.
  const num_rows = Math.floor(object_array_pixels / gTextureWidth) + 1;
  for (let curr_row = 0; curr_row < num_rows; curr_row++) {
    const y_offset = from_top ? gTextureHeight - 1 - curr_row : curr_row;

    const buffer_start = curr_row * gTextureWidth / pixels_per_object;
    if (curr_row == num_rows - 1) {
      const buffer_end = layout_array.length
      const curr_row_data_f32 = new Float32Array(layout_array.slice(buffer_start, buffer_end).buffer)
      gl.texSubImage2D(gl.TEXTURE_2D, level, 0, y_offset, object_array_pixels % gTextureWidth, 1, format, type, curr_row_data_f32)
    }
    else {
      const buffer_end = (curr_row + 1) * gTextureWidth / pixels_per_object;
      const curr_row_data_f32 = new Float32Array(layout_array.slice(buffer_start, buffer_end).buffer)
      gl.texSubImage2D(gl.TEXTURE_2D, level, 0, y_offset, gTextureWidth, 1, format, type, curr_row_data_f32)
    }
  }
}

export function InitTexture(gl) {
  // Init WebGL2 texture object.
  const texture = gl.createTexture()
  // Bind texture.
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set texture parameters.
  // MinFilter and MagFilter must be changed from
  // default since texture isn't a power of 2 size.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Configure texture to use 4 FLOAT32s per pixel.
  const internal_format = gl.RGBA32F;
  const format = gl.RGBA;
  const type = gl.FLOAT;
  const level = 0; // mipmap thing, keep 0 for "NPOT" textures.
  const border = 0; // Deprecated, keep 0.

  // Initialize texture.
  const zeroes = new Float32Array(gTextureWidth * gTextureHeight * 4);
  gl.texImage2D(gl.TEXTURE_2D, level, internal_format, gTextureWidth, gTextureHeight, border, format, type, zeroes);

  return texture;
}

export { TextureFromString }