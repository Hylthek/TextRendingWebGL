import { CanvasInit } from './canvas-init.js'
import { InitShaderProgram, GetProgramInfo } from "./init-shader-program.js";
import { InitVertexBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { LoadImageTexture } from "./load-texture.js";
import { PrintCenterPixelInt32 } from './shader-debug.js'
import { ViewControl } from './view-control.js'
import { InitGlyphBuffer } from './ubo.js';
import { FontToTexture } from './glyph-path-texture.js';
import { LoadUboFromString } from './load-ubo.js';

async function CalvasMain() {
  const gl = CanvasInit()
  if (!gl) { console.error("WebGL not supported"); return; }
  gl.clearColor(255, 255, 255, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Compile program and get pointers.
  const shaderProgram = await InitShaderProgram(gl, "./vertex.glsl", "./fragment.glsl")
  const programInfo = GetProgramInfo(gl, shaderProgram);
  // Load static vertex attribute data.
  const vertex_buffers = InitVertexBuffers(gl);
  // Load a basic image texture.
  const image_texture = LoadImageTexture(gl, "wooden-crate.webp")
  // Load War and Peace.
  const text_length = 480;
  const war_and_peace_txt = await (await fetch("WarAndPeace.txt")).text()
  const war_and_peace_trunc_txt = war_and_peace_txt.slice(0, text_length);
  // Load a font's entire glyph-set as a data texture.
  const font_data_texture = await FontToTexture(gl, 'jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf')
  // Init a uniform buffer for dynamic usage.
  const glyph_buffer = InitGlyphBuffer(gl);
  // Load a string into the uniform buffer.
  LoadUboFromString(gl, glyph_buffer, "HelloWorld!\n-JetBrainsMono");
  // Init panning, zooming, etc.
  const view = new ViewControl();

  // Test UBO data
  const data = new ArrayBuffer(100 * 16);
  const int_view = new Int32Array(data);
  const float_view = new Float32Array(data);
  for (let i = 0; i < int_view.length; i += 4) {
    float_view[i + 0] = i + 0;
    float_view[i + 1] = i + 1;
    int_view[i + 2] = i + 2;
    int_view[i + 3] = i + 3;
  }
  gl.bindBuffer(gl.UNIFORM_BUFFER, glyph_buffer);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);

  // Draw the scene repeatedly
  function RenderScene(now) {
    DrawScene(gl, programInfo, vertex_buffers, image_texture, font_data_texture, view);
    PrintCenterPixelInt32(gl);
    requestAnimationFrame(RenderScene);
  }
  requestAnimationFrame(RenderScene);
}
CalvasMain()