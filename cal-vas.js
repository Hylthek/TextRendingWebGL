import { CanvasInit } from './canvas-init.js'
import { InitShaderProgram, GetProgramInfo } from "./init-shader-program.js";
import { InitVertexBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { LoadImageTexture } from "./load-texture.js";
import { PrintCenterPixelInt32 } from './shader-debug.js'
import { ViewControl } from './view-control.js'
import { FontToTexture } from './load-font-texture.js';
import { GetFont } from './opentype-demo.js';
import { GetJsConstValues } from './get-js-consts.js';
import { LoadTextureFromString } from './load-char-texture.js';

async function CalvasMain() {
  const gl = CanvasInit()
  if (!gl) { console.error("WebGL not supported"); return; }
  gl.clearColor(255, 255, 255, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Load static vertex attribute data.
  const vertex_buffers = InitVertexBuffers(gl);
  // Load a basic image texture.
  const image_texture = LoadImageTexture(gl, "wooden-crate.webp")
  // Load War and Peace.
  const text_length = 3000;
  const war_and_peace_txt = await (await fetch("WarAndPeace.txt")).text()
  const war_and_peace_trunc_txt = war_and_peace_txt.slice(0, text_length);
  // Load font object.
  const jetbrains_mono = await GetFont('jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf')
  // Load a font's entire glyph-set as a data texture.
  const {
    texture: font_data_texture,
    dimensions: font_data_texture_dims
  } = await FontToTexture(gl, jetbrains_mono)

  // Load a string into a texture.
  const text_px_size = 9;
  performance.mark("LoadTextureFromStart()...")
  const {
    texture: glyph_data_texture,
    dimensions: glyph_data_texture_dims,
  } = LoadTextureFromString(gl, war_and_peace_trunc_txt, jetbrains_mono, text_px_size);
  performance.mark("LoadTextureFromStart() Done.")
  performance.measure("LoadTextureFromStart()", "LoadTextureFromStart()...", "LoadTextureFromStart() Done.")

  // Get JS const values.
  const js_consts = GetJsConstValues(gl, font_data_texture_dims, glyph_data_texture_dims, jetbrains_mono, war_and_peace_trunc_txt.length);
  // Compile program and get pointers.
  const shaderProgram = await InitShaderProgram(gl, "./vertex.glsl", "./fragment.glsl", js_consts);
  const programInfo = GetProgramInfo(gl, shaderProgram);
  // Init panning, zooming, etc.
  const view = new ViewControl();
  // Get fps html span element.
  const fps_span_element = document.getElementById('fps');

  // Draw the scene repeatedly
  window.curr_glyph_data_texture = glyph_data_texture;
  function RenderScene(now) {
    DrawScene(gl, programInfo, vertex_buffers, view, image_texture, font_data_texture, window.curr_glyph_data_texture);
    PrintCenterPixelInt32(gl);
    requestAnimationFrame(RenderScene);
    UpdateFps(now, fps_span_element);
  }
  requestAnimationFrame(RenderScene);
  setInterval(InitNewCharTexture, 1000/30, ...[gl, war_and_peace_trunc_txt, jetbrains_mono, text_px_size]);
}
CalvasMain()

/**
 * 
 * @param {Number} now
 * @param {HTMLElement} fps_span_element
 */
function UpdateFps(now, fps_span_element) {
  const n = 5;
  // Init statics.
  window.lastNthFrameTime = window.lastNthFrameTime || 0;
  window.counter = window.counter || 0;
  // Return early condition.
  if (window.counter < n - 1) {
    window.counter++;
    return
  }
  window.counter = 0;
  // Calculate fps/
  const fps = n * 1000 / (now - (window.lastNthFrameTime || 0));
  window.lastNthFrameTime = now;
  // Update text.
  const fps_rounded = Math.round(fps * 10) / 10;
  const fpsString = fps_rounded.toFixed(1).padStart(4, ' ');
  const bar_string = ' ' + '[' + '='.repeat(fps_rounded | 0) + '_'.repeat(70 - (fps_rounded | 0)) + ']'
  fps_span_element.textContent = fpsString + bar_string;
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {String} string_in 
 */

function InitNewCharTexture(gl, string_in, font, px_size) {
  const chars_per_sec = 500;
  const num_chars = performance.now() / 1000 * chars_per_sec % string_in.length;
  const string_sub = string_in.slice(0, num_chars)
  const { texture } = LoadTextureFromString(gl, string_sub, font, px_size);
  window.curr_glyph_data_texture = texture;
}