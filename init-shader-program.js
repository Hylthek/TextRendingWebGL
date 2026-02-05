/**
 * Initialize a shader program, so WebGL knows how to draw our data.
 * @param {WebGL2RenderingContext} gl 
 * @returns {Promise<WebGLProgram>}
 */
async function InitShaderProgram(gl, vsUrl, fsUrl) {
  const vsSource = await (await fetch(vsUrl)).text()
  const fsSource = await (await fetch(fsUrl)).text()
  
  const vertexShader = LoadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = LoadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
    alert("GLSL ERROR:")
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

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
    alert("GLSL ERROR:")
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

export { InitShaderProgram }