/**
 * 
 * @param {WebGL2RenderingContext} gl 
 */
function PrintCenterPixelInt32(gl, num_to_print) {
  // Get shader debug info.
  const pixel = new Uint8Array(4 * num_to_print);
  const gl_w_2_i = Math.floor(gl.canvas.width / 2);
  const gl_h_2_i = Math.floor(gl.canvas.height / 2);
  gl.readPixels(gl_w_2_i, gl_h_2_i, num_to_print, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  // Convert pixel to int32.
  let pixel_int32 = new Int32Array(num_to_print);
  for (let i = 0; i < num_to_print; i++) {
    pixel_int32[i] = ((pixel[4 * i] << 24 >>> 0) + (pixel[4 * i + 1] << 16) + (pixel[4 * i + 2] << 8) + (pixel[4 * i + 3] << 0)) >> 0;
  }
  // Print.
  const strings = Array.from(pixel_int32).map(num => (num / 1000).toString().padStart(0, " "));
  if (performance.now() > next_log_time) {
    console.log("print_arr[] = {", ...strings.slice(0, 16), "}");
    next_log_time = performance.now() + 100;
  }
}

let next_log_time = 0

export { PrintCenterPixelInt32 }