import { CanvasInit } from './canvas-init.js'
import { InitShaderProgram, GetProgramInfo } from "./init-shader-program.js";
import { InitVertexBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { LoadImageTexture } from "./load-texture.js";
import { PrintCenterPixelInt32 } from './shader-debug.js'
import { ViewControl } from './view-control.js'
import { FontToTexture } from './glyph-path-texture.js';
import { LoadUboFromString, ArrayGlyphLayout, InitGlyphBuffer } from './load-ubo.js';
import { GetFont } from './opentype-demo.js';
import { GetJsConstValues } from './get-js-consts.js';

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
  const text_length = 10;
  const war_and_peace_txt = await (await fetch("WarAndPeace.txt")).text()
  const war_and_peace_trunc_txt = war_and_peace_txt.slice(0, text_length);
  // Load font object.
  const jetbrains_mono = await GetFont('jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf')
  // Load a font's entire glyph-set as a data texture.
  const { texture: font_data_texture, dimensions: font_data_texture_dims } = await FontToTexture(gl, jetbrains_mono)
  // Init a uniform buffer for dynamic usage.
  const glyph_buffer = InitGlyphBuffer(gl);
  // Load a string into the uniform buffer.
  LoadUboFromString(gl, glyph_buffer, "abcd", jetbrains_mono, 1);
  // Get JS const values.
  const js_consts = GetJsConstValues(gl, glyph_buffer, font_data_texture_dims);
  // Compile program and get pointers.
  const shaderProgram = await InitShaderProgram(gl, "./vertex.glsl", "./fragment.glsl", js_consts);
  const programInfo = GetProgramInfo(gl, shaderProgram);
  // Init panning, zooming, etc.
  const view = new ViewControl();
  // Get fps html span element.
  const fps_span_element = document.getElementById('fps');

  // Draw the scene repeatedly
  function RenderScene(now) {
    DrawScene(gl, programInfo, vertex_buffers, image_texture, font_data_texture, view);
    PrintCenterPixelInt32(gl);
    requestAnimationFrame(RenderScene);
    UpdateFps(now, fps_span_element);
  }
  requestAnimationFrame(RenderScene);
}
CalvasMain()

/**
 * 
 * @param {Number} now
 * @param {HTMLElement} fps_span_element
 */
function UpdateFps(now, fps_span_element) {
  const fps = 1000 / (now - (window.lastFrameTime || 0));
  window.lastFrameTime = now;
  const fps_rounded = Math.round(fps * 10) / 10;
  const fpsString = fps_rounded.toFixed(1).padStart(4, ' ');
  fps_span_element.textContent = fpsString +
    ' ' +
    '[' +
    '█'.repeat(fps_rounded) +
    ' '.repeat(Math.max(0, 60 - fps_rounded)) +
    ']'
}