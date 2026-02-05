/** 
 * @returns {WebGL2RenderingContext} WebGL context.
 */
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

export {CanvasInit, DebugCanvasInit}