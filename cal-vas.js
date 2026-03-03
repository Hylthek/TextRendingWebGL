import { CanvasInit } from './canvas-init.js'
import { InitShaderProgram, GetProgramInfo } from "./init-shader-program.js";
import { DrawScene } from "./draw-scene.js";
import { LoadImageTexture } from "./load-texture.js";
import { PrintCenterPixelInt32 } from './shader-debug.js'
import { ViewControl } from './view-control.js'
import { FontToTexture } from './load-font-texture.js';
import { GetJsConstValues } from './get-js-consts.js';
import { TextureFromString, gTextureWidth, gTextureHeight, InitTexture } from './load-char-texture.js';
import { LoadHBFont } from './harfbuzz-helper.js'; // Import helper
import { VertexAttributeHandler } from './vertex-attribute-handler.js'

async function CalvasMain() {
  // Init WebGL canvas.
  const gl = CanvasInit(0.5)
  if (!gl) { console.error("WebGL not supported"); return; }
  gl.clearColor(255, 255, 255, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Load attribute handler object.
  const attrib_handler = new VertexAttributeHandler(gl);
  {
    // Init WebGL buffers.
    attrib_handler.InitBuffers(4 * 40, 2 * 40);
    attrib_handler.InitMiscAttrib("texture_coord", 2);
    attrib_handler.InitMiscAttrib("canvas_coord", 2);
    attrib_handler.InitMiscAttrib("face_index", 1);

    // Build first panel.
    for (let i = 0; i < 6; i++) {
      attrib_handler.AddPosition({ x: -1, y: 1 - i, z: 0 })
      attrib_handler.AddMiscAttrib("texture_coord", [0, 1])
      attrib_handler.AddMiscAttrib("canvas_coord", [0, 0 - 1000 * i])
      attrib_handler.AddMiscAttrib("face_index", [0])

      attrib_handler.AddPosition({ x: -1, y: 0 - i, z: 0 })
      attrib_handler.AddMiscAttrib("texture_coord", [0, 0])
      attrib_handler.AddMiscAttrib("canvas_coord", [0, -1000 - 1000 * i])
      attrib_handler.AddMiscAttrib("face_index", [0])

      attrib_handler.AddPosition({ x: 0, y: 1 - i, z: 0 })
      attrib_handler.AddMiscAttrib("texture_coord", [1, 1])
      attrib_handler.AddMiscAttrib("canvas_coord", [1000, 0 - 1000 * i])
      attrib_handler.AddMiscAttrib("face_index", [0])

      attrib_handler.AddTriangle()

      attrib_handler.AddPosition({ x: 0, y: 0 - i, z: 0 })
      attrib_handler.AddMiscAttrib("texture_coord", [1, 0])
      attrib_handler.AddMiscAttrib("canvas_coord", [1000, -1000 - 1000 * i])
      attrib_handler.AddMiscAttrib("face_index", [0])

      attrib_handler.AddTriangle()
    }
    
    // Build second panel.
    for (let i = 0; i < 6; i++) {
      attrib_handler.AddPosition({ x: 0, y: 1 - i, z: 0 })
      attrib_handler.AddMiscAttrib("texture_coord", [0, 1])
      attrib_handler.AddMiscAttrib("canvas_coord", [0, 0 - 1000 * i])
      attrib_handler.AddMiscAttrib("face_index", [1])

      attrib_handler.AddPosition({ x: 0, y: 0 - i, z: 0 })
      attrib_handler.AddMiscAttrib("texture_coord", [0, 0])
      attrib_handler.AddMiscAttrib("canvas_coord", [0, -1000 - 1000 * i])
      attrib_handler.AddMiscAttrib("face_index", [1])

      attrib_handler.AddPosition({ x: 1, y: 1 - i, z: 0 })
      attrib_handler.AddMiscAttrib("texture_coord", [1, 1])
      attrib_handler.AddMiscAttrib("canvas_coord", [1000, 0 - 1000 * i])
      attrib_handler.AddMiscAttrib("face_index", [1])

      attrib_handler.AddTriangle()

      attrib_handler.AddPosition({ x: 1, y: 0 - i, z: 0 })
      attrib_handler.AddMiscAttrib("texture_coord", [1, 0])
      attrib_handler.AddMiscAttrib("canvas_coord", [1000, -1000 - 1000 * i])
      attrib_handler.AddMiscAttrib("face_index", [1])

      attrib_handler.AddTriangle()
    }
  }

  // Load a basic image texture.
  const image_texture = LoadImageTexture(gl, "wooden-crate.webp")

  // Load War and Peace.
  const war_and_peace_txt = await (await fetch("WarAndPeace.txt")).text()
  const war_and_peace_trunc_txt = '\n' + war_and_peace_txt.slice(0);

  // Load font objects.
  const font_data_jetbrains_mono = await LoadHBFont('jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf')
  const font_data_inter = await LoadHBFont('inter_ttf/Inter_18pt-Regular.ttf')
  const active_font = font_data_inter;

  // Load a font's entire set of glyph paths as a data texture.
  const {
    texture: font_data_texture,
    dimensions: font_data_texture_dims
  } = await FontToTexture(gl, active_font.openTypeFont)

  // Init char texture.
  InitTexture(gl);

  // Get JS const values.
  const glyph_data_texture_dims = {
    width: gTextureWidth,
    height: gTextureHeight
  }
  const js_consts = GetJsConstValues(gl, font_data_texture_dims, glyph_data_texture_dims, active_font.openTypeFont, war_and_peace_trunc_txt.length);
  // Compile program and get pointers.
  const shaderProgram = await InitShaderProgram(gl, "./vertex.glsl", "./fragment.glsl", js_consts);
  const programInfo = GetProgramInfo(gl, shaderProgram);
  gl.useProgram(shaderProgram)

  // Link attributes in program.
  attrib_handler.LoadPositionAttrib(programInfo.attribLocations.vertexPosition)
  attrib_handler.LoadMiscAttrib('texture_coord', 2, programInfo.attribLocations.textureCoord)
  attrib_handler.LoadMiscAttrib('canvas_coord', 2, programInfo.attribLocations.canvasCoord)
  attrib_handler.LoadMiscAttrib('face_index', 1, programInfo.attribLocations.faceIndex)

  // Init panning, zooming, etc.
  const view = new ViewControl();
  setInterval(() => view.UpdateHtml(), 100);

  // Get fps html span element.
  const fps_span_element = document.getElementById('fps');

  // Load a string into a texture.
  const px_per_em = 20;
  window.curr_glyph_data_texture = TextureFromString(gl, "\nLOADING WAR AND PEACE...", active_font, px_per_em, programInfo);

  // Set view options.
  gl.uniform1i(gl.getUniformLocation(programInfo.program, "uRenderTextureFetchAmountMax"), 3000);
  setInterval(() => UpdateRenderOptions(gl, programInfo), 100);

  // Draw the scene repeatedly
  function RenderScene(now) {
    if (window.curr_glyph_data_texture)
      DrawScene(gl, programInfo, attrib_handler, view, image_texture, font_data_texture, window.curr_glyph_data_texture);
    // PrintCenterPixelInt32(gl, 8);
    requestAnimationFrame(RenderScene);
    UpdateFps(now, fps_span_element);
  }
  requestAnimationFrame(RenderScene);
  // setInterval(LoadScrollingText, 1000 / 30, ...[gl, war_and_peace_trunc_txt, active_font, px_per_em, programInfo]);
  LoadScrollingText(gl, war_and_peace_trunc_txt, active_font, px_per_em, programInfo);
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
  const fps_bar_string = ' ' + '[' + '='.repeat(fps_rounded | 0) + '_'.repeat(70 - (fps_rounded | 0)) + ']'
  fps_span_element.textContent = fpsString + fps_bar_string;
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 */
function UpdateRenderOptions(gl, program_info) {
  const render_control_points_dom = document.getElementById('enable-render-control-points')
  const render_texture_fetches_dom = document.getElementById('enable-render-texture-fetches')
  const render_control_points = render_control_points_dom.checked;
  const render_texture_fetches = render_texture_fetches_dom.checked;
  const render_texture_fetch_amount_max_dom = document.getElementById('texture-amount-max')
  const render_texture_fetch_amount_max = parseInt(render_texture_fetch_amount_max_dom.value);

  gl.uniform1i(gl.getUniformLocation(program_info.program, "uRenderTextureFetchAmountMax"), render_texture_fetch_amount_max);
  gl.uniform1i(gl.getUniformLocation(program_info.program, "uRenderControlPoints"), render_control_points ? 1 : 0);
  gl.uniform1i(gl.getUniformLocation(program_info.program, "uRenderTextureFetchAmount"), render_texture_fetches ? 1 : 0);
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {String} string_in 
 */
function LoadScrollingText(gl, string_in, font, px_per_em, programInfo) {
  function UpdateText() {
    if (!window.load_scrolling_text_start_time_ms)
      window.load_scrolling_text_start_time_ms = performance.now()
    const now_since_start = performance.now() - window.load_scrolling_text_start_time_ms;
    const chars_per_sec = 1500;
    const num_chars = Math.min(now_since_start / 1000 * chars_per_sec, string_in.length - 1);
    const string_sub = string_in.slice(0, num_chars)
    try {
      const texture = TextureFromString(gl, string_sub, font, px_per_em, programInfo);
      window.curr_glyph_data_texture = texture;
    } catch (error) {
      // Do nothing, empty strings are fine..
    }
    if (num_chars < string_in.length - 1)
      setTimeout(() => UpdateText(), 10)
  }
  UpdateText()
}