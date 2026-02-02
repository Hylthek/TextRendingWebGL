/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {*} programInfo 
 * @param {*} buffers 
 * @param {*} image_textures 
 * @param {*} quad_data_texture 
 */
function DrawScene(gl, programInfo, buffers, image_textures, quad_data_texture, sphere_coords) {
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
    const fieldOfView = (60 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 20.0;
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
    // const foo = 2
    // const bar = foo / aspect
    // mat4.ortho(projectionMatrix, -foo, foo, -bar, bar, zNear, zFar) // Projection matrix that takes the specified box to the unit cube.
  }

  // Create the modelViewMatrix which is only named that because we only have one 3D solid.
  const modelViewMatrix = mat4.create(); // Set the drawing position to the "identity" point, which is the center of the scene.
  {
    // Now move the drawing position a bit to where we want to start drawing the square.
    mat4.translate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to translate
      [0, 0, -5],
    ); // amount to translate
    const precession = 0.1;
    const now_s = performance.now() / 1000;
    mat4.rotate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to rotate
      precession, // amount to rotate in radians
      [Math.cos(now_s), Math.sin(now_s), 0],
    );
    mat4.rotate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to rotate
      sphere_coords.phi_deg * Math.PI / 180, // amount to rotate in radians
      [1, 0, 0],
    );
    mat4.rotate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to rotate
      sphere_coords.theta_deg * Math.PI / 180, // amount to rotate in radians
      [0, 1, 0],
    );
  }

  // Set the shader program.
  gl.useProgram(programInfo.program);
  // Set the shader attribute buffers.
  SetPositionAttribute(gl, buffers, programInfo);
  SetTextureAttribute(gl, buffers, programInfo);
  SetCanvasAttribute(gl, buffers, programInfo);
  SetFaceIndexAttribute(gl, buffers, programInfo);
  // Set the shader uniforms
  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

  // Bind simple uniforms.
  gl.uniform1i(programInfo.uniformLocations.uScreenWidthPx, gl.canvas.width);
  gl.uniform1i(programInfo.uniformLocations.uScreenHeightPx, gl.canvas.height);

  // Bind textures.
  // Tex0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, image_textures[0]);
  // Tex1
  gl.uniform1i(programInfo.uniformLocations.uQuadTexture, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, quad_data_texture);

  // Draw elements, using a different texture per 2 elements (ie 1 cube face).
  for (let currFace = 0; currFace < image_textures.length; currFace++) {

    const vertexCount = 6 // 6 vertices per face.
    const type = gl.UNSIGNED_SHORT // 2 bytes.
    const offset = currFace * 12 // each face contains 12 bytes of data.
    // Note, buffers dont get used up, they persist and an offset picks new data.

    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset) // This function directly accesses the gl.ELEMENT_ARRAY_BUFFER.
  }
}

// Tell WebGL how to pull out the positions from the position
// buffer into the vertexPosition attribute.
function SetPositionAttribute(gl, buffers, programInfo) {
  const numComponents = 3; // pull out 3 values per iteration
  const type = gl.FLOAT; // the data in the buffer is 32bit floats
  const normalize = false; // don't normalize
  const stride = 0; // how many bytes to get from one set of values to the next. 0 = use type and numComponents above
  const offset = 0; // how many bytes inside the buffer to start from

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

// Tell WebGL how to pull out the colors from the color buffer
// into the vertexColor attribute.
function SetColorAttribute(gl, buffers, programInfo) {
  const numComponents = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexColor,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
}

/**
 * Tell webgl how to pull out the texture coordinates from buffer
 * @param {WebGL2RenderingContext} gl 
 */
function SetTextureAttribute(gl, buffers, programInfo) {
  const num = 2; // every coordinate composed of 2 values
  const type = gl.FLOAT; // the data in the buffer is 32-bit float
  const normalize = false; // don't normalize
  const stride = 0; // how many bytes to get from one set to the next
  const offset = 0; // how many bytes inside the buffer to start from

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(
    programInfo.attribLocations.textureCoord,
    num,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
}
function SetCanvasAttribute(gl, buffers, programInfo) {
  const num = 2; // every coordinate composed of 2 values
  const type = gl.FLOAT; // the data in the buffer is 32-bit float
  const normalize = false; // don't normalize
  const stride = 0; // how many bytes to get from one set to the next
  const offset = 0; // how many bytes inside the buffer to start from

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.canvasCoord);
  gl.vertexAttribPointer(
    programInfo.attribLocations.canvasCoord,
    num,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.canvasCoord);
}

/**
 * @param {WebGL2RenderingContext} gl 
 */
function SetFaceIndexAttribute(gl, buffers, programInfo) {
  const num = 1; // one uint32 per vertex. glsl only works in multiples of 32bits?
  const type = gl.INT;
  const stride = 0; // 0 means tightly packed, not interleaved.
  const offset = 0;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.faceIndex)
  gl.vertexAttribIPointer( // This ridiculous function name has a random I in it to declare integer attributes.
    programInfo.attribLocations.faceIndex,
    num,
    type,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.faceIndex);
}

export { DrawScene };