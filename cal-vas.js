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
    LoadImageTexture(gl, "wooden-crate.webp"), // Front.
    LoadImageTexture(gl, "wooden-crate.webp"), // Back.
    LoadImageTexture(gl, "wooden-crate.webp"), // Top.
    LoadImageTexture(gl, "wooden-crate.webp"), // Bottom.
    LoadImageTexture(gl, "wooden-crate.webp"), // Right.
    LoadImageTexture(gl, "wooden-crate.webp"), // Left.
  ]

  // Fetch War and Peace.
  const war_and_peace_txt = await (await fetch("WarAndPeace.txt")).text()
  const text_length = 100;
  const war_and_peace_trunc_txt = war_and_peace_txt.slice(0,text_length);
  console.log(war_and_peace_trunc_txt);

  // Turn sample text into arrays of OpenType path commands.
  const commands_per_face = [
    await StringToCommands(
      'Hello\nJetBrains\nMono!',
      'jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf',
      0,
      1000,
      180
    ),
    await StringToCommands(
      'Hello\nInter!',
      'inter_ttf/Inter_24pt-Regular.ttf',
      0,
      1000,
      280
    ),
    await StringToCommands(
      'Hello\nCedarville\nCursive!',
      'CedarvilleCursive-Regular.ttf',
      0,
      1000,
      180
    ),
    await StringToCommands(
      war_and_peace_trunc_txt,
      'jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf',
      0,
      1000,
      30
    ),
  ]

  // Turn quad commands into quad jagged-arrays. Array[face][quad]
  const quad_jagged_array = commands_per_face.map(face => CommandsToQuadArray(face))

  // Load quad data texture.
  const quad_data_texture = LoadQuadTexture(gl, quad_jagged_array);

  // Draw the scene repeatedly
  function RenderScene(now) {
    const cube_rotation = now / 1000;
    DrawScene(gl, programInfo, buffers, image_textures, quad_data_texture, gSphereCoords, gCameraPos);
    // PrintCenterPixelInt32(gl);
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
let gCameraPos = {
  zoom: 2.5,
}

// Add event listener for trackpad scrolling to smoothly change zoom level
document.addEventListener("wheel", (event) => {
  const canvas = document.getElementById("cal-vas");
  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight;

  const zoomSensitivity = 0.001 / (Math.min(canvasWidth, canvasHeight) / 500); // Adjust sensitivity based on canvas size
  gCameraPos.zoom *= 1 - event.deltaY * zoomSensitivity;

  // Prevent zoom level from becoming too small or too large
  gCameraPos.zoom = Math.max(1, Math.min(1000, gCameraPos.zoom));

  event.preventDefault();
}, { passive: false });

// Add event listener for mouse drag to rotate the sphere
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

document.addEventListener("mousedown", (event) => {
  isDragging = true;
  previousMousePosition = { x: event.clientX, y: event.clientY };
});

document.addEventListener("mousemove", (event) => {
  if (isDragging) {
    const canvas = document.getElementById("cal-vas");
    const normalization_factor = canvas.clientWidth / 3;

    const deltaX = (event.clientX - previousMousePosition.x) / normalization_factor / gCameraPos.zoom;
    const deltaY = (event.clientY - previousMousePosition.y) / normalization_factor / gCameraPos.zoom;

    gSphereCoords.theta_deg += deltaX * 150; // Adjust sensitivity as needed
    gSphereCoords.phi_deg += deltaY * 150; // Adjust sensitivity as needed

    // Clamp phi_deg to avoid flipping
    gSphereCoords.phi_deg = Math.max(-89, Math.min(89, gSphereCoords.phi_deg));

    previousMousePosition = { x: event.clientX, y: event.clientY };
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

document.addEventListener("mouseleave", () => {
  isDragging = false;
});
