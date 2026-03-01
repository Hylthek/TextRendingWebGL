import { mat4 } from "./node_modules/gl-matrix/esm/index.js"
import { VertexAttributeHandler } from "./vertex-attribute-handler.js";

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {*} programInfo 
 * @param {VertexAttributeHandler} attrib_handler
 * @param {*} image_texture
 * @param {*} font_data_texture 
 */
export function DrawScene(gl, programInfo, attrib_handler, view, image_texture, font_data_texture, glyph_data_texture) {
  // Clear the canvas before we start drawing on it.
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // Clear depth buffer.
  gl.clearDepth(1.0);

  // Enable depth testing, default depth function is "gl.LESS".
  gl.enable(gl.DEPTH_TEST);

  // Create a perspective matrix, a special matrix that is used to simulate the distortion of perspective in a camera.
  const projectionMatrix = mat4.create();
  {
    const fieldOfView = (150 * Math.PI) / 180 / view.camera_pos.zoom; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 20.0;
    // mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
    const foo = 1 / view.camera_pos.zoom
    const bar = foo / aspect
    mat4.ortho(projectionMatrix, -foo, foo, -bar, bar, zNear, zFar) // Projection matrix that takes the specified box to the unit cube.
  }

  // Create the modelViewMatrix which is only named that because we only have one 3D solid.
  const modelViewMatrix = mat4.create(); // Set the drawing position to the "identity" point, which is the center of the scene.
  {
    // Now move the drawing position a bit to where we want to start drawing the square.
    mat4.translate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to translate
      [view.pan.x, view.pan.y, -5],
    ); // amount to translate
    mat4.rotate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to rotate
      view.sphere_coords.phi_deg * Math.PI / 180, // amount to rotate in radians
      [1, 0, 0],
    );
    mat4.rotate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to rotate
      view.sphere_coords.theta_deg * Math.PI / 180, // amount to rotate in radians
      [0, 1, 0],
    );
  }

  // GL one-time Setup.
  // Program
  gl.useProgram(programInfo.program);
  // Tex0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, image_texture);
  // Tex1
  gl.uniform1i(programInfo.uniformLocations.uQuadTexture, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, font_data_texture);
  // Tex2
  gl.uniform1i(programInfo.uniformLocations.uGlyphLayoutTexture, 2);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, glyph_data_texture);

  // WebGL canvas px dims for shader debug features.
  gl.uniform1i(programInfo.uniformLocations.uScreenWidthPx, gl.canvas.width);
  gl.uniform1i(programInfo.uniformLocations.uScreenHeightPx, gl.canvas.height);

  // Set the view uniforms.
  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

  // Set view options.
  gl.uniform1i(gl.getUniformLocation(programInfo.program, "uRenderTextureFetchAmount"), 0);
  gl.uniform1i(gl.getUniformLocation(programInfo.program, "uRenderTextureFetchAmountMax"), 3000);
  gl.uniform1i(gl.getUniformLocation(programInfo.program, "uRenderControlPoints"), 1);

  // Draw elements, using a different texture per 2 elements (ie 1 cube face).
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, attrib_handler.gl_indices_buffer)
  const vertexCount = attrib_handler.num_triangles * 3;
  const type = gl.UNSIGNED_SHORT
  const offset = 0

  // Draw triangles.
  // Note, buffers don't get used up, they persist and an offset picks new data.
  gl.drawElements(gl.TRIANGLES, vertexCount, type, offset) // This function directly accesses the gl.ELEMENT_ARRAY_BUFFER.
}