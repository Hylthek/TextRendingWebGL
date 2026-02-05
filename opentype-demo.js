/**
 * @param {CanvasRenderingContext2D} ctx
 */
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

  function render(now) {
    ctx.reset()
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Get path.
    // const my_char = String.fromCharCode(now / 100 % (2 ** 16))
    const my_char = String.fromCharCode(now / 300 % (127 - 32) + 32)
    // const my_char = String.fromCharCode(0x2588)
    // const my_char = 'O'
    const glyph = inter_opentype.charToGlyph(my_char)
    const glyph_path = glyph.path // Gets raw, unscaled path object.

    // Set transform to center.
    const scale = 200 / inter_opentype.unitsPerEm
    const translateX = ctx.canvas.width * 0.25
    const translateY = ctx.canvas.height * 0.75
    ctx.setTransform(scale, 0, 0, -scale, translateX, translateY); // Flip vertically.
    ctx.lineWidth = 2 / scale

    // Draw path manually to 2d canvas. Turn everything into quad curves and manually save previous locations.
    const desequentialized_commands = DesequentializeCommands(glyph_path.commands)
    const scrambled_commands = shuffle(desequentialized_commands)
    ctx.beginPath()
    scrambled_commands.forEach((command) => {
      ctx.moveTo(command.x0, command.y0)
      ctx.quadraticCurveTo(command.x1, command.y1, command.x, command.y)
    })
    ctx.stroke()
    // Draw BB.
    const bbox = glyph.getBoundingBox();
    ctx.strokeStyle = "red";
    ctx.strokeRect(bbox.x1, bbox.y1, bbox.x2 - bbox.x1, bbox.y2 - bbox.y1);

    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
  // End of proof of concept.
}

class MyQuadCommand {
  constructor(quad_command) {
    this.x0 = quad_command.x0;
    this.y0 = quad_command.y0;
    this.x1 = quad_command.x1;
    this.y1 = quad_command.y1;
    this.x = quad_command.x;
    this.y = quad_command.y;
    if (this.x0 === undefined || this.y0 === undefined || this.x1 === undefined || this.y1 === undefined || this.x === undefined || this.y === undefined)
      console.error("Constructor failed.", this);
  }
}

/**
 * Creates an array of MyQuadCommands that draws the text provided.  
 * @param {String} string_in String to draw.
 * @param {String} font_url Url of the ttf file.
 * @param {number} x x of the top-left of the string block.
 * @param {number} y y of the top-left of the string block.
 * @returns {Promise<Array<MyQuadCommand>>}
 */
async function StringToCommands(string_in, font_url, x = 0, y = 0, font_size = 72) {
  // Get the ttf and wait until opentype font is loaded.
  let font_opentype = null
  opentype.load(font_url, (err, font) => { font_opentype = font });
  while (font_opentype === null) { await new Promise(resolve => setTimeout(resolve, 100)); }

  // Split string into separate lines.
  const lines = string_in.split('\n');
  // Get path for each line.
  // This function works on canvas (x, y) conventions,
  // whereas the current function works on standard (x, y) convention.
  // Negate y parameter and shift down by one line.
  const line_paths = lines.map(
    (line, idx) => font_opentype.getPath(line, x, -(y - (idx + 1) * font_size), font_size)
  )
  // Get combined commands array.
  const string_commands = line_paths.map(path => path.commands).flat();
  // font.getPath() flips text vertically, flip it back.
  const string_commands_flipped = string_commands.map(command => {
    const output = structuredClone(command)
    output.y = -command.y;
    output.y1 = -command.y1;
    output.y2 = -command.y0;
    return output
  })

  // Desequentialize the commands.
  const desequentialized_string_path = DesequentializeCommands(string_commands_flipped);

  return desequentialized_string_path;
}

function shuffle(array) {
  let array_out = array.slice() // Copy array.

  let currentIndex = array_out.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array_out[currentIndex], array_out[randomIndex]] = [array_out[randomIndex], array_out[currentIndex]];
  }

  return array_out
}

/**
 * Turns an array of OpenType path commands to a version that can be accessed randomly.
 * @param {Array<GlyphPathCommand>} commands
 * @returns {Array<MyQuadCommand>}
 */
function DesequentializeCommands(commands) {
  let commands_out = commands.slice() // Copy array.
  let prev_point = { x: null, y: null }
  let idx_to_remove = []
  commands_out.forEach((command, index) => {
    switch (command.type) {
      case 'M':
        prev_point.x = command.x
        prev_point.y = command.y
        idx_to_remove.push(index)
        break;
      case 'L':
        command.x0 = prev_point.x
        command.y0 = prev_point.y
        const midpoint_x = (prev_point.x + command.x) / 2
        const midpoint_y = (prev_point.y + command.y) / 2
        command.x1 = midpoint_x
        command.y1 = midpoint_y
        command.type = 'Q'
        prev_point.x = command.x
        prev_point.y = command.y
        break;
      case 'Q':
        command.x0 = prev_point.x
        command.y0 = prev_point.y
        prev_point.x = command.x
        prev_point.y = command.y
        break;
      case 'C':
        command.x0 = prev_point.x
        command.y0 = prev_point.y
        const q_cp = QuadApproxCP(command)
        command.x1 = q_cp.x
        command.y1 = q_cp.y
        command.x2 = undefined
        command.y2 = undefined
        command.type = 'Q'
        prev_point.x = command.x
        prev_point.y = command.y
        break;
      case 'Z':
        prev_point = { x: null, y: null }
        idx_to_remove.push(index)
        break;
    }
  })
  // Remove M and Z commands.
  idx_to_remove.reverse()
  idx_to_remove.forEach((idx) => {
    commands_out.splice(idx, 1)
  })

  return commands_out.map(command => new MyQuadCommand(command))
}

/**
 * Approximate a cubic bezier with a quadratic bezier
 * @param cubic objects with x0,x1,x2,x & y0,y1,y2,y defined. 
 * @returns The quadratic curve's control point as an object with x and y.
 */
function QuadApproxCP(cubic) {
  return {
    x: -0.25 * (cubic.x0 + cubic.x) + 0.75 * (cubic.x1 + cubic.x2),
    y: -0.25 * (cubic.y0 + cubic.y) + 0.75 * (cubic.y1 + cubic.y2),
  }
}

/**
 * Turns an array of QuadCurve objects into a buffer of FLOATs.
 * @param {Array<MyQuadCommand>} commands
 * @returns {Array<Number>} An array whose length is a multiple of 4.
 */
function CommandsToQuadArray(commands, metadata1 = 0, metadata2 = 0) {
  const output = commands.map(command =>
    [
      command.x0, command.y0, command.x1, command.y1,
      command.x, command.y, metadata1, metadata2,
    ]
  )
  return output.flat()
}

export { OpenTypeDemo, StringToCommands, MyQuadCommand, CommandsToQuadArray }