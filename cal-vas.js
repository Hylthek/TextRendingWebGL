import { InitBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { InitShaderProgram } from "./init-shader-program.js";
import { LoadImageTexture, LoadQuadTexture } from "./load-texture.js";
import { OpenTypeDemo, StringToCommands, CommandsToQuadArray} from './opentype-demo.js'
import { CanvasInit, DebugCanvasInit } from './canvas-init.js'
import { PrintCenterPixelInt32 } from './shader-debug.js'
import { ViewControl } from './view-control.js'

// OpenType proof of concept via 2d canvas.
const debug_ctx = DebugCanvasInit()
// await OpenTypeDemo(debug_ctx)

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
      uGlyphBuffer: gl.getUniformBlockIndex(shaderProgram, "uGlyphs"),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = InitBuffers(gl);

  // Load texture
  const image_textures = [
    LoadImageTexture(gl, "wooden-crate.webp"), // Front.
  ]

  // Fetch War and Peace.
  const war_and_peace_txt = await (await fetch("WarAndPeace.txt")).text()
  const text_length = 480;
  const war_and_peace_trunc_txt = war_and_peace_txt.slice(0, text_length);

  // Turn sample text into arrays of OpenType path commands.
  const commands_per_face = [
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

  // Init panning, zooming, etc.
  const view = new ViewControl();

  // GL Setup.
  // Program
  gl.useProgram(programInfo.program);
  // Tex0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, image_textures[0]);
  // Tex1
  gl.uniform1i(programInfo.uniformLocations.uQuadTexture, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, quad_data_texture);
  // Consts
  gl.uniform1i(programInfo.uniformLocations.uScreenWidthPx, gl.canvas.width);
  gl.uniform1i(programInfo.uniformLocations.uScreenHeightPx, gl.canvas.height);
  // Bind UBO.
  gl.uniformBlockBinding(
    programInfo.program,
    programInfo.uniformLocations.uGlyphBuffer,
    0
  );

  // Test UBO data
  const data = new ArrayBuffer(3 * 4);
  const float_view = new Float32Array(data);
  const int_view = new Int32Array(data);
  float_view[0] = 1;
  float_view[1] = 2;
  int_view[2] = 3;

  gl.bindBuffer(gl.UNIFORM_BUFFER, buffers.glyphUniform);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);

  // Draw the scene repeatedly
  function RenderScene(now) {
    const cube_rotation = now / 1000;
    DrawScene(gl, programInfo, buffers, image_textures, quad_data_texture, view);
    PrintCenterPixelInt32(gl);
    requestAnimationFrame(RenderScene);
  }

  requestAnimationFrame(RenderScene);
}
CalvasMain()
