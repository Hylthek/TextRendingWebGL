function DrawScene(gl, programInfo, buffers, textures, cubeRotation) {

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
    // const foo = 5
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
    const sin = Math.sin // Alias.
    mat4.rotate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to rotate
      cubeRotation, // amount to rotate in radians
      [sin(cubeRotation + 4), sin(cubeRotation * 2.4 + 8), sin(cubeRotation * 3 + 2)],
    );
  }

  // Set the shader program.
  gl.useProgram(programInfo.program);
  // Set the shader attributes.
  SetPositionAttribute(gl, buffers, programInfo);
  SetTextureAttribute(gl, buffers, programInfo);
  // Set the shader uniforms
  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

  //
  for (let currFace = 0; currFace < textures.length; currFace++) {
    // Tell WebGL we want to affect texture unit 0. Nothing special about 0, currently only need one texture.
    gl.activeTexture(gl.TEXTURE0);
    // Bind the texture to texture unit 0.
    gl.bindTexture(gl.TEXTURE_2D, textures[currFace]);
    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0); // Just declares a glsl_int = 0.

    const vertexCount = 6 // 6 vertices per face.
    const type = gl.UNSIGNED_SHORT // 2 bytes.
    const offset = currFace * 12 // each face contains 12 bytes of data.
    
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

// tell webgl how to pull out the texture coordinates from buffer
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

export { DrawScene };