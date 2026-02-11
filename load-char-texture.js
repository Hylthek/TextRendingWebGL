class GlyphLayout {
  pos; // units are in TrueType ems
  opentype_index;
  size; // units are in TrueType ems
  constructor(x, y, idx, size) {
    this.pos = { x: x, y: y };
    this.opentype_index = idx;
    this.size = size;
  }
}

class ArrayGlyphLayout {
  glyph_layout_bytes = 16;
  constructor(size) {
    this.array = new ArrayBuffer(size * this.glyph_layout_bytes)
  }

  /**
   * 
   * @param {number} idx 
   * @param {GlyphLayout} glyph_layout_obj 
   */
  set(idx, glyph_layout_obj) {
    const dv = new DataView(this.array)
    dv.setFloat32(idx * this.glyph_layout_bytes + 0, glyph_layout_obj.pos.x, true);
    dv.setFloat32(idx * this.glyph_layout_bytes + 4, glyph_layout_obj.pos.y, true);
    dv.setFloat32(idx * this.glyph_layout_bytes + 8, glyph_layout_obj.opentype_index, true);
    dv.setFloat32(idx * this.glyph_layout_bytes + 12, glyph_layout_obj.size, true);
  }

  get(idx) {
    const dv = new DataView(this.array);
    const glyph_layout_obj = new GlyphLayout(
      dv.getFloat32(idx * this.glyph_layout_bytes + 0, true),
      dv.getFloat32(idx * this.glyph_layout_bytes + 4, true),
      dv.getFloat32(idx * this.glyph_layout_bytes + 8, true),
      dv.getFloat32(idx * this.glyph_layout_bytes + 12, true),
    );
    return glyph_layout_obj;
  }

  get length() {
    return this.array.byteLength / this.glyph_layout_bytes;
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
function LoadTextureFromString(gl, string_in, font, px_size) {
  const glyph_layouts = StringToGlyphLayouts(string_in, font, px_size);
  const texture = LoadTextureFromGlyphLayouts(gl, glyph_layouts);
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
const gTextureHeight = 1; // Magic numbers for now.

/**
 * 
 * @param {String} string_in
 */
function StringToGlyphLayouts(string_in, font, px_size) {
  const chars = string_in.split('')
  // Each char needs 3 things, pos, index, size.
  const opentype_indices = chars.map(char => font.charToGlyphIndex(char))
  const em_size = px_size * (1 / font.unitsPerEm);
  const em_sizes = new Array(chars.length).fill(em_size)
  const em_positions = StringToEmPositions(string_in, font, px_size)
  let glyph_layout_objects = new ArrayGlyphLayout(chars.length);
  for (let i = 0; i < chars.length; i++) {
    glyph_layout_objects.set(i, {
      pos: em_positions[i],
      opentype_index: opentype_indices[i],
      size: em_sizes[i]
    })
  }
  return glyph_layout_objects;
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
  // Get an array of strings for each line.
  const lines = string_in.split('\n')
  // Output array.
  const string_positions = [];
  // Iterate over lines.
  for (let i = 0; i < lines.length; i++) {
    // Get chars for this line.
    const line_chars = lines[i].split('');
    // Init array of positions for this line. Set the y-vals via line height.
    const line_positions = Array.from({ length: line_chars.length }, () => (
      { y: (-1 - i) * line_height_em * px_size }
    ));
    for (let j = 0; j < line_positions.length; j++) {
      // For first case.
      line_positions[j].x = line_positions[j].x || 0;
      // Get advance width.
      const em_advance_width = font.charToGlyph(line_chars[j]).advanceWidth * px_size / font.unitsPerEm;
      // Alter next idx.
      if (j != line_positions.length - 1)
        line_positions[j + 1].x = line_positions[j].x + em_advance_width;
    }
    // Push one more char position for the removed newline char.
    if (lines[i + 1])
      line_positions.push({ y: -100, x: -100 })
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
function LoadTextureFromGlyphLayouts(gl, glyph_layouts) {
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
  const glyph_layouts_f32 = new Float32Array(glyph_layouts.array);

  // Define pixel width and height.
  const width = glyph_layouts_f32.length / 4;
  const height = 1;

  // Initialize texture.
  const dummy_data = new Float32Array(gTextureWidth * gTextureHeight * 4);
  gl.texImage2D(gl.TEXTURE_2D, level, internal_format, gTextureWidth, gTextureHeight, border, format, type, dummy_data);
  // Fill subset of texture.
  gl.texSubImage2D(gl.TEXTURE_2D, level, 0, 0, width, height, format, type, glyph_layouts_f32)

  return texture;
}

export { LoadTextureFromString }