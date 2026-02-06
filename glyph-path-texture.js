async function FontToTexture(gl, font_url) {
  // Is an array of path objects, one for each glyph in the font.
  const path_per_glyph = await FontToPathArray(font_url);
  // Is an array of arrays of Quadratic Bezier Curves, one set per glyph in the font.
  const curves_per_glyph = path_per_glyph.map(path => PathToCurves(path));
  // Is an array of ArrayBuffers, each corresponding to a glyph in the font / a row in the texture.
  const buffer_per_glyph = curves_per_glyph.map(curves => CurvesToBuffer(curves))

  const font_data_texture = LoadDataTexture(gl, buffer_per_glyph);

  return font_data_texture;
}

/**
 * @param {String} font_url Url of a ttf file.
 * @returns {Array<OpenTypePath>} An array of every glyph's OpenType path object, ordered by OpenType index.
 */
async function FontToPathArray(font_url) {
  let font_obj;
  let glyph_paths;
  // Load.
  opentype.load(font_url, function (err, font) {
    if (err) { console.error('Font could not be loaded: ' + err); }
    else {
      font_obj = font;
      glyph_paths = Array(font.numGlyphs);
      for (let i = 0; i < font.numGlyphs; i++) {
        const glyph = font.glyphs.get(i);
        glyph_paths[i] = glyph.path;
      }
    }
  });
  // Wait.
  while (font_obj === undefined) { await new Promise(resolve => setTimeout(resolve, 100)); }
  // Return.
  return glyph_paths;
}

// A struct defined for clarity.
class QuadraticCurve {
  constructor(quad_command) {
    this.x0 = quad_command.x0;
    this.y0 = quad_command.y0;
    this.x1 = quad_command.x1;
    this.y1 = quad_command.y1;
    this.x2 = quad_command.x2;
    this.y2 = quad_command.y2;
    if (this.x0 === undefined || this.y0 === undefined || this.x1 === undefined || this.y1 === undefined || this.x2 === undefined || this.y2 === undefined)
      console.error("Constructor failed.", this);
  }
}

/**
 * Turns an array of OpenType path commands to a quadratic-only version that can be accessed randomly.
 * @param {Array<GlyphPath>} path
 * @returns {Array<QuadraticCurve>}
 */
function PathToCurves(path) {
  // Array copy.
  let curves_out = path.commands.slice()
  // Stores last point of previous command.
  let prev_point = { x: null, y: null }
  // Stages Move and ContourEnd commands for removal.
  let idx_to_remove = []

  // Iterate through path commands.
  curves_out.forEach((command, index) => {
    switch (command.type) {
      // MoveTo
      case 'M':
        prev_point.x = command.x
        prev_point.y = command.y
        idx_to_remove.push(index)
        break;
      // LineTo
      case 'L':
        command.x0 = prev_point.x
        command.y0 = prev_point.y
        const midpoint_x = (prev_point.x + command.x) / 2
        const midpoint_y = (prev_point.y + command.y) / 2
        command.x1 = midpoint_x
        command.y1 = midpoint_y
        command.x2 = command.x
        command.y2 = command.y
        command.type = 'Q'
        prev_point.x = command.x
        prev_point.y = command.y
        break;
      // QuadraticCurveTo
      case 'Q':
        command.x0 = prev_point.x
        command.y0 = prev_point.y
        command.x2 = command.x
        command.y2 = command.y
        prev_point.x = command.x
        prev_point.y = command.y
        break;
      // CubicCurveTo
      case 'C':
        command.x0 = prev_point.x
        command.y0 = prev_point.y
        const q_cp = QuadApproxCP(command)
        command.x1 = q_cp.x
        command.y1 = q_cp.y
        command.x2 = command.x
        command.y2 = command.y
        command.type = 'Q'
        prev_point.x = command.x
        prev_point.y = command.y
        break;
      // EndContour
      case 'Z':
        prev_point = { x: null, y: null }
        idx_to_remove.push(index)
        break;
    }
  })
  
  // Remove M and Z commands.
  idx_to_remove.reverse()
  idx_to_remove.forEach((idx) => {
    curves_out.splice(idx, 1)
  })

  // Cast to struct and return.
  return curves_out.map(command => new QuadraticCurve(command))
}

/**
 * Approximate a cubic bezier with a quadratic bezier control point.
 * @param cubic objects with x0,x1,x2,x & y0,y1,y2,y defined.
 * @returns The quadratic curve's control point as an object with x and y.
 */
function QuadApproxCP(cubic) {
  return {
    x: -0.25 * (cubic.x0 + cubic.x) + 0.75 * (cubic.x1 + cubic.x2),
    y: -0.25 * (cubic.y0 + cubic.y) + 0.75 * (cubic.y1 + cubic.y2),
  }
}

/**
 * Turns an array of QuadraticCurve objects into a FLOAT32Array that is mod4, i.e. compatible with a WebGL data texture.
 * @param {Array<QuadraticCurve>} curves
 * @returns {Array<Float>} An array of floats whose length is a multiple of 4.
 */
function CurvesToBuffer(curves, metadata1 = 0, metadata2 = 0) {
  // An array of Array(8)'s
  const output = curves.map(curve =>
    [
      curve.x0, curve.y0, curve.x1, curve.y1,
      curve.x2, curve.y2, metadata1, metadata2,
    ]
  )
  // Return a single array of floats
  return output.flat()
}

/**
 * Loads a WebGL texture that contains compatible quadratic curve data.  
 * Each curve contains 3 2D-points and 2 metadata numbers, ie 8 FLOATs.  
 * This data will be split among two rgba pixels.  
 * Every sub-array in the parameter must have a length%4==0 or an error is thrown.
 * @param {WebGL2RenderingContext} gl
 * @param {Array<Array<Float32>>} quad_jagged_array
 * A jagged array of Floats where idx = (row, column).  
 * @returns {WebGLTexture} A WebGL texture.
 */
function LoadDataTexture(gl, quad_jagged_array) {
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
  const quad_rect_array = JaggedToRectArray(quad_jagged_array);

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
 * Converts a jagged array into a rectangular 2D array, filling missing elements with fill_val.
 * @param {Array<Array<number>>} jaggedArray
 * @returns {Array<Array<number>>}
 */
function JaggedToRectArray(jaggedArray, fill_val = 0) {
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


export { FontToTexture }