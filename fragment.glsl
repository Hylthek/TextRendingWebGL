#version 300 es
precision highp float;

// Shader externs.
in highp vec2 vImageTextureCoord; // This variable is private to the shaders and is grabbed directly from the vert shader.
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
highp int print_arr[debug_array_length];
void PrintDebugOutput() {
  // Draw a data-rich line at the center of the screen, extending right.
  float w_2 = float(uScreenWidthPx / 2) + 0.5f; // Pixel must have coords ending in .5
  float h_2 = float(uScreenHeightPx / 2) + 0.5f;
  if(gl_FragCoord.x >= w_2 && gl_FragCoord.x < w_2 + float(debug_array_length) && gl_FragCoord.y == h_2) {
    // Get current pixel in line.
    int curr_pixel = int(gl_FragCoord.x - w_2);
    // Convert print_val:short to vec4.
    ivec4 nums;
    nums.r = (print_arr[curr_pixel] >> 24) & 0xFF;
    nums.g = (print_arr[curr_pixel] >> 16) & 0xFF;
    nums.b = (print_arr[curr_pixel] >> 8) & 0xFF;
    nums.a = print_arr[curr_pixel] & 0xFF;
    // Then to floats.
    vec4 nums_f = vec4(float(nums.r) / 255.0f, float(nums.g) / 255.0f, float(nums.b) / 255.0f, float(nums.a) / 255.0f);
    fragColor = nums_f;
  }
}

void main(void) {
  // Sample image texture.
  fragColor = texture(uImageTexture, vImageTextureCoord); // texture2D() is deprecated in 300 ES.

  // Get the dimensions of uQuadTexture.
  ivec2 quad_texture_size = textureSize(uQuadTexture, 0);
  int kQuadTexturePxWidth = quad_texture_size.x;
  int kQuadTexturePxHeight = quad_texture_size.y;

  // Use faceIndex for vertical accessing of uQuadTexture.
  float quad_texture_v = (float(fFaceIndex) + 0.5f) / float(kQuadTexturePxHeight);
  // Dynamic-sized for-loop.
  const int INFINITE_LOOP_MAX_ITERATIONS = 100;
  for(int curr_quad = 0; curr_quad <= INFINITE_LOOP_MAX_ITERATIONS; curr_quad++) {
    int curr_px = curr_quad * 2;

    // Validate infinite loop hasn't run out.
    if(curr_quad == INFINITE_LOOP_MAX_ITERATIONS) {
      fragColor = vec4(1, 0, 0, 1); // Error color.
      return;
    }
    // Break condition.
    if(curr_px == quad_texture_size.x)
      break;

    // The current quad (left and right pixels) as texture u values.
    float quad_u_val_l = (float(curr_px + 0) + 0.5f) / float(kQuadTexturePxWidth);
    float quad_u_val_r = (float(curr_px + 1) + 0.5f) / float(kQuadTexturePxWidth);
    // quad_rgba_l has rgbaF32 = P0(x:F32,y:F32) & P1(x:F32,y:F32)
    // quad_rgba_r has rbgaF32 = P2(x:F32,y:F32) & Metadata(h:F32,l:F32)
    vec4 quad_rgba_l = texture(uQuadTexture, vec2(quad_u_val_l, quad_texture_v));
    vec4 quad_rgba_r = texture(uQuadTexture, vec2(quad_u_val_r, quad_texture_v));

    print_arr[8 * curr_quad + 0] = int(quad_rgba_l.r * 1000.0f);
    print_arr[8 * curr_quad + 1] = int(quad_rgba_l.g * 1000.0f);
    print_arr[8 * curr_quad + 2] = int(quad_rgba_l.b * 1000.0f);
    print_arr[8 * curr_quad + 3] = int(quad_rgba_l.a * 1000.0f);
    print_arr[8 * curr_quad + 4] = int(quad_rgba_r.r * 1000.0f);
    print_arr[8 * curr_quad + 5] = int(quad_rgba_r.g * 1000.0f);
    print_arr[8 * curr_quad + 6] = int(quad_rgba_r.b * 1000.0f);
    print_arr[8 * curr_quad + 7] = int(quad_rgba_r.a * 1000.0f);
  }

  // Color by face.
  switch(fFaceIndex) {
    case 0:
      fragColor.r = 1.0f;
      break;
    case 1:
      fragColor.r = 0.0f;
      break;
    case 2:
      fragColor.g = 1.0f;
      break;
    case 3:
      fragColor.g = 0.0f;
      break;
    case 4:
      fragColor.b = 1.0f;
      break;
    case 5:
      fragColor.b = 0.0f;
      break;
  }

  // Debug data output.
  PrintDebugOutput(); // Uses print_val.
}
