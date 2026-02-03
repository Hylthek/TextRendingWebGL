import { InitBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { InitShaderProgram } from "./init-shader-program.js";
import { LoadImageTexture, LoadQuadTexture } from "./load-texture.js";
import { MyQuadCommand, OpenTypeDemo, StringToCommands } from './opentype-demo.js'

// OpenType proof of concept via 2d canvas.
const debug_ctx = DebugCanvasInit()
await OpenTypeDemo(debug_ctx)

async function CalvasMain() {
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
      canvasCoord: gl.getAttribLocation(shaderProgram, "aCanvasCoord"),
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
  const commands_per_face = [
    await StringToCommands(
      'Hello\nJetBrains\nMono!',
      'jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf',
      0,
      100,
      18
    ),
    await StringToCommands(
      'Hello\nInter!',
      'inter_ttf/Inter_24pt-Regular.ttf',
      0,
      100,
      28
    )
  ]

  // Turn quad commands into quad jagged-arrays. Array[face][quad]
  const quad_jagged_array = commands_per_face.map(face => CommandsToQuadArray(face))

  // Load quad data texture.
  const quad_data_texture = LoadQuadTexture(gl, quad_jagged_array);

  // Draw the scene repeatedly
  function RenderScene(now) {
    const cube_rotation = now / 1000;
    DrawScene(gl, programInfo, buffers, image_textures, quad_data_texture, gSphereCoords);
    PrintCenterPixelInt32(gl);
    requestAnimationFrame(RenderScene);
  }

  requestAnimationFrame(RenderScene);
}
CalvasMain()

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
 * @param {Array<MyQuadCommand>} commands
 * @returns {Array<Number>} An array whose length is a multiple of 4.
 */
function CommandsToQuadArray(commands, metadata1 = 0, metadata2 = 0) {
  const output = commands.map(command =>
    [
      command.x0, command.y0, command.x1, command.y1,
      command.x, command.y, metadata1, metadata2,
    ]
  )
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
  for (let i = 0; i < debug_array_length; i++) {
    pixel_int32[i] = ((pixel[4 * i] << 24 >>> 0) + (pixel[4 * i + 1] << 16) + (pixel[4 * i + 2] << 8) + (pixel[4 * i + 3] << 0)) >> 0;
  }
  // Print.
  const strings = Array.from(pixel_int32).map(num => (num / 1000).toString().padStart(10, " "));
  console.log(...strings.slice(0, 16));
}

let gSphereCoords = {
  theta_deg: 45,
  phi_deg: 35.26
}
// Add event listener for arrow keys
document.addEventListener("keydown", (event) => {
  const rot_speed = 3;
  switch (event.key) {
    case "ArrowUp":
      gSphereCoords.phi_deg -= rot_speed;
      event.preventDefault();
      break;
    case "ArrowDown":
      gSphereCoords.phi_deg += rot_speed;
      event.preventDefault();
      break;
    case "ArrowLeft":
      gSphereCoords.theta_deg -= rot_speed;
      event.preventDefault();
      break;
    case "ArrowRight":
      gSphereCoords.theta_deg += rot_speed;
      event.preventDefault();
      break;
    default:
      break;
  }
});
