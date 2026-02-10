// The number of GlyphLayout objects in the uniform buffer object.
const ubo_size = 100;

/**
 * @param {WebGL2RenderingContext} gl
 */
function InitGlyphBuffer(gl) {
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
 * @param {Number} pt_size The size of the text in pt (not em).
 */
function LoadUboFromString(gl, uniform_buffer_object, string_in, font, pt_size) {
  const glyph_layouts = StringToGlyphLayouts(string_in, font, pt_size);
  gl.bindBuffer(gl.UNIFORM_BUFFER, uniform_buffer_object);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, glyph_layouts.array); // Loads entire buffer for now.
}

/**
 * 
 * @param {String} string_in
 */
function StringToGlyphLayouts(string_in, font, pt_size) {
  const chars = string_in.split('')
  // Each char needs 3 things, pos, index, size.
  const opentype_indices = chars.map(char => font.charToGlyphIndex(char))
  const em_sizes = new Array(chars.length).fill(pt_size / font.unitsPerEm)
  const positions = CharsToPositions(chars, font, pt_size)
  let glyph_layout_objects = new ArrayGlyphLayout(chars.length);
  for (let i = 0; i < chars.length; i++) {
    glyph_layout_objects.set(i, {
      pos: positions[i],
      opentype_index: opentype_indices[i],
      size: em_sizes[i]
    })
  }
  return glyph_layout_objects;
}

function CharsToPositions(chars, font, pt_size) {
  return new Array(chars.length).fill(0).map((_, idx) => { return { x: idx, y: idx } })
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