/** 
 * @returns {WebGL2RenderingContext} WebGL context.
 */
function CanvasInit(resolution_scalar = 1) {
  if (resolution_scalar > 5)
    throw new Error("Resolution should not be too high");
  const canvas = document.getElementById("cal-vas")
  canvas.width = canvas.clientWidth * resolution_scalar; // Resolution
  canvas.height = canvas.clientHeight * resolution_scalar; // Resolution
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

export { CanvasInit, DebugCanvasInit }