function LoadUboFromString(gl, uniform_buffer_object, string_in, font, size) {
  const glyph_layouts = StringToGlyphLayouts(string_in, font, size);
}

/**
 * 
 * @param {String} string_in 
 */
function StringToGlyphLayouts(string_in, font, size) {
  const chars = string_in.split('')
  const opentype_indices = chars.map(char => font.charToGlyphIndex(char))
}

class GlyphLayout {
  pos = { x: 0, y: 0 };
  opentype_index = 0;
  size = 72;
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
    glyph_layout_obj.pos.x = dv.getFLoat32(idx * this.glyph_layout_bytes + 0);
    glyph_layout_obj.pos.y = dv.getFLoat32(idx * this.glyph_layout_bytes + 4);
    glyph_layout_obj.opentype_index = dv.getInt32(idx * this.glyph_layout_bytes + 8);
    glyph_layout_obj.size = dv.getInt32(idx * this.glyph_layout_bytes + 12);
    return glyph_layout_obj;
  }

  get length() {
    return this.array.byteLength / this.glyph_layout_bytes;
  }
}

export { LoadUboFromString, ArrayGlyphLayout }