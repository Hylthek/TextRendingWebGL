function InitBuffers(gl) {
  // Buffers are per-vertex, unless they are element buffers, like elementIndicesBuffer.
  const positionBuffer = InitPositionBuffer(gl);

  const textureCoordBuffer = InitTextureCoordBuffer(gl);

  const canvas_coords_buffer = InitTextCanvasBuffer(gl);

  const elementIndicesBuffer = InitIndexBuffer(gl); // Unreferenced.

  const faceIndexBuffer = InitFaceIndexBuffer(gl);

  return {
    position: positionBuffer,
    textureCoord: textureCoordBuffer,
    canvasCoord: canvas_coords_buffer,
    elementIndices: elementIndicesBuffer, // Unreferenced.
    faceIndex: faceIndexBuffer,
  };
}

function InitPositionBuffer(gl) {
  // Create a buffer for the square's positions.
  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const base_2 = 1
  const width_2 = 1
  const height_2 = 1

  // Now create an array of positions for the cube.
  const positions = [
    // Front face
    -width_2, -height_2, base_2,
    width_2, -height_2, base_2,
    width_2, height_2, base_2,
    -width_2, height_2, base_2,

    // Back face
    -width_2, -height_2, -base_2, -width_2, height_2, -base_2, width_2, height_2, -base_2, width_2, -height_2, -base_2,

    // Top face
    -width_2, height_2, -base_2, -width_2, height_2, base_2, width_2, height_2, base_2, width_2, height_2, -base_2,

    // Bottom face
    -width_2, -height_2, -base_2, width_2, -height_2, -base_2, width_2, -height_2, base_2, -width_2, -height_2, base_2,

    // Right face
    width_2, -height_2, -base_2, width_2, height_2, -base_2, width_2, height_2, base_2, width_2, -height_2, base_2,

    // Left face
    -width_2, -height_2, -base_2, -width_2, -height_2, base_2, -width_2, height_2, base_2, -width_2, height_2, -base_2,
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}

function initColorBuffer(gl) {
  const faceColors = [
    [0, 1, 0, 1.0], // Front face: green
    [0, 0, 1, 1.0], // Back face: blue
    [1, 1, 1, 1.0], // Top face: white
    [1, 1, 0, 1.0], // Bottom face: yellow
    [1, 0, 0, 1.0], // Right face: red
    [1, 0.5, 0, 1.0], // Left face: orange
  ];

  // Convert the array of colors into a table for all the vertices.

  let colors = [];

  for (const c of faceColors) {
    // Repeat each color four times for the four vertices of the face
    colors = colors.concat(c, c, c, c);
  }

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return colorBuffer;
}

function InitIndexBuffer(gl) {
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  // prettier-ignore
  const indices = [
    0, 1, 2, 0, 2, 3,    // front
    4, 5, 6, 4, 6, 7,    // back
    8, 9, 10, 8, 10, 11,   // top
    12, 13, 14, 12, 14, 15,   // bottom
    16, 17, 18, 16, 18, 19,   // right
    20, 21, 22, 20, 22, 23,   // left
  ];

  // Now send the element array to GL

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );

  return indexBuffer;
}

function InitTextureCoordBuffer(gl) {
  const texture_coords_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texture_coords_buffer);

  const texture_coords = [ // Two floats per vertex.
    // Front idx 0
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Back idx 1
    1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,
    // Top idx 2
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Bottom idx 3
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Right idx 4
    1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,
    // Left idx 5
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
  ];

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(texture_coords),
    gl.STATIC_DRAW,
  );

  return texture_coords_buffer;
}

function InitTextCanvasBuffer(gl) {
  const canvas_coords_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, canvas_coords_buffer);

  const c_sz = 100; // canvas_size, width and height.

  const canvas_coords = [ // Two floats per vertex.
    // Front idx 0
    0.0, 0.0, c_sz, 0.0, c_sz, c_sz, 0.0, c_sz,
    // Back idx 1
    c_sz, 0.0, c_sz, c_sz, 0.0, c_sz, 0.0, 0.0,
    // Top idx 2
    0.0, 0.0, c_sz, 0.0, c_sz, c_sz, 0.0, c_sz,
    // Bottom idx 3
    0.0, 0.0, c_sz, 0.0, c_sz, c_sz, 0.0, c_sz,
    // Right idx 4
    c_sz, 0.0, c_sz, c_sz, 0.0, c_sz, 0.0, 0.0,
    // Left idx 5
    0.0, 0.0, c_sz, 0.0, c_sz, c_sz, 0.0, c_sz,
  ];

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(canvas_coords),
    gl.STATIC_DRAW,
  );

  return canvas_coords_buffer;
}

/**
 * @param {WebGL2RenderingContext} gl
 */
function InitFaceIndexBuffer(gl) {
  const face_index_buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, face_index_buffer)

  const face_indices = [ // One int per vertex.
    // Front
    0, 0, 0, 0,
    // Back
    1, 1, 1, 1,
    // Top
    2, 2, 2, 2,
    // Bottom
    3, 3, 3, 3,
    // Right
    4, 4, 4, 4,
    // Left
    5, 5, 5, 5,
  ];

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Int32Array(face_indices),
    gl.STATIC_DRAW,
  );

  return face_index_buffer;
}

export { InitBuffers };