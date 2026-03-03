#version 300 es
precision highp float;

// Builtin output.
out vec4 fragColor;

// Texture from a png image.
uniform sampler2D uImageTexture;
// uv vector for texture.
in highp vec2 vImageTextureCoord;

// A 2D texture for storing quadratic curve data.
uniform sampler2D uQuadTexture;
// Width and Height of the font quadratic curve data texture.
const int kQuadTexturePxWidth = --QUAD_TEXTURE_PX_WIDTH--; // -- marks the variable for string replacement in JS.
const int kQuadTexturePxHeight = --QUAD_TEXTURE_PX_HEIGHT--;

// Data that tells the shader what char to draw and where.
struct GlyphLayout {
  vec2 pos;
  float opentype_index;
  float size;
};

// Data that tells the shader where lines of chars are and where those chars are in the glyph array.
struct LineLayout {
  float x1;
  float x2;
  float y1;
  float y2;
  float buffer_offset;
  float num_chars;
};

// A 2D data texture for storing glyph layouts.
uniform sampler2D uGlyphLayoutTexture;
// Width and Height of the font quadratic curve data texture.
const int kGlyphTexturePxWidth = --GLYPH_TEXTURE_PX_WIDTH--;
const int kGlyphTexturePxHeight = --GLYPH_TEXTURE_PX_HEIGHT--;
// Length of the full GlyphLayout ArrayBuffer.
const int kGlyphBufferLength = --GLYPH_BUFFER_LENGTH--;

// Text rendering 2D coordinate in "glyph-space".
in highp vec2 vCanvasCoord;
// The maximum distance from GlyphLayout.pos that a glyph can extend.
const float kGlyphBoundingRadius = --GLYPH_BOUNDING_RADIUS--;

// The number of lines contained in the data texture.
uniform int uNumLines;

// If the amount of texture fetches for the pixel should be rendered. 0=false 1=true.
uniform int uRenderTextureFetchAmount;
uniform int uRenderTextureFetchAmountMax;

uniform int uRenderControlPoints;

// Consts from JS.
uniform int uScreenWidthPx;
uniform int uScreenHeightPx;

// Is constant across a WebGL element.
flat in float fFaceIndex;

// Number that is close enough to 0 to be considered 0.
// For div by 0 edge cases.
// Increase if glitching, decrease if curves are being rendered as straight lines.
const float kSmallNumberCutoff = 1e-3f;

// A size multiplier for anti-aliasing effect.
const float kAntiAliasingMult = 1.5f;

// Draws pixel data onto the screen at certain spots
// for the CPU to grab and parse. Called at end of main().
const int kDebugArrayLength = 1000; // Must match JS variable of same name.
float print_arr[kDebugArrayLength];
void PrintDebugOutput() {
  // Draw a data-rich line at the center of the screen, extending right.
  float w_2 = float(uScreenWidthPx / 2) + 0.5f; // Pixel must have coords ending in .5
  float h_2 = float(uScreenHeightPx / 2) + 0.5f;
  if(gl_FragCoord.x >= w_2 && gl_FragCoord.x < w_2 + float(kDebugArrayLength) && gl_FragCoord.y == h_2) {
    // Get current pixel in line.
    int curr_pixel = int(gl_FragCoord.x - w_2);
    // Convert print_arr:float to ivec4.
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

// Given three quadratic curve control points, calculate the
// "intersection number" of a ray starting at the origin, point towards +x.
// "intersection number" increases if ray leaves a TrueType font contour
// and decreases if it enters. Antialiasing allows for fractional values if
// the intersection is near the current fragment.
float CalcIntersectionChange(vec2 p0, vec2 p1, vec2 p2, vec2 frag_width, bool rotate_points) {
  // If specified, rotate points clockwise to simulate a vertical ray instead of a horizontal.
  if(rotate_points) {
    p0 = p0.yx;
    p0.y *= -1.0f;
    p1 = p1.yx;
    p1.y *= -1.0f;
    p2 = p2.yx;
    p2.y *= -1.0f;
  }
  float active_frag_width = (rotate_points ? frag_width.y : frag_width.x) * kAntiAliasingMult;

  // Early return for performance.
  if(p0.y > 0.0f && p1.y > 0.0f && p2.y > 0.0f)
    return 0.0f;
  if(p0.y < 0.0f && p1.y < 0.0f && p2.y < 0.0f)
    return 0.0f;

  // Calculate coefficients for quadratic equation describing
  // vertical motion of the curve, relative to the active canvas coord.
  vec2 a = p0 - 2.0f * p1 + p2;
  vec2 b = -2.0f * (p0 - p1);
  vec2 c = p0;
  bool use_quadratic_algorithm = abs(a.y) >= kSmallNumberCutoff;

  // Values of the parameter at intersections.
  float t0, t1;

  // Branch based on quadratic or linear curve.
  if(use_quadratic_algorithm) {
    // Quadratic segment, solve abc formula to find roots.
    float radicand = b.y * b.y - 4.0f * a.y * c.y;

    // Return early if none or one solution.
    if(radicand <= 0.0f)
      return 0.0f;

    // Solve for roots.
    float square_root = sqrt(radicand);
    t0 = (-b.y - square_root) / (2.0f * a.y);
    t1 = (-b.y + square_root) / (2.0f * a.y);
  } else {
    // Find the zero of the linear equation.
    // float t = p0.y / (p0.y - p2.y);
    float t = -c.y / b.y;
    if(p0.y < p2.y) {
      t0 = -1e10f;
      t1 = t;
    } else {
      t0 = t;
      t1 = -1e10f;
    }
  }

  // Return value.
  float alpha = 0.0f;

  if(t0 >= 0.0f && t0 < 1.0f) {
    float x = a.x * t0 * t0 + b.x * t0 + c.x;
    alpha += clamp(x / active_frag_width + 0.5f, 0.0f, 1.0f);
  }

  if(t1 >= 0.0f && t1 < 1.0f) {
    float x = a.x * t1 * t1 + b.x * t1 + c.x;
    alpha -= clamp(x / active_frag_width + 0.5f, 0.0f, 1.0f);
  }

  return alpha;
}

// All components are in the range [0…1], including hue.
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0f, 2.0f / 3.0f, 1.0f / 3.0f, 3.0f);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0f - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0f, 1.0f), c.y);
}

// Turns a 1D array index into a 2D texture coord.
// left->right, bottom->top.
vec2 IdxToUV(int idx, int tex_width, int tex_height) {
  int u_idx = idx % tex_width;
  int v_idx = idx / tex_width;
  float u = (float(u_idx) + 0.5f) / float(tex_width);
  float v = (float(v_idx) + 0.5f) / float(tex_height);
  return vec2(u, v);
}

float RandomFloatFromSeed(int seed) {
  const int m = 73;
  const int a = 73 * 123456789;
  return float(a * seed % m) / float(m);
}

vec4 BlendColors(vec4 bot_col, vec4 top_col) {
  float outA = top_col.a + bot_col.a * (1.0f - top_col.a);
  vec3 outRGB = (top_col.rgb * top_col.a + bot_col.rgb * bot_col.a * (1.0f - top_col.a)) / max(outA, 1e-6f);
  return vec4(outRGB, outA);
}

void main(void) {
  int num_texel_fetches = 0;
  vec4 control_point_color = vec4(0, 0, 0, 0);

  // How much the canvas coordinate changes between neighboring fragments.
  vec2 canvas_coord_fwidth = fwidth(vCanvasCoord);

  // Signed running count that increments upon exiting a
  // TrueType contour and decrements upon entering a contour.
  // Fractional increments for anti-aliasing.
  float intersection_count_x = 0.0f; // Ray extends to +x
  float intersection_count_y = 0.0f; // Ray extends to +y

  // Iterate through line layouts.
  for(int i_line = 0; i_line < kGlyphBufferLength; i_line++) {
    // Break if no more lines.
    if(i_line >= uNumLines)
      break;

    // Get line bounding box and parse.
    vec2 uv_l = IdxToUV(2 * i_line, kGlyphTexturePxWidth, kGlyphTexturePxHeight);
    vec4 line_px_l = texture(uGlyphLayoutTexture, vec2(uv_l.x, 1.0f - uv_l.y));
    num_texel_fetches++;
    LineLayout curr_line_layout;
    curr_line_layout.x1 = line_px_l.x;
    curr_line_layout.x2 = line_px_l.y;
    curr_line_layout.y1 = line_px_l.z;
    curr_line_layout.y2 = line_px_l.w;

    // Continue if curr canvas coord is out of line bounding box.
    if(vCanvasCoord.x < curr_line_layout.x1 || vCanvasCoord.x > curr_line_layout.x2 ||
      vCanvasCoord.y < curr_line_layout.y1 || vCanvasCoord.y > curr_line_layout.y2)
      continue;

    // Get rest of line info and parse.
    vec2 uv_r = IdxToUV(2 * i_line + 1, kGlyphTexturePxWidth, kGlyphTexturePxHeight);
    vec4 line_px_r = texture(uGlyphLayoutTexture, vec2(uv_r.x, 1.0f - uv_r.y));
    num_texel_fetches++;
    curr_line_layout.buffer_offset = line_px_r.x;
    curr_line_layout.num_chars = line_px_r.y;

    // Iterate through glyph layouts.
    int idx_start = int(curr_line_layout.buffer_offset);
    int idx_end = int(curr_line_layout.buffer_offset + curr_line_layout.num_chars);

    for(int i_glyph_gpu_stable = 0; i_glyph_gpu_stable < kGlyphBufferLength; i_glyph_gpu_stable++) {
      int i_glyph = i_glyph_gpu_stable + idx_start;
      // Break if number of glyphs reached
      if(i_glyph >= idx_end)
        break;

      // Fetch GlyphLayout texel.
      vec2 glyph_uv = IdxToUV(i_glyph, kGlyphTexturePxWidth, kGlyphTexturePxHeight);
      vec4 glyph_layout_texel = texture(uGlyphLayoutTexture, glyph_uv);
      num_texel_fetches++;

      // Parse into a GlyphLayout object.
      GlyphLayout curr_glyph;
      curr_glyph.pos = glyph_layout_texel.xy;
      curr_glyph.opentype_index = glyph_layout_texel.z;
      curr_glyph.size = glyph_layout_texel.w;

      // Calculate distance to glyph origin and check for early continue.
      float dist_to_glyph_orig = distance(vCanvasCoord, curr_glyph.pos);
      if(dist_to_glyph_orig > kGlyphBoundingRadius * curr_glyph.size)
        continue;

      // Use the current opentype_index to vertically access the quad texture.
      float quad_texture_v = (curr_glyph.opentype_index + 0.5f) / float(kQuadTexturePxHeight);

      // Iterate through quadratic curves.
      for(int curr_quad = 0; curr_quad < kQuadTexturePxWidth / 2; curr_quad++) {
        int curr_px = curr_quad * 2;
        // The current quad (left and right pixels) as texture u values.
        float quad_u_val_l = (float(curr_px + 0) + 0.5f) / float(kQuadTexturePxWidth);
        float quad_u_val_r = (float(curr_px + 1) + 0.5f) / float(kQuadTexturePxWidth);
        // quad_rgba_l has rgbaF32 = P0(x:F32,y:F32) & P1(x:F32,y:F32)
        // quad_rgba_r has rgbaF32 = P2(x:F32,y:F32) & Metadata(h:F32,l:F32)
        vec4 quad_rgba_l = texture(uQuadTexture, vec2(quad_u_val_l, quad_texture_v));
        vec4 quad_rgba_r = texture(uQuadTexture, vec2(quad_u_val_r, quad_texture_v));
        num_texel_fetches++;
        num_texel_fetches++;

        // Break if no more curves.
        if(quad_rgba_l == vec4(0.0f) && quad_rgba_r == vec4(0.0f))
          break;

        // Quad curve control points relative to current fragment's canvas coordinates.
        vec2 origin = vCanvasCoord;
        vec2 p0 = (quad_rgba_l.rg * curr_glyph.size) - origin + curr_glyph.pos;
        vec2 p1 = (quad_rgba_l.ba * curr_glyph.size) - origin + curr_glyph.pos;
        vec2 p2 = (quad_rgba_r.rg * curr_glyph.size) - origin + curr_glyph.pos;

        // Draw control point locations if set.
        // Square for on-curve and circle for off-curve.
        // Each curve has a random color hue generated by a random function.
        // Left half of square for p0 and right half for p2.
        // If p0 and p2 are too close, dont fade out control points (threshold scales with viewport).
        if(uRenderControlPoints == 1 && distance(p0, p2) > 0.1f) {
          const float kControlPointSize = 5.0f;
          float radius = kControlPointSize * canvas_coord_fwidth.x;
          float curve_control_point_hue = RandomFloatFromSeed(curr_quad);
          float curve_control_point_alpha = clamp(2.0f * (distance(p0, p2) / (radius * 6.0f) - 0.5f), 0.0f, 1.0f); // Adjust numbers here.
          vec4 curve_control_point_color = vec4(hsv2rgb(vec3(curve_control_point_hue, 0.7f, 1)), curve_control_point_alpha);
          float p1_dist = distance(p1, vec2(0, 0));
          if((p0.x > 0.3f * radius &&
            abs(p0.x) <= radius &&
            abs(p0.y) <= radius) ||
            (p2.x < -0.3f * radius &&
            abs(p2.x) <= radius &&
            abs(p2.y) <= radius) ||
            (p1_dist <= radius && p1_dist > radius * 0.5f))
            control_point_color = BlendColors(control_point_color, curve_control_point_color);
        }

        // Calculate signed intersections along +x and +y axes.
        intersection_count_x += CalcIntersectionChange(p0, p1, p2, canvas_coord_fwidth, false);
        intersection_count_y += CalcIntersectionChange(p0, p1, p2, canvas_coord_fwidth, true);
      }
    }
  }

  // Combine vertical and horizontal intersection counts.
  // For anti-aliasing, number closer to 0.49f takes over.
  // 0.49f is an arbitrary number that assures 0.0f beats 1.0f.
  // This confines the large amount of artifacts to the insides of the glyphs.
  float x_intersection_dist = abs(intersection_count_x - 0.49f);
  float y_intersection_dist = abs(intersection_count_y - 0.49f);
  float intersection_count = mix(intersection_count_x, intersection_count_y, step(y_intersection_dist, x_intersection_dist));

  // Text color.
  vec4 black = vec4(0, 0, 0, 1);
  vec4 white = vec4(1, 1, 1, 1);
  fragColor = mix(black, white, intersection_count);
  // Image color, additive.
  vec4 tex_color = texture(uImageTexture, vImageTextureCoord);
  num_texel_fetches++;
  fragColor = tex_color + fragColor;
  // Error color if intersections < 0.
  vec4 error_col = vec4(1, 0, 0, 1);
  float is_pos = step(0.0f, intersection_count);
  fragColor = mix(error_col, fragColor, is_pos);
  // Highlighting, number of texture() calls.
  float num_tex_fet_normalized = float(num_texel_fetches) / float(uRenderTextureFetchAmountMax);
  vec4 highlight_color = vec4(hsv2rgb(vec3(num_tex_fet_normalized, 1, 1)), 0.5f);
  if(num_tex_fet_normalized > 1.0f)
    highlight_color = vec4(1, 1, 1, 0.5f);
  if(uRenderTextureFetchAmount == 1)
    fragColor = BlendColors(fragColor, highlight_color);
  // Control point highlighting.
  if(uRenderControlPoints == 1) {
    fragColor = BlendColors(fragColor, control_point_color);
  }

  // Debug data output.
  // PrintDebugOutput(); // Uses print_arr.
}
