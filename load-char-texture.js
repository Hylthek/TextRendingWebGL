import { gProgramInfo } from "./init-shader-program.js";

class GlyphLayoutArray {
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
    const offset = index * this.structSize;
    return {
      x: this.data_view.getFloat32(offset, true),
      y: this.data_view.getFloat32(offset + 4, true),
      id: this.data_view.getFloat32(offset + 8, true),
      size: this.data_view.getFloat32(offset + 12, true),
    };
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
 * @param {OpenTypeFont} font 
 * @param {Number} px_per_em The size of the text in ems.
 */
function TextureFromString(gl, string_in, font, px_per_em) {
  // Init texture if not done yet.
  if (!window.gCurrTexture)
    InitTexture(gl);

  // Update global string.
  window.gCurrDisplayedString = string_in;

  // Get GlyphLayoutArray.
  const { glyph_layouts, line_layouts } = StringToLayoutArrays(string_in, font, px_per_em, 0, 0);

  // Update texture.
  LoadTextureFromLayoutArray(gl, glyph_layouts, line_layouts);

  return {
    texture: window.gCurrTexture,
    dimensions: {
      width: gTextureWidth,
      height: gTextureHeight
    }
  }
}

// Texture dimension consts.
const gTextureWidth = 2048; // Must be even
const gTextureHeight = 2048;

/**
 * 
 * @param {String} string_in
 */
function StringToLayoutArrays(string_in, font, px_per_em, x_offset, y_offset) {
  const chars = string_in.split('')
  // Each char needs 3 things, pos, index, size.
  const opentype_indices = chars.map(char => font.charToGlyphIndex(char))
  const px_per_unit = px_per_em / font.unitsPerEm;
  const px_per_unit_array = new Array(chars.length).fill(px_per_unit)
  const { char_positions_px, line_layouts } = StringToPxPositionsAndLineLayouts(string_in, font, px_per_em, x_offset, y_offset)
  let glyph_layouts = new GlyphLayoutArray(chars.length);
  for (let i = 0; i < chars.length; i++) {
    glyph_layouts[i] = {
      x: char_positions_px[i].x,
      y: char_positions_px[i].y,
      id: opentype_indices[i],
      size: px_per_unit_array[i]
    }
  }
  return { glyph_layouts, line_layouts };
}

/**
 * 
 * @param {String} string_in 
 * @param {OpenTypeFont} font 
 * @param {Number} px_per_em 
 */
function StringToPxPositionsAndLineLayouts(string_in, font, px_per_em, x_offset_px, y_offset_px) {
  const em_per_units = 1 / font.unitsPerEm;

  // Get line height in px.
  const line_height_px = GetLineHeightUnits(font) * em_per_units * px_per_em;

  // Get an array of strings for each line, doesn't reduce total char count.
  const lines = string_in.split(/(?<=\n)/);

  // Output arrays.
  const char_positions_px = [];
  const line_layouts = new LineLayoutArray(lines.length);

  // Iterate over lines.
  for (let i_line = 0; i_line < lines.length; i_line++) {
    // Get chars for this line.
    const line_chars = lines[i_line].split('');

    // Vars for line layouts.
    let line_x1;
    let line_x2;
    let line_y1;
    let line_y2;
    const glyph_radius_px = GetGlyphBoundingRadiusUnits(font) * em_per_units * px_per_em;

    // Init array of positions for this line. Set the y-vals via line height.
    const curr_line_char_positions_px = Array.from({ length: line_chars.length }, () => (
      { x: x_offset_px, y: -i_line * line_height_px + y_offset_px }
    ));
    for (let i_char = 0; i_char < curr_line_char_positions_px.length; i_char++) {
      // Get advance width in px.
      const advance_width_px = font.charToGlyph(line_chars[i_char]).advanceWidth * em_per_units * px_per_em;

      // Alter next idx.
      if (i_char != curr_line_char_positions_px.length - 1)
        curr_line_char_positions_px[i_char + 1].x = curr_line_char_positions_px[i_char].x + advance_width_px;

      // Save certain positions for line layouts.
      if (i_char == 0) {
        line_x1 = curr_line_char_positions_px[i_char].x - glyph_radius_px;
        line_y1 = curr_line_char_positions_px[i_char].y - glyph_radius_px;
        line_y2 = curr_line_char_positions_px[i_char].y + glyph_radius_px;
      }
      if (i_char == curr_line_char_positions_px.length - 1)
        line_x2 = curr_line_char_positions_px[i_char].x + glyph_radius_px;

      // Don't render newlines.
      if (line_chars[i_char] === '\n') {
        curr_line_char_positions_px[i_char].x = Infinity;
        curr_line_char_positions_px[i_char].y = Infinity;
      }
    }

    // Create entry for LineLayoutArray.
    const line_buffer_offset = char_positions_px.length;
    const line_num_chars = line_chars.length
    line_layouts[i_line] = {
      x1: line_x1,
      x2: line_x2,
      y1: line_y1,
      y2: line_y2,
      buffer_offset: line_buffer_offset,
      num_chars: line_num_chars
    };

    // Append positions from current line to the universal set.
    char_positions_px.push(...curr_line_char_positions_px)
  }
  return { char_positions_px, line_layouts }
}

function GetGlyphBoundingRadiusUnits(font) {
  const head = font.tables.head;
  const horz = Math.max(head.xMax, -head.xMin);
  const vert = Math.max(head.yMax, -head.yMin);
  const boundingRadius = Math.sqrt((horz) ** 2 + (vert) ** 2);
  return boundingRadius;
}

function GetLineHeightUnits(font) {
  // Check which metrics to use
  const useTypoMetrics = font.tables.os2.fsSelection & (1 << 7);
  // Get metrics.
  let ascender, descender, lineGap;
  if (useTypoMetrics) {
    ascender = font.tables.os2.sTypoAscender;
    descender = font.tables.os2.sTypoDescender;
    lineGap = font.tables.os2.sTypoLineGap;
  } else {
    ascender = font.tables.hhea.ascender;
    descender = font.tables.hhea.descender;
    lineGap = font.tables.hhea.lineGap;
  }
  // Calc and return line height.
  const line_height_units = ascender - descender + lineGap;
  return line_height_units
}

let gPrevTextureWidth;
let gPrevTextureHeight;
/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {GlyphLayoutArray} glyph_layouts 
 * @param {LineLayoutArray} line_layouts 
 */
function LoadTextureFromLayoutArray(gl, glyph_layouts, line_layouts) {
  // Configure texture to use 4 FLOAT32s per pixel.
  const format = gl.RGBA;
  const type = gl.FLOAT;
  const level = 0; // mipmap thing, keep 0 for "NPOT" textures.

  // Get a typed array compatible with "type".
  const glyph_layouts_f32 = new Float32Array(glyph_layouts.buffer);
  const num_pixels = glyph_layouts_f32.length / 4;

  // Define pixel width and height.
  const width_thiscall = Math.min(num_pixels, gTextureWidth);
  const height_thiscall = Math.floor((num_pixels - 1) / gTextureWidth) + 1;
  // Define width and height that we will actually use.
  const width = Math.max(gPrevTextureWidth, width_thiscall);
  const height = Math.max(gPrevTextureHeight, height_thiscall);
  // Update prev dims
  gPrevTextureWidth = width_thiscall
  gPrevTextureHeight = height_thiscall

  // Pad glyph_layouts_f32 with 0s until its length is width * height * 4.
  const target_length = width * height * 4;
  const zeros = new Float32Array(target_length)
  const glyph_layouts_f32_padded = zeros.map((zero, idx) => (glyph_layouts_f32[idx] || 0))

  // Fill texture with glyph layouts.
  gl.bindTexture(gl.TEXTURE_2D, window.gCurrTexture);
  gl.texSubImage2D(gl.TEXTURE_2D, level, 0, 0, width, height, format, type, glyph_layouts_f32_padded)

  // Fill texture with line layouts.
  const line_layout_pixels = line_layouts.length * 2; // 2 pixels per line_layout.
  const line_layout_num_rows = Math.floor(line_layout_pixels / gTextureWidth) + 1;
  for (let curr_row = 0; curr_row < line_layout_num_rows; curr_row++) {
    const y_offset = gTextureHeight - 1 - curr_row;
    const buffer_start = curr_row * gTextureWidth / 2;
    if (curr_row == line_layout_num_rows - 1) {
      const buffer_end = line_layouts.length
      const curr_row_data_f32 = new Float32Array(line_layouts.slice(buffer_start, buffer_end).buffer)
      gl.texSubImage2D(gl.TEXTURE_2D, level, 0, y_offset, line_layout_pixels % gTextureWidth, 1, format, type, curr_row_data_f32)
    }
    else {
      const buffer_end = (curr_row + 1) * gTextureWidth / 2;
      const curr_row_data_f32 = new Float32Array(line_layouts.slice(buffer_start, buffer_end).buffer)
      gl.texSubImage2D(gl.TEXTURE_2D, level, 0, y_offset, gTextureWidth, 1, format, type, curr_row_data_f32)
    }
  }

  // Set number of line layouts as a uniform.
  if (gProgramInfo) {
    const num_lines_location = gProgramInfo.uniformLocations.uNumLines;
    gl.uniform1i(num_lines_location, line_layouts.length);
  }
}

function InitTexture(gl) {
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

  window.gCurrTexture = texture;
}

export { TextureFromString }