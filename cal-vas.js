import { CanvasInit, DebugCanvasInit } from './canvas-init.js'
import { InitShaderProgram } from "./init-shader-program.js";
import { InitVertexBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { LoadImageTexture, LoadQuadTexture } from "./load-texture.js";
import { StringToCommands, CommandsToQuadArray } from './opentype-demo.js'
import { PrintCenterPixelInt32 } from './shader-debug.js'
import { ViewControl } from './view-control.js'

async function CalvasMain() {
  const gl = CanvasInit()
  if (!gl) { console.error("WebGL not supported"); return; }
  gl.clearColor(255, 255, 255, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT);

  const shaderProgram = await InitShaderProgram(gl, "./vertex.glsl", "./fragment.glsl")

  const programInfo = GetProgramInfo(gl, shaderProgram);

  const vertex_buffers = InitVertexBuffers(gl);

  const glyph_buffer = InitGlyphBuffer(gl);

  const image_texture = LoadImageTexture(gl, "wooden-crate.webp")

  const text_length = 480;
  const war_and_peace_txt = await (await fetch("WarAndPeace.txt")).text()
  const war_and_peace_trunc_txt = war_and_peace_txt.slice(0, text_length);

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
  const quad_data_texture = LoadQuadTexture(gl, quad_jagged_array);

  // Init panning, zooming, etc.
  const view = new ViewControl();

  // GL one-time Setup.
  // Program
  gl.useProgram(programInfo.program);
  // Tex0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, image_texture);
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
  const data = new ArrayBuffer(100 * 16);
  const int_view = new Int32Array(data)
  for (let i = 0; i < int_view.length; i++) {
    int_view[i] = i;
  }

  gl.bindBuffer(gl.UNIFORM_BUFFER, glyph_buffer);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);

  // Draw the scene repeatedly
  function RenderScene(now) {
    DrawScene(gl, programInfo, vertex_buffers, image_texture, quad_data_texture, view);
    PrintCenterPixelInt32(gl);
    requestAnimationFrame(RenderScene);
  }
  requestAnimationFrame(RenderScene);
}
CalvasMain()

// Look up which attributes our shader program is using for aVertexPosition, aTextureCoord and also look up uniform locations.
// IE configure inputs into glsl script.
function GetProgramInfo(gl, shaderProgram) {
  return {
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
  }
}

/**
 * @param {WebGL2RenderingContext} gl
 */
function InitGlyphBuffer(gl) {
  const glyph_buffer = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, glyph_buffer);

  const uniform_block_size = 100 * 16; // 100 uints.
  gl.bufferData(
    gl.UNIFORM_BUFFER,
    uniform_block_size,
    gl.DYNAMIC_DRAW
  )

  const bindingPoint = 0;
  gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, glyph_buffer)

  return glyph_buffer;
}