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

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLBuffer} uniform_buffer_object 
 * @param {String} string_in 
 * @param {OpenTypeFont} font 
 * @param {Number} px_size The size of the text in ems.
 */
function TextureFromString(gl, string_in, font, px_size) {
  const glyph_layouts = StringToGlyphLayoutArray(string_in, font, px_size);
  const texture = LoadTextureFromGlyphLayoutArray(gl, glyph_layouts);
  return {
    texture: texture,
    dimensions: {
      width: gTextureWidth,
      height: gTextureHeight
    }
  }
}

// Texture dimension consts.
const gTextureWidth = 1600; // Magic numbers for now.
const gTextureHeight = 100; // Magic numbers for now.

/**
 * 
 * @param {String} string_in
 */
function StringToGlyphLayoutArray(string_in, font, px_size) {
  const chars = string_in.split('')
  // Each char needs 3 things, pos, index, size.
  const opentype_indices = chars.map(char => font.charToGlyphIndex(char))
  const em_size = px_size * (1 / font.unitsPerEm);
  const em_sizes = new Array(chars.length).fill(em_size)
  const em_positions = StringToEmPositions(string_in, font, px_size)
  let glyph_layouts = new GlyphLayoutArray(chars.length);
  for (let i = 0; i < chars.length; i++) {
    glyph_layouts[i] = {
      x: em_positions[i].x,
      y: em_positions[i].y,
      id: opentype_indices[i],
      size: em_sizes[i]
    }
  }
  return glyph_layouts;
}

/**
 * 
 * @param {String} string_in 
 * @param {OpenTypeFont} font 
 * @param {Number} px_size 
 */
function StringToEmPositions(string_in, font, px_size) {
  // Get line height in ems.
  const line_height_em = GetLineHeight(font) / font.unitsPerEm;

  // Get an array of strings for each line, doesn't reduce total char count.
  const lines = string_in.split(/(?<=\n)/);

  // Output array.
  const string_positions = [];

  // Iterate over lines.
  for (let curr_line = 0; curr_line < lines.length; curr_line++) {

    // Get chars for this line.
    const line_chars = lines[curr_line].split('');

    // Init array of positions for this line. Set the y-vals via line height.
    const line_positions = Array.from({ length: line_chars.length }, () => (
      { x: 0, y: (-1 - curr_line) * line_height_em * px_size }
    ));
    for (let curr_char = 0; curr_char < line_positions.length; curr_char++) {
      // Get advance width.
      const em_advance_width = font.charToGlyph(line_chars[curr_char]).advanceWidth * px_size / font.unitsPerEm;

      // Alter next idx.
      if (curr_char != line_positions.length - 1)
        line_positions[curr_char + 1].x = line_positions[curr_char].x + em_advance_width;

      // Don't render newlines.
      if (line_chars[curr_char] === '\n') {
        line_positions[curr_char].x = Infinity;
        line_positions[curr_char].y = Infinity;
      }
    }

    // Append line_positions to positions.
    string_positions.push(...line_positions)
  }
  return string_positions
}

function GetLineHeight(font) {
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
  const lineHeight = ascender - descender + lineGap;
  return lineHeight
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {ArrayGlyphLayout} glyph_layouts 
 */
function LoadTextureFromGlyphLayoutArray(gl, glyph_layouts) {
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

  // Get a typed array compatible with "type".
  const glyph_layouts_f32 = new Float32Array(glyph_layouts.buffer);
  const num_pixels = glyph_layouts_f32.length / 4;

  // Define pixel width and height.
  const width = Math.min(num_pixels, gTextureWidth);
  const height = Math.floor((num_pixels - 1) / gTextureWidth) + 1;

  // Pad glyph_layouts_f32 with 0s until its length is width * height * 4.
  const target_length = width * height * 4;
  const zeros = new Float32Array(target_length)
  const glyph_layouts_f32_padded = zeros.map((zero, idx) => (glyph_layouts_f32[idx] || 0))

  // Initialize texture.
  const dummy_data = new Float32Array(gTextureWidth * gTextureHeight * 4);
  gl.texImage2D(gl.TEXTURE_2D, level, internal_format, gTextureWidth, gTextureHeight, border, format, type, dummy_data);
  // Fill subset of texture.
  gl.texSubImage2D(gl.TEXTURE_2D, level, 0, 0, width, height, format, type, glyph_layouts_f32_padded)

  return texture;
}

export { TextureFromString }