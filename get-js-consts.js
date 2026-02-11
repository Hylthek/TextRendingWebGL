/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLTexture} font_data_texture 
 * @param {WebGLBuffer} glyph_buffer 
 * @returns 
 */
function GetJsConstValues(gl, font_tex_dims, glyph_tex_dims, font) {
  // Get data texture dimensions.
  const font_data_width = font_tex_dims.width;
  const font_data_height = font_tex_dims.height;
  const glyph_data_width = glyph_tex_dims.width
  const glyph_data_height = glyph_tex_dims.height

  // Get glyph bounding radius.
  const head = font.tables.head;
  const x_radius = Math.max(head.xMax, -head.xMin);
  const y_radius = Math.max(head.yMax, -head.yMin);
  const glyph_bounding_radius = Math.sqrt(x_radius ** 2 + y_radius ** 2);

  return {
    QUAD_TEXTURE_PX_WIDTH: font_data_width.toString(),
    QUAD_TEXTURE_PX_HEIGHT: font_data_height.toString(),
    GLYPH_TEXTURE_PX_WIDTH: glyph_data_width.toString(),
    GLYPH_TEXTURE_PX_HEIGHT: glyph_data_height.toString(),
    GLYPH_BOUNDING_RADIUS: glyph_bounding_radius
  };
}

export { GetJsConstValues }