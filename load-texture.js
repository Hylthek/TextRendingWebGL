/** Initialize a texture and load an image. When the image finished loading copy it into the texture. */
/**
 * @param {WebGL2RenderingContext} gl
 */
function LoadImageTexture(gl, url) {
  const texture = gl.createTexture(); // Empty texture.
  gl.bindTexture(gl.TEXTURE_2D, texture); // Bind empty texture to gl context's current texture.

  // Because images have to be downloaded over the internet they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can use it immediately.
  // When the image has finished downloading we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 0, 0]); // Transparent black.
  gl.texImage2D( // This function is a setter.
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel,
  );

  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image,
    );

    // WebGL1 has different requirements for power of 2 images
    // vs. non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      // No, it's not a power of 2. Turn off mips and set
      // wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url; // Starts the image loading.

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

/**
 * Loads a WebGL texture that contains quadratic curve data.
 * @param {WebGL2RenderingContext} gl
 * @param {Array<Array<Float32>>} quad_jagged_array
 * A jagged array where idx = (face, quad).  
 * Each quad contains 3 2D-points and 2 metadata numbers, ie 8 FLOATs.  
 * This data will be split among two rgba pixels.  
 * Every sub-array in the parameter must have a length%4==0 or an error is thrown.
 * @returns {WebGLTexture}
 * A WebGL texture where the u-axis selects quad and the v-axis selects face. Workaround for no SSBOs.
 */
function LoadQuadTexture(gl, quad_jagged_array) {
  // Check for quad_jagged_array sub-array mod4 validity.
  const bad_idx = IdxSubArrayNotMod4(quad_jagged_array)
  if (bad_idx !== -1) {
    console.error("quad_jagged_array does not have sub-arrays.length % 4 == 0 at index: " + bad_idx);
    return null;
  }

  // Create and bind a new texture.
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set texture parameters.
  // MinFilter and MagFilter must be changed from default since texture isn't a Po2.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Fill empty spots of jagged array with zeroes.
  const quad_rect_array = JaggedToRectArray(quad_jagged_array, 0);

  // Configure texture to use 4 FLOAT32s per pixel.
  const internalFormat = gl.RGBA32F;
  const format = gl.RGBA;
  const type = gl.FLOAT;

  // Define pixel width and height.
  // Moving along width changes to different quads on same face. First idx of the uv coord.
  // Moving along height changes to a different face. Second idx of the uv coord.
  const width = quad_rect_array[0].length / 4; // Div/4 because 4 floats per pixel.
  const height = quad_rect_array.length; // Only 1 face per vertical pixel, though.
  const data = new Float32Array(quad_rect_array.flat()); // flat() Turns [[1,2],[3,4]] into [1,2,3,4]

  // Fill texture with quad_rect_array.
  // The below function populates data by ascending the u axis before ascending the v-axis.
  const level = 0; // mipmap thing, keep 0.
  const border = 0; // Must be 0 or error is thrown. Why is it even here? Deprecated, apparently. Very ugly :(
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, data);

  return texture;
}

/**
 * Converts a jagged array into a rectangular 2D array, filling missing elements with 0.
 * @param {Array<Array<number>>} jaggedArray
 * @returns {Array<Array<number>>}
 */
function JaggedToRectArray(jaggedArray, fill_val) {
  const maxLength = Math.max(...jaggedArray.map(row => row.length));
  return jaggedArray.map(row => {
    const newRow = new Array(maxLength).fill(fill_val);
    for (let i = 0; i < row.length; i++) {
      newRow[i] = row[i];
    }
    return newRow;
  });
}

/**
 * @returns the index of the jagged array that has a non mod4 array. -1 if none found.
 */
function IdxSubArrayNotMod4(jagged_array) {
  for (let i = 0; i < jagged_array.length; i++) {
    if (jagged_array[i].length % 4 !== 0) {
      return i;
    }
  }
  return -1;
}

export { LoadImageTexture, LoadQuadTexture }