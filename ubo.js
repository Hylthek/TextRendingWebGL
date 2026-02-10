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

export { InitGlyphBuffer }