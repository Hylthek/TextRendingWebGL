/**
 * @param {WebGL2RenderingContext} gl
 * @param {Number} ubo_size The number of GlyphLayout objects in the uniform buffer object.
 */
function InitGlyphBuffer(gl, ubo_size) {
  const glyph_buffer = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, glyph_buffer);

  const uniform_block_size = ubo_size * 16; // {ubo_size} GlyphLayout objects.
  gl.bufferData(
    gl.UNIFORM_BUFFER,
    uniform_block_size,
    gl.DYNAMIC_DRAW
  )

  const bindingPoint = 0;
  gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, glyph_buffer)

  return glyph_buffer;
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLBuffer} uniform_buffer_object 
 * @param {String} string_in 
 * @param {OpenTypeFont} font 
 * @param {Number} px_size The size of the text in ems.
 */
function LoadUboFromString(gl, uniform_buffer_object, string_in, font, px_size) {
  const glyph_layouts = StringToGlyphLayouts(string_in, font, px_size);
  gl.bindBuffer(gl.UNIFORM_BUFFER, uniform_buffer_object);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, glyph_layouts.array); // Loads entire buffer for now.
}

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
      { y: (lines.length - i) * line_height_em * px_size }
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

class GlyphLayout {
  pos; // units are in TrueType ems
  opentype_index;
  size; // units are in TrueType ems
  constructor(x = 0, y = 0, idx = 0, size = 72) {
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
    dv.setInt32(idx * this.glyph_layout_bytes + 8, glyph_layout_obj.opentype_index, true);
    dv.setFloat32(idx * this.glyph_layout_bytes + 12, glyph_layout_obj.size, true);
  }

  get(idx) {
    const dv = new DataView(this.array);
    const glyph_layout_obj = new GlyphLayout();
    glyph_layout_obj.pos.x = dv.getFloat32(idx * this.glyph_layout_bytes + 0, true);
    glyph_layout_obj.pos.y = dv.getFloat32(idx * this.glyph_layout_bytes + 4, true);
    glyph_layout_obj.opentype_index = dv.getInt32(idx * this.glyph_layout_bytes + 8, true);
    glyph_layout_obj.size = dv.getFloat32(idx * this.glyph_layout_bytes + 12, true);
    return glyph_layout_obj;
  }

  get length() {
    return this.array.byteLength / this.glyph_layout_bytes;
  }
}

export { LoadUboFromString, ArrayGlyphLayout, InitGlyphBuffer }