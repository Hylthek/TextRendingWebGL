#version 300 es
precision highp float;

// uv vectors for textures.
in highp vec2 vImageTextureCoord;
in highp vec2 vCanvasCoord;

// Is constant across a WebGL element.
flat in int fFaceIndex;

// Texture from a png image.
uniform sampler2D uImageTexture;

// A 2D texture for storing quadratic curve data.
uniform sampler2D uQuadTexture;

// Builtin output.
out vec4 fragColor;

// Consts from JS.
uniform int uScreenWidthPx;
uniform int uScreenHeightPx;

// Number that is close to 0 to signify div by 0 edge cases.
const float kSmallNumberCutoff = 0.0001f;

// A multiplier for anti-aliasing effect.
const float anti_aliasing_mult = 1.0f;

// Data that tells the shader what char to draw and where.
struct GlyphLayout {
  vec2 pos;
  int opentype_index;
  int size;
};

// An array of GlyphLayouts.
layout(std140) uniform uGlyphs {
  GlyphLayout glyph_array[100];
};

// Draws pixel data onto the screen at certain spots
// for the CPU to grab and parse. Called at end of main().
const int debug_array_length = 1000; // Must match JS variable of same name.
float print_arr[debug_array_length];
void PrintDebugOutput() {
  // Draw a data-rich line at the center of the screen, extending right.
  float w_2 = float(uScreenWidthPx / 2) + 0.5f; // Pixel must have coords ending in .5
  float h_2 = float(uScreenHeightPx / 2) + 0.5f;
  if(gl_FragCoord.x >= w_2 && gl_FragCoord.x < w_2 + float(debug_array_length) && gl_FragCoord.y == h_2) {
    // Get current pixel in line.
    int curr_pixel = int(gl_FragCoord.x - w_2);
    // Convert print_arr:float to vec4.
    ivec4 nums;
    nums.r = (int(print_arr[curr_pixel] * 1000.0f) >> 24) & 0xFF;
    nums.g = (int(print_arr[curr_pixel] * 1000.0f) >> 16) & 0xFF;
    nums.b = (int(print_arr[curr_pixel] * 1000.0f) >> 8) & 0xFF;
    nums.a = int(print_arr[curr_pixel] * 1000.0f) & 0xFF;
    // Then to floats.
    vec4 nums_f = vec4(float(nums.r) / 255.0f, float(nums.g) / 255.0f, float(nums.b) / 255.0f, float(nums.a) / 255.0f);
    fragColor = nums_f;
  }
}

// Find if a quadratic equation is actually a line.
bool QuadraticIsLinear(float a, float b, float c) {
  return abs(a) < kSmallNumberCutoff;
}

// Find if a quadratic equation is actually a horizontal line.
bool QuadraticIsHorizontalLinear(float a, float b, float c) {
  return QuadraticIsLinear(a, b, c) && abs(b) < kSmallNumberCutoff;
}

// Find the number of solutions in a quadratic equation.
// Note, 1 solution with multiplicity 2 is equivalent to 0 solutions.
int QuadraticNumSols(float a, float b, float c) {
  float discriminant = b * b - 4.0f * a * c;
  if(discriminant <= 0.0f || QuadraticIsHorizontalLinear(a, b, c))
    return 0;
  if(QuadraticIsLinear(a, b, c))
    return 1;
  return 2;
}

// Solve a quadratic equation.
// lesser_sol used for plus or minus in quadratic equation.
// Doesn't handle a == 0 case.
float SolveQuadratic(float a, float b, float c, bool lesser_sol) {
  if(lesser_sol)
    return (-b - sqrt(b * b - 4.0f * a * c)) / (2.0f * a);
  return (-b + sqrt(b * b - 4.0f * a * c)) / (2.0f * a);
}

// Evaluate a quadratic curve given control points and a t value.
vec2 EvalQuad(vec2 p0, vec2 p1, vec2 p2, float t) {
  float u = 1.0f - t;
  return u * u * p0 + 2.0f * u * t * p1 + t * t * p2;
}

// Given three quadratic curve control points, calculate the
// "intersection number" of a ray starting at the origin, point towards +x.
float CalcIntersectionChange(
  vec2 p0_in,
  vec2 p1_in,
  vec2 p2_in,
  vec2 frag_width,
  bool xy_flip
) {
  vec2 p0, p1, p2;
  if(xy_flip) {
    p0 = vec2(p0_in.y, p0_in.x);
    p1 = vec2(p1_in.y, p1_in.x);
    p2 = vec2(p2_in.y, p2_in.x);
  } else {
    p0 = p0_in;
    p1 = p1_in;
    p2 = p2_in;
  }
  float a = p0.y - 2.0f * p1.y + p2.y;
  float b = -2.0f * (p0.y - p1.y);
  float c = p0.y;
  if(QuadraticNumSols(a, b, c) == 0)
    return 0.0f;

  // How much the canvas coordinate changes between neighboring fragments.
  // dFd[xy] can't be called in the dynamic loop because of
  // shader language shenanigans, so it's called here.
  float px_width = (xy_flip ? frag_width.y : frag_width.x) * anti_aliasing_mult;

  // Linear case.
  if(QuadraticIsLinear(a, b, c)) {
    // Calc vars.
    float t = -c / b;
    vec2 point_at_t = EvalQuad(p0, p1, p2, t);
    float entry_exit_multiplier = (b > 0.0f ^^ xy_flip) ? -1.0f : 1.0f;
    // Return intersection change.
    if(t < 0.0f || t >= 1.0f || point_at_t.x < -px_width / 2.0f)
      return 0.0f;
    if(point_at_t.x > -px_width / 2.0f && point_at_t.x < px_width / 2.0f)
      return ((point_at_t.x / px_width) + 0.5f) * entry_exit_multiplier;
    else
      return entry_exit_multiplier;
  }

  // Quadratic case.
  float change = 0.0f;
  for(int i = 0; i < 2; i++) {
    // If we are currently processing the lower solution.
    bool is_minus_sol = (i == 0);
    // Calc vars.
    float t = SolveQuadratic(a, b, c, is_minus_sol);
    vec2 point_at_t = EvalQuad(p0, p1, p2, t);
    float entry_exit_multiplier = (!is_minus_sol) ^^ xy_flip ? -1.0f : 1.0f;
    // Add intersection change.
    if(t < 0.0f || t >= 1.0f || point_at_t.x < -px_width / 2.0f)
      change += 0.0f;
    else if(point_at_t.x > -px_width / 2.0f && point_at_t.x < px_width / 2.0f)
      change += ((point_at_t.x / px_width) + 0.5f) * entry_exit_multiplier;
    else
      change += entry_exit_multiplier;
  }
  return change;
}

void main(void) {
  // Get the dimensions of uQuadTexture.
  ivec2 quad_texture_size = textureSize(uQuadTexture, 0);
  int kQuadTexturePxWidth = quad_texture_size.x;
  int kQuadTexturePxHeight = quad_texture_size.y;

  // Use faceIndex for vertical accessing of uQuadTexture.
  float quad_texture_v = (float(fFaceIndex) + 0.5f) / float(kQuadTexturePxHeight);

  // How much the canvas coordinate changes between neighboring fragments.
  // dFd[xy] can't be called in the dynamic loop because of shader language shenanigans, so it's called here.
  vec2 canvas_coord_fwidth = fwidth(vCanvasCoord);

  // Signed running count that increments upon exiting a quad and decrements upon entering a quad.
  float intersection_count_x = 0.0f;
  float intersection_count_y = 0.0f;
  // Loop through all quads for this face.
  const int INFINITE_LOOP_MAX_ITERATIONS = 100000;
  for(int curr_quad = 0; curr_quad <= INFINITE_LOOP_MAX_ITERATIONS; curr_quad++) {
    // Validate infinite loop hasn't run out.
    if(curr_quad == INFINITE_LOOP_MAX_ITERATIONS) {
      fragColor = vec4(1.0f, 0.0f, 0.0f, 1.0f); // Error color.
      return;
    }
    // Break condition.
    int curr_px = curr_quad * 2;
    if(curr_px == kQuadTexturePxWidth)
      break;

    // The current quad (left and right pixels) as texture u values.
    float quad_u_val_l = (float(curr_px + 0) + 0.5f) / float(kQuadTexturePxWidth);
    float quad_u_val_r = (float(curr_px + 1) + 0.5f) / float(kQuadTexturePxWidth);
    // quad_rgba_l has rgbaF32 = P0(x:F32,y:F32) & P1(x:F32,y:F32)
    // quad_rgba_r has rgbaF32 = P2(x:F32,y:F32) & Metadata(h:F32,l:F32)
    vec4 quad_rgba_l = texture(uQuadTexture, vec2(quad_u_val_l, quad_texture_v));
    vec4 quad_rgba_r = texture(uQuadTexture, vec2(quad_u_val_r, quad_texture_v));
    // No-more-quads break condition.
    if(quad_rgba_l.r == 0.0f && quad_rgba_l.g == 0.0f && quad_rgba_l.b == 0.0f && quad_rgba_l.a == 0.0f)
      break;

    // Quad curve control points in reference frame where current fragment is the origin.
    vec2 origin = vCanvasCoord;
    vec2 p0 = quad_rgba_l.rg - origin;
    vec2 p1 = quad_rgba_l.ba - origin;
    vec2 p2 = quad_rgba_r.rg - origin;

    // New refactored stuff.
    float x_raycast_count = CalcIntersectionChange(p0, p1, p2, canvas_coord_fwidth, false);
    float y_raycast_count = CalcIntersectionChange(p0, p1, p2, canvas_coord_fwidth, true);
    intersection_count_x += x_raycast_count;
    intersection_count_y += y_raycast_count;
  }
  float intersection_count = min(intersection_count_x, intersection_count_y);
  if(intersection_count < 0.5f)
    intersection_count = max(intersection_count_x, intersection_count_y);

  // Use intersection_count to color fragment.
  if(intersection_count < -10.0f) {
    fragColor = vec4(1, 0, 0, 1);
    return;
  }
  if(intersection_count > 1.0f)
    intersection_count = 1.0f;
  const vec4 text_color = vec4(1, 1, 1, 1);
  const float text_opacity = 0.5f;
  vec4 tex_color = texture(uImageTexture, vImageTextureCoord);
  float t = intersection_count * text_opacity;
  float u = 1.0f - t;
  fragColor = t * text_color + u * tex_color;

  // Debug data output.
  for(int i = 0; i < 100; i++) {
    int idx = i * 4;
    print_arr[idx] = glyph_array[i].pos.x;
    print_arr[idx + 1] = glyph_array[i].pos.y;
    print_arr[idx + 2] = float(glyph_array[i].opentype_index);
    print_arr[idx + 3] = float(glyph_array[i].size);
  }
  PrintDebugOutput(); // Uses print_arr.
}
