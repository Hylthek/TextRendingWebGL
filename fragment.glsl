#version 300 es
precision highp float;

// Shader externs.
in highp vec2 vImageTextureCoord; // This variable is private to the shaders and is grabbed directly from the vert shader.
in highp vec2 vCanvasCoord;
flat in int fFaceIndex; // WebGL default states that the last vertex of a triangle is the provoking vertex, passing its aFaceIndex to the entire face.

// Sampler means the current texture to use. WebGL supports multiple loaded at once (8+).
uniform sampler2D uImageTexture;
uniform sampler2D uQuadTexture; // A 2D texture for storing quad curve data (face, quad).

// Builtins.
out vec4 fragColor;

// Consts from JS.
uniform int uScreenWidthPx;
uniform int uScreenHeightPx;

// For debugging. Called at end of main().
const int debug_array_length = 100;
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

int QuadraticNumSols(float a, float b, float c) {
  float discriminant = b * b - 4.0f * a * c;
  if(discriminant < 0.0f)
    return 0;
  if(discriminant == 0.0f || (abs(a) < 0.01f && abs(b) > 0.01f))
    return 1;
  return 2;
}

float SolveQuadratic(float a, float b, float c, bool lesser_sol) {
  if(lesser_sol)
    return (-b - sqrt(b * b - 4.0f * a * c)) / (2.0f * a);
  return (-b + sqrt(b * b - 4.0f * a * c)) / (2.0f * a);
}

vec2 EvalQuad(vec2 p0, vec2 p1, vec2 p2, float t) {
  float u = 1.0f - t;
  return u * u * p0 + 2.0f * u * t * p1 + t * t * p2;
}

void main(void) {
  // Sample image texture.
  // fragColor = texture(uImageTexture, vImageTextureCoord); // texture2D() is deprecated in 300 ES.

  // Get the dimensions of uQuadTexture.
  ivec2 quad_texture_size = textureSize(uQuadTexture, 0);
  int kQuadTexturePxWidth = quad_texture_size.x;
  int kQuadTexturePxHeight = quad_texture_size.y;

  // Use faceIndex for vertical accessing of uQuadTexture.
  float quad_texture_v = (float(fFaceIndex) + 0.5f) / float(kQuadTexturePxHeight);

  // Signed running count that increments upon exiting a quad and decrements upon entering a quad.
  int intersection_count = 0;
  // Loop through all quads for this face.
  const int INFINITE_LOOP_MAX_ITERATIONS = 1000;
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
    vec2 origin = vCanvasCoord; // We use this for now.
    vec2 p0 = quad_rgba_l.rg - origin;
    vec2 p1 = quad_rgba_l.ba - origin;
    vec2 p2 = quad_rgba_r.rg - origin;

    // Parse out a b & c for the quadratic equation for quad intersections (where the curve has y=0).
    float a = p0.y - 2.0f * p1.y + p2.y;
    float b = -2.0f * (p0.y - p1.y);
    float c = p0.y;

    // How much the canvas coordinate changes with an x-shift in gl_fragCoord.
    float dUdx = dFdx(vCanvasCoord.x);

    print_arr[0] = dUdx;
    print_arr[1] = vCanvasCoord.x;
    print_arr[2] = 69.0f;

    // Branch based on number of intersections.
    switch(QuadraticNumSols(a, b, c)) {
      case 0:
        break;
      case 1:
        // fragColor = vec4(0, 0, 0, 1);
        // return;

        // If a isn't 0, this quadratic is tangent with the x-axis raycast.
        // If b is 0, line is horizontal and doesn't intersect raycast.
        if(abs(a) > 0.01f || abs(b) < 0.01f)
          break;
        // Calculate t-value of intersection with quad curve.
        float t = -c / b;
        bool is_entry = b > 0.0f;

        if(t < 0.0f || t >= 1.0f || EvalQuad(p0, p1, p2, t).x < 0.0f)
          break;
        if(is_entry) {
          intersection_count--;
        } else {
          intersection_count++;
        }
        break;
      case 2:
        // Process the lesser and then the greater quadratic formula solutions.
        for(int i = 0; i < 2; i++) {
          // Calculate t-values of intersections with quad curves.
          float t = SolveQuadratic(a, b, c, i == 0);
          // Check if t is within the curve.
          // Check if intersection isn't left of rightward raycast.
          if(t < 0.0f || t >= 1.0f || EvalQuad(p0, p1, p2, t).x < 0.0f)
            continue;
          // Determine if it is an entry point or an exit point.
          // It's an entry if the solution is the greater one.
          bool is_entry = (i == 1);
          if(is_entry) {
            intersection_count--;
          } else {
            intersection_count++;
          }
        }
        break;
      default:
        fragColor = vec4(0.0f, 0.27f, 1.0f, 1.0f);
        return;
    }
  }

  // Use intersection_count to color fragment.
  if(intersection_count < 0) {
    fragColor = vec4(1, 0, 0, 1);
    return;
  } else if(intersection_count == 0) {
    fragColor = vec4(1, 1, 1, 1);
  } else {
    fragColor = vec4(0.0f, 0.0f, 0.0f, 1.0f);
  }

  // Color by face.
  switch(fFaceIndex) {
    case 0:
      fragColor.r /= 2.0f;
      break;
    case 1:
      fragColor.gb /= 2.0f;
      break;
    case 2:
      fragColor.g /= 2.0f;
      break;
    case 3:
      fragColor.rb /= 2.0f;
      break;
    case 4:
      fragColor.b /= 2.0f;
      break;
    case 5:
      fragColor.rg /= 2.0f;
      break;
  }

  // Inject some image.
  fragColor += 1.0f * texture(uImageTexture, vImageTextureCoord);

  // Debug data output.
  PrintDebugOutput(); // Uses print_arr.
}
