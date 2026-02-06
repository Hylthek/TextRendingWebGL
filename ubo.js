/**
 * @param {WebGL2RenderingContext} gl
 */
function InitGlyphBuffer(gl) {
  const glyph_buffer = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, glyph_buffer);

  const uniform_block_size = 100 * 16; // 100 uints.
  gl.bufferData(
    gl.UNIFORM_BUFFER,
    uniform_block_size,
    gl.DYNAMIC_DRAW
  )

  const bindingPoint = 0;
  gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, glyph_buffer)

  return glyph_buffer;
}

export { InitGlyphBuffer }