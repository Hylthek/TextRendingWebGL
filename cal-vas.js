import { CanvasInit } from './canvas-init.js'
import { InitShaderProgram, GetProgramInfo } from "./init-shader-program.js";
import { InitVertexBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { LoadImageTexture } from "./load-texture.js";
import { PrintCenterPixelInt32 } from './shader-debug.js'
import { ViewControl } from './view-control.js'
import { FontToTexture } from './load-font-texture.js';
import { GetJsConstValues } from './get-js-consts.js';
import { TextureFromString, gTextureWidth, gTextureHeight, InitTexture } from './load-char-texture.js';
import { LoadHBFont } from './harfbuzz-helper.js'; // Import helper

async function CalvasMain() {
  // Init WebGL canvas.
  const gl = CanvasInit()
  if (!gl) { console.error("WebGL not supported"); return; }
  gl.clearColor(255, 255, 255, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Load static vertex attribute data.
  const vertex_buffers = InitVertexBuffers(gl);

  // Load a basic image texture.
  const image_texture = LoadImageTexture(gl, "wooden-crate.webp")

  // Load War and Peace.
  const text_length = 15000;
  const war_and_peace_txt = await (await fetch("WarAndPeace.txt")).text()
  const war_and_peace_trunc_txt = '\n' + war_and_peace_txt.slice(0, text_length);

  // Load font objects.
  const font_data_jetbrains_mono = await LoadHBFont('jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf')
  const font_data_inter = await LoadHBFont('inter_ttf/Inter_18pt-Regular.ttf')

  // Load a font's entire set of glyph paths as a data texture.
  const {
    texture: font_data_texture,
    dimensions: font_data_texture_dims
  } = await FontToTexture(gl, font_data_inter.openTypeFont)

  // Init char texture.
  InitTexture(gl);

  // Get JS const values.
  const glyph_data_texture_dims = {
    width: gTextureWidth,
    height: gTextureHeight
  }
  const js_consts = GetJsConstValues(gl, font_data_texture_dims, glyph_data_texture_dims, font_data_inter.openTypeFont, war_and_peace_trunc_txt.length);
  // Compile program and get pointers.
  const shaderProgram = await InitShaderProgram(gl, "./vertex.glsl", "./fragment.glsl", js_consts);
  const programInfo = GetProgramInfo(gl, shaderProgram);
  gl.useProgram(shaderProgram)
  // Init panning, zooming, etc.
  const view = new ViewControl();
  // Get fps html span element.
  const fps_span_element = document.getElementById('fps');

  // Load a string into a texture.
  const px_per_em = 24;
  window.curr_glyph_data_texture = TextureFromString(gl, "\nTest=>Test\nWAVE", font_data_inter, px_per_em, programInfo);

  // Draw the scene repeatedly
  function RenderScene(now) {
    if (window.curr_glyph_data_texture)
      DrawScene(gl, programInfo, vertex_buffers, view, image_texture, font_data_texture, window.curr_glyph_data_texture);
    PrintCenterPixelInt32(gl, 8);
    requestAnimationFrame(RenderScene);
    UpdateFps(now, fps_span_element);
  }
  requestAnimationFrame(RenderScene);
  setInterval(LoadScrollingText, 1000 / 30, ...[gl, war_and_peace_trunc_txt, font_data_inter, px_per_em, programInfo]);
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
  const 你的 = ' ' + '[' + '='.repeat(fps_rounded | 0) + '_'.repeat(70 - (fps_rounded | 0)) + ']'
  fps_span_element.textContent = fpsString + 你的;
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {String} string_in 
 */

function LoadScrollingText(gl, string_in, font, px_per_em, programInfo) {
  const chars_per_sec = 500;
  const num_chars = performance.now() / 1000 * chars_per_sec % string_in.length;
  const string_sub = string_in.slice(0, num_chars)
  const texture = TextureFromString(gl, string_sub, font, px_per_em, programInfo);
  window.curr_glyph_data_texture = texture;
}