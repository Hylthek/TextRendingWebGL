/** Initialize a texture and load an image. When the image finished loading copy it into the texture. */
function LoadTexture(gl, url) {
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
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}


/**
 * Loads a WebGL texture that contains quadratic curve data.
 * @param {WebGL2RenderingContext} gl
 * @param {Array<Array<uint8>>} quad_2d_array
 * A 2D array where rows are quadratic curve data and columns are faces.
 */
function LoadQuadTexture(gl, quad_2d_array) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Fill texture with quad_2d_array.
  const level = 0;
  const internalFormat = gl.LUMINANCE;
  const width = quad_2d_array.width; // Moving along width changes to a different quadratic bezier curve on the same face.
  const height = 2;
  const border = 0;
  const format = gl.LUMINANCE;
  const type = gl.UNSIGNED_BYTE;
  const data = new Uint8Array(quad_2d_array.flat());
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border,
    format, type, data);
}

export { LoadTexture }