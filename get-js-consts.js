/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLTexture} font_data_texture 
 * @param {WebGLBuffer} glyph_buffer 
 * @returns 
 */
function GetJsConstValues(gl, glyph_buffer, tex_dims) {
  // Get UBO byte size.
  gl.bindBuffer(gl.UNIFORM_BUFFER, glyph_buffer);
  const glyph_buffer_size_byte = gl.getBufferParameter(gl.UNIFORM_BUFFER, gl.BUFFER_SIZE);

  // Get data texture dimensions.
  const font_data_width = tex_dims.width;
  const font_data_height = tex_dims.height;

  return {
    GLYPH_LAYOUT_ARRAY_SIZE_BYTES: glyph_buffer_size_byte.toString(),
    QUAD_TEXTURE_PX_WIDTH: font_data_width.toString(),
    QUAD_TEXTURE_PX_HEIGHT: font_data_height.toString(),
  };
}

export { GetJsConstValues }