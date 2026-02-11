/**
 * Initialize a shader program, so WebGL knows how to draw our data.
 * @param {WebGL2RenderingContext} gl 
 * @returns {Promise<WebGLProgram>}
 */
async function InitShaderProgram(gl, vsUrl, fsUrl, js_consts) {
  // Fetch glsl source.
  const vsSource = await (await fetch(vsUrl)).text()
  const fsSource = await (await fetch(fsUrl)).text()

  // Manually replace runtime consts.
  const vsSourceReplaced = ReplaceJsConsts(vsSource, js_consts);
  const fsSourceReplaced = ReplaceJsConsts(fsSource, js_consts);

  const vertexShader = LoadShader(gl, gl.VERTEX_SHADER, vsSourceReplaced);
  const fragmentShader = LoadShader(gl, gl.FRAGMENT_SHADER, fsSourceReplaced);

  // Create the shader program
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  performance.mark("Shader linking...")
  gl.linkProgram(shaderProgram);
  performance.mark("Shader linked")

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
    return null;
  }

  return shaderProgram;
}

/** Creates a shader of the given type, uploads the source and compiles it. */
function LoadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object
  gl.shaderSource(shader, source);

  // Compile the shader program
  performance.mark("Shader compiling...")
  gl.compileShader(shader);
  performance.mark("Shader compiled")

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
    console.log(source)
    gl.deleteShader(shader);
    return null;
  }

  // Print warnings (if any)
  const infoLog = gl.getShaderInfoLog(shader);
  if (infoLog) {
    console.warn(`Shader compilation log (${type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'}):`);
    console.warn(infoLog);
  }

  return shader;
}

/**
 * Look up which attributes our shader program is using for aVertexPosition, aTextureCoord and also look up uniform locations.
 */
function GetProgramInfo(gl, shaderProgram) {
  return {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord"),
      faceIndex: gl.getAttribLocation(shaderProgram, "aFaceIndex"),
      canvasCoord: gl.getAttribLocation(shaderProgram, "aCanvasCoord"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
      uSampler: gl.getUniformLocation(shaderProgram, "uImageTexture"),
      uQuadTexture: gl.getUniformLocation(shaderProgram, "uQuadTexture"),
      uGlyphLayoutTexture: gl.getUniformLocation(shaderProgram, "uGlyphLayoutTexture"),
      uScreenWidthPx: gl.getUniformLocation(shaderProgram, "uScreenWidthPx"),
      uScreenHeightPx: gl.getUniformLocation(shaderProgram, "uScreenHeightPx"),
    },
  }
}

/**
 * 
 * @param {String} source_txt 
 * @param {Object} js_consts 
 * @returns 
 */
function ReplaceJsConsts(source_txt, js_consts) {
  // Get all keys of js_consts.
  const keys = Object.keys(js_consts);
  // Iterate.
  for (const key of keys) {
    source_txt = source_txt.replace(key, js_consts[key]);
  }
  // Assert that all keys were replaced.
  for (const key of keys) {
    if (source_txt.includes(key)) {
      console.error(`Replacement failed for key: ${key}`);
    }
  }
  return source_txt;
}

export { InitShaderProgram, GetProgramInfo }