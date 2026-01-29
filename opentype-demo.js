async function OpenTypeDemo(ctx) {
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
  function render(now) {
    ctx.reset()
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // Get path and iterate through commands.
    // const my_char = String.fromCharCode(now / 100 % (2 ** 16))
    const my_char = String.fromCharCode(now / 200 % (127 - 32) + 32)
    // const my_char = String.fromCharCode(0x2588)
    const glyph = inter_opentype.charToGlyph(my_char)
    // console.log(my_char, my_char.charCodeAt(0))
    const glyph_path = glyph.path // Gets raw, unscaled path object.
    // Set transform to center and normalize the char with id 0x2588.
    const scale = 200 / inter_opentype.unitsPerEm
    const translateX = ctx.canvas.width / 2 - (glyph_path.getBoundingBox().x1 + glyph_path.getBoundingBox().x2) / 2 * scale
    const translateY = ctx.canvas.height / 2 + (glyph_path.getBoundingBox().y1 + glyph_path.getBoundingBox().y2) / 2 * scale
    ctx.setTransform(scale, 0, 0, -scale, translateX, translateY); // Flip vertically.
    ctx.lineWidth = 2 / scale
    // Draw path manually to 2d canvas.
    ctx.beginPath()
    glyph_path.commands.forEach((command) => {
      switch (command.type) {
        case 'M':
          ctx.moveTo(command.x, command.y)
          break;
        case 'L':
          ctx.lineTo(command.x, command.y)
          break;
        case 'Q': // We forgo bezier curves for this proof of concept.
          ctx.quadraticCurveTo(command.x1, command.y1, command.x, command.y)
          break;
        case 'C': // We forgo bezier curves for this proof of concept.
          ctx.bezierCurveTo(command.x1, command.y1, command.x2, command.y2, command.x, command.y)
          console.warn("Using cubic Bezier curve.")
          break;
        case 'Z':
          ctx.stroke()
          break;
        default:
          console.error("Unhandled opentype command: " + command.type)
      }
    })
    // Draw BB.
    const bbox = glyph.getBoundingBox();
    ctx.strokeStyle = "red";
    ctx.strokeRect(bbox.x1, bbox.y1, bbox.x2 - bbox.x1, bbox.y2 - bbox.y1);
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
  // End of proof of concept.
}

export { OpenTypeDemo }