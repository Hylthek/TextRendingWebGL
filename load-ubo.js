function LoadUboFromString(gl, uniform_buffer_object, string_in, font, size) {
  const glyph_layouts = StringToGlyphLayouts(string_in, font, size);
  gl.bindBuffer(gl.UNIFORM_BUFFER, uniform_buffer_object);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, glyph_layouts.array); // Loads entire buffer for now.
}

/**
 * 
 * @param {String} string_in
 */
function StringToGlyphLayouts(string_in, font, size) {
  const chars = string_in.split('')
  // Each char needs 3 things, pos, index, size.
  const opentype_indices = chars.map(char => font.charToGlyphIndex(char))
  const sizes = new Array(chars.length).fill(size)
  const positions = CharsToPositions(chars, font, size)
  let glyph_layout_objects = new ArrayGlyphLayout(chars.length);
  for (let i = 0; i < chars.length; i++) {
    glyph_layout_objects.set(i, {
      pos: positions[i],
      opentype_index: opentype_indices[i],
      size: sizes[i]
    })
  }
  return glyph_layout_objects;
}

function CharsToPositions(chars, font, size) {
  return new Array(chars.length).fill(0).map((_, idx) => { return { x: idx, y: idx } })
}

// Defined for reference/jsdoc mostly.
class GlyphLayout {
  pos;
  opentype_index;
  size;
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
    dv.setInt32(idx * this.glyph_layout_bytes + 12, glyph_layout_obj.size, true);
  }

  get(idx) {
    const dv = new DataView(this.array);
    const glyph_layout_obj = new GlyphLayout();
    glyph_layout_obj.pos.x = dv.getFloat32(idx * this.glyph_layout_bytes + 0, true);
    glyph_layout_obj.pos.y = dv.getFloat32(idx * this.glyph_layout_bytes + 4, true);
    glyph_layout_obj.opentype_index = dv.getInt32(idx * this.glyph_layout_bytes + 8, true);
    glyph_layout_obj.size = dv.getInt32(idx * this.glyph_layout_bytes + 12, true);
    return glyph_layout_obj;
  }

  get length() {
    return this.array.byteLength / this.glyph_layout_bytes;
  }
}

export { LoadUboFromString, ArrayGlyphLayout }