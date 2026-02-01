import { InitBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { InitShaderProgram } from "./init-shader-program.js";
import { LoadImageTexture, LoadQuadTexture } from "./load-texture.js";
import { OpenTypeDemo } from './opentype-demo.js'

// OpenType proof of concept via 2d canvas.
const debug_ctx = DebugCanvasInit()
await OpenTypeDemo(debug_ctx)

async function RoomMain() {
  const gl = CanvasInit()
  if (!gl) { console.error("WebGL not supported"); return; }
  gl.clearColor(255, 255, 255, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Build and bind shader.
  const vertex_shader_src = await (await fetch("vertex.glsl")).text()
  const fragment_shader_src = await (await fetch("fragment.glsl")).text()
  const shaderProgram = InitShaderProgram(gl, vertex_shader_src, fragment_shader_src)

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using for aVertexPosition, aTextureCoord and also look up uniform locations.
  // IE configure inputs into glsl script.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord"),
      faceIndex: gl.getAttribLocation(shaderProgram, "aFaceIndex"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
      uSampler: gl.getUniformLocation(shaderProgram, "uImageTexture"),
      uQuadTexture: gl.getUniformLocation(shaderProgram, "uQuadTexture"),
      uScreenWidthPx: gl.getUniformLocation(shaderProgram, "uScreenWidthPx"),
      uScreenHeightPx: gl.getUniformLocation(shaderProgram, "uScreenHeightPx"),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = InitBuffers(gl);

  // Load texture
  const image_textures = [
    LoadImageTexture(gl, "funny.webp"), // Front.
    LoadImageTexture(gl, "funny.webp"), // Back.
    LoadImageTexture(gl, "funny.webp"), // Top.
    LoadImageTexture(gl, "funny.webp"), // Bottom.
    LoadImageTexture(gl, "funny.webp"), // Right.
    LoadImageTexture(gl, "funny.webp"), // Left.
  ]

  // Turn sample text into arrays of OpenType path commands.
  const demo_paths = Array(6).fill(
    [
      { x0: 0.5, y0: 0.1, x1: 0.1, y1: 0.5, x: 0.5, y: 0.9, }, // Starts at bottom, curves CW to top.
      { x0: 0.5, y0: 0.9, x1: 0.9, y1: 0.5, x: 0.5, y: 0.1, }, // Starts at top, curves CW to bottom.
    ]
  )

  // Turn quad commands into quad arrays
  const demo_quads = demo_paths.map(path => { return CommandsToQuadArray(path); })

  // Load quad data texture.
  const quad_data_texture = LoadQuadTexture(gl, demo_quads)

  // Draw the scene repeatedly
  function RenderScene(now) {
    const cube_rotation = now / 1000;
    DrawScene(gl, programInfo, buffers, image_textures, cube_rotation, quad_data_texture, gMovementSpeed);
    PrintCenterPixelInt32(gl);
    requestAnimationFrame(RenderScene);
  }

  requestAnimationFrame(RenderScene);
}
RoomMain()

/** 
 * @returns {WebGL2RenderingContext} WebGL context.
 */
function CanvasInit() {
  const canvas = document.getElementById("cal-vas")
  canvas.width = canvas.clientWidth; // Resolution
  canvas.height = canvas.clientHeight; // Resolution
  return canvas.getContext("webgl2")
}

/** Returns 2D context. */
function DebugCanvasInit() {
  const canvas = document.getElementById("debug-canvas")
  const resolution_factor = 3
  canvas.width = canvas.clientWidth * resolution_factor; // Resolution * res_factor
  canvas.height = canvas.clientHeight * resolution_factor; // Resolution * res_factor
  return canvas.getContext("2d")
}

/**
 * Turns an array of QuadCurve objects into a buffer of FLOATs.
 * @param {Array<QuadCurve>} commands
 * @returns {Array<Number>} An array whose length is a multiple of 4.
 */
function CommandsToQuadArray(commands, metadata1 = 0, metadata2 = 0) {
  const output = commands.map(command => {
    return [
      command.x0, command.y0, command.x1, command.y1,
      command.x, command.y, metadata1, metadata2,
    ]
  })
  return output.flat()
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 */
function PrintCenterPixelInt32(gl) {
  const debug_array_length = 100; // Must match the fragment shader const of the same name.
  // Get shader debug info.
  const pixel = new Uint8Array(4 * debug_array_length);
  const gl_w_2_i = Math.floor(gl.canvas.width / 2);
  const gl_h_2_i = Math.floor(gl.canvas.height / 2);
  gl.readPixels(gl_w_2_i, gl_h_2_i, debug_array_length, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  // Convert pixel to int32.
  let pixel_int32 = new Int32Array(debug_array_length);
  for (let i = 0; i < debug_array_length; i++)
    pixel_int32[i] = ((pixel[4 * i] << 24 >>> 0) + (pixel[4 * i + 1] << 16) + (pixel[4 * i + 2] << 8) + (pixel[4 * i + 3] << 0)) >> 0;
  // Print.
  const strings = Array.from(pixel_int32).map(num => num.toString().padStart(4, " "));
  console.log(...strings.slice(0, 16));
  // console.log(...strings.slice(0, 16));
}

let gMovementSpeed = {
  x: 0,
  y: 0
}
// Add event listener for arrow keys
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowUp":
      gMovementSpeed.y++
      break;
    case "ArrowDown":
      gMovementSpeed.y--
      break;
    case "ArrowLeft":
      gMovementSpeed.x--
      break;
    case "ArrowRight":
      gMovementSpeed.x++
      break;
    case " ":
      gMovementSpeed.x = 0;
      gMovementSpeed.y = 0;
      break;
    default:
      break;
  }
});
