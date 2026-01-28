import { InitBuffers } from "./init-buffers.js";
import { DrawScene } from "./draw-scene.js";
import { InitShaderProgram } from "./init-shader-program.js";
import { LoadTexture } from "./load-texture.js";

// OpenType proof of concept via 2d canvas.
{
  // Get the ttfs and use opentype to parse.
  const jetbrains_mono_url = 'jetbrainsmono_ttf/JetBrainsMonoNL-Regular.ttf';
  const inter_url = 'inter_ttf/Inter_18pt-Regular.ttf';
  let jetbrains_mono_opentype = null
  let inter_opentype = null
  opentype.load(jetbrains_mono_url, (err, font) => { jetbrains_mono_opentype = font });
  opentype.load(inter_url, (err, font) => { inter_opentype = font });
  // Wait until opentype fonts are loaded
  while (jetbrains_mono_opentype === null) { await new Promise(resolve => setTimeout(resolve, 100)); }
  while (inter_opentype === null) { await new Promise(resolve => setTimeout(resolve, 100)); }
  // Get debug 2d canvas debug visualization.
  /**@type {CanvasRenderingContext2D} */
  const debug_ctx = DebugCanvasInit()
  function render(now) {
    debug_ctx.reset()
    debug_ctx.clearRect(0, 0, debug_ctx.canvas.width, debug_ctx.canvas.height);
    // Get path and iterate through commands.
    // const my_char = String.fromCharCode(now / 100 % (2 ** 16))
    const my_char = String.fromCharCode(now / 200 % (127 - 32) + 32)
    // const my_char = String.fromCharCode(0x2588)
    const glyph = inter_opentype.charToGlyph(my_char)
    // console.log(my_char, my_char.charCodeAt(0))
    const glyph_path = glyph.path // Gets raw, unscaled path object.
    // Set transform to center and normalize the char with id 0x2588.
    const scale = 200 / inter_opentype.unitsPerEm
    const translateX = debug_ctx.canvas.width / 2 - (glyph_path.getBoundingBox().x1 + glyph_path.getBoundingBox().x2) / 2 * scale
    const translateY = debug_ctx.canvas.height / 2 + (glyph_path.getBoundingBox().y1 + glyph_path.getBoundingBox().y2) / 2 * scale
    debug_ctx.setTransform(scale, 0, 0, -scale, translateX, translateY); // Flip vertically.
    debug_ctx.lineWidth = 2 / scale
    // Draw path manually to 2d canvas.
    debug_ctx.beginPath()
    glyph_path.commands.forEach((command) => {
      switch (command.type) {
        case 'M':
          debug_ctx.moveTo(command.x, command.y)
          break;
        case 'L':
          debug_ctx.lineTo(command.x, command.y)
          break;
        case 'Q': // We forgo bezier curves for this proof of concept.
          debug_ctx.quadraticCurveTo(command.x1, command.y1, command.x, command.y)
          break;
        case 'C': // We forgo bezier curves for this proof of concept.
          debug_ctx.bezierCurveTo(command.x1, command.y1, command.x2, command.y2, command.x, command.y)
          console.warn("Using cubic Bezier curve.")
          break;
        case 'Z':
          debug_ctx.stroke()
          break;
        default:
          console.error("Unhandled opentype command: " + command.type)
      }
    })
    // Draw BB.
    const bbox = glyph.getBoundingBox();
    debug_ctx.strokeStyle = "red";
    debug_ctx.strokeRect(bbox.x1, bbox.y1, bbox.x2 - bbox.x1, bbox.y2 - bbox.y1);
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
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