import { CanvasInit } from './canvas-init.js'
import { InitShaderProgram, GetProgramInfo } from "./init-shader-program.js";
import { InitVertexBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { LoadImageTexture } from "./load-texture.js";
import { PrintCenterPixelInt32 } from './shader-debug.js'
import { ViewControl } from './view-control.js'
import { InitGlyphBuffer } from './ubo.js';
import { FontToTexture } from './glyph-path-texture.js';
import { LoadUboFromString, ArrayGlyphLayout } from './load-ubo.js';
import { GetFont } from './opentype-demo.js';

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
  // Load font object.
  const jetbrains_mono = await GetFont('jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf')
  // Load a font's entire glyph-set as a data texture.
  const font_data_texture = await FontToTexture(gl, jetbrains_mono)
  // Init a uniform buffer for dynamic usage.
  const glyph_buffer = InitGlyphBuffer(gl);
  // Load a string into the uniform buffer.
  // LoadUboFromString(gl, glyph_buffer, "HelloWorld!\n-JetBrainsMono", jetbrains_mono, 72);
  // Init panning, zooming, etc.
  const view = new ViewControl();

  // Test UBO data
  const glyph_layouts = new ArrayGlyphLayout(100)
  for (let i = 0; i < 2; i++) {
    const glyph_layout = {
      pos: { x: i+0.01, y: i+0.02 },
      opentype_index: i,
      size: i *100
    }
    glyph_layouts.set(i, glyph_layout);
  }
  gl.bindBuffer(gl.UNIFORM_BUFFER, glyph_buffer);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, glyph_layouts.array);


  // Draw the scene repeatedly
  function RenderScene(now) {
    DrawScene(gl, programInfo, vertex_buffers, image_texture, font_data_texture, view);
    PrintCenterPixelInt32(gl);
    requestAnimationFrame(RenderScene);
  }
  requestAnimationFrame(RenderScene);
}
CalvasMain()