import { InitBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { InitShaderProgram } from "./init-shader-program.js";
import { LoadTexture } from "./load-texture.js";

// OpenType proof of concept via 2d canvas.
{
  // Get the ttfs and use opentype to parse.
  const jetbrains_mono_url = 'jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf';
  let jetbrains_mono_opentype = null
  opentype.load(jetbrains_mono_url, (err, font) => { jetbrains_mono_opentype = font });
  // Wait until jetbrains_mono_opentype is loaded
  while (jetbrains_mono_opentype === null) { await new Promise(resolve => setTimeout(resolve, 100)); }
  // Get path and iterate through commands.
  const hhh = jetbrains_mono_opentype.charToGlyph('G')
  const h_path = hhh.getPath()
  // Get debug 2d canvas debug visualization.
  const debug_ctx = DebugCanvasInit()
  // Set transform to normalize and center the glyph
  {
    const glyph_bb = h_path.getBoundingBox()
    const x1 = glyph_bb.x1
    const y1 = glyph_bb.y1
    const x2 = glyph_bb.x2
    const y2 = glyph_bb.y2
    const canvas = debug_ctx.canvas;
    const scale = Math.min(canvas.width / (x2 - x1), canvas.height / (y2 - y1));
    const translateX = (canvas.width - (x2 - x1) * scale) / 2 - x1 * scale;
    const translateY = (canvas.height - (y2 - y1) * scale) / 2 - y1 * scale;
    debug_ctx.setTransform(scale, 0, 0, scale, translateX, translateY);
  }
  // Draw path manually to 2d canvas.
  debug_ctx.beginPath()
  h_path.commands.forEach((command) => {
    switch (command.type) {
      case 'M':
        debug_ctx.moveTo(command.x, command.y)
        break;
      case 'L':
        debug_ctx.lineTo(command.x, command.y)
        break;
      case 'Q': // We forgo bezier curves for this proof of concept.
        debug_ctx.lineTo(command.x1, command.y1)
        debug_ctx.lineTo(command.x, command.y)
        break;
      case 'C': // We forgo bezier curves for this proof of concept.
        debug_ctx.lineTo(command.x1, command.y1)
        debug_ctx.lineTo(command.x2, command.y2)
        debug_ctx.lineTo(command.x, command.y)
        break;
      case 'Z':
        debug_ctx.fill()
        break;
      default:
        console.error("Unhandled opentype command: " + command.type)
    }
  })
  // End of proof of concept.
}

async function RoomMain() {
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
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
      uSampler: gl.getUniformLocation(shaderProgram, "uSampler"),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = InitBuffers(gl);

  // Load texture
  const textures = [
    LoadTexture(gl, "funny.webp"), // Front.
    LoadTexture(gl, "funny.webp"), // Back.
    LoadTexture(gl, "funny.webp"), // Top.
    LoadTexture(gl, "funny.webp"), // Bottom.
    LoadTexture(gl, "funny.webp"), // Right.
    LoadTexture(gl, "funny.webp"), // Left.
  ]

  // Draw the scene repeatedly
  function RenderScene(now) {
    const cube_rotation = now / 1000;
    DrawScene(gl, programInfo, buffers, textures, cube_rotation);

    requestAnimationFrame(RenderScene);
  }
  requestAnimationFrame(RenderScene);
}
RoomMain()

/** Returns WebGL context. */
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