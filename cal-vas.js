import { initBuffers } from "./init-buffers.js";
import { drawScene } from "./draw-scene.js";

let cubeRotation = 0.0;
let deltaTime = 0;

/** Returns WebGL context. */
function CanvasInit() {
  const canvas = document.getElementById("cal-vas")
  canvas.width = canvas.clientWidth; // Resolution
  canvas.height = canvas.clientHeight; // Resolution
  return canvas.getContext("webgl2")
}

function DebugCanvasInit() {
  const canvas = document.getElementById("debug-canvas")
  const resolution_factor = 3
  canvas.width = canvas.clientWidth * resolution_factor; // Resolution * res_factor
  canvas.height = canvas.clientHeight * resolution_factor; // Resolution * res_factor
  return canvas.getContext("2d")
}

// Get debug 2d canvas debug visualization.
const debug_ctx = DebugCanvasInit()
debug_ctx.beginPath()
debug_ctx.fillColor = "black"
debug_ctx.fillRect(0, 0, debug_ctx.canvas.width, debug_ctx.canvas.height)

// Execution will block until shader src is fetched.
// Vertex and fragment shader programs.
const gVertexShader = await (await fetch("vertex.glsl")).text()
const gFragmentShader = await (await fetch("fragment.glsl")).text()

// Get the ttfs and use opentype to parse.
const jetbrains_mono_url = 'jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf';
let jetbrains_mono_opentype = null
opentype.load(jetbrains_mono_url, (err, font) => { jetbrains_mono_opentype = font });
// Wait until jetbrains_mono_opentype is loaded
while (jetbrains_mono_opentype === null) { await new Promise(resolve => setTimeout(resolve, 100)); }
// Get path and iterate through commands.
const hhh = jetbrains_mono_opentype.charToGlyph('H')
const h_path = hhh.getPath()
h_path.commands.forEach((command) => {
  switch (command.type) {
    case 'M':
      console.log(`Move to: (${command.x}, ${command.y})`)
      break;
    case 'L':
      console.log(`Line to: (${command.x}, ${command.y})`)
      break;
    case 'Q':
      console.log(`Quadratic Bézier curve: { start: { x: ${command.x1}, y: ${command.y1} }, control: { x: ${command.x}, y: ${command.y} }, end: { x: undefined, y: undefined } }`)
      break;
    case 'C':
      console.log(`Cubic Bézier curve: { start: { x: ${command.x1}, y: ${command.y1} }, control1: { x: ${command.x2}, y: ${command.y2} }, control2: { x: ${command.x}, y: ${command.y} }, end: { x: undefined, y: undefined } }`)
      break;
    default:
  }
})

function RoomMain() {
  const gl = CanvasInit()
  if (!gl) {
    console.error("WebGL not supported")
    return
  }
  gl.clearColor(255, 255, 255, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Enable back-face culling
  // gl.enable(gl.CULL_FACE);
  // gl.cullFace(gl.BACK); // Cull front-facing faces to show the interior

  // Build shader.
  const shaderProgram = initShaderProgram(gl, gVertexShader, gFragmentShader)

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aTextureCoord and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
      uSampler: gl.getUniformLocation(shaderProgram, "uSampler"),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl);

  // Load texture
  const textures = [
    loadTexture(gl, "funny.webp"), // Front
    loadTexture(gl, "funny.webp"), // Back
    loadTexture(gl, "funny.webp"), // Top
    loadTexture(gl, "funny.webp"), // Bottom
    loadTexture(gl, "funny.webp"), // Right // NOTE: right-left swapped to show interior perspective.
    loadTexture(gl, "funny.webp"), // Left // NOTE: right-left swapped to show interior perspective.
  ]
  // Hard code some modifications to the texture orientations.
  // Flip the textures vertically for left, right, back, and front walls.
  textures.forEach((texture, index) => {
    if (index === 0 || index === 1 || index === 4 || index === 5) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    }
  });

  // Draw the scene repeatedly
  let then = 0;
  function render(now) {
    now *= 0.001; // convert to seconds
    deltaTime = now - then;
    then = now;

    drawScene(gl, programInfo, buffers, textures, cubeRotation);
    cubeRotation += deltaTime;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// Initial call.
RoomMain()

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shaderProgram,
      )}`,
    );
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be downloaded over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 0, 0]); // Transparent black.
  gl.texImage2D(
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