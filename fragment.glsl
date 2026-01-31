#version 300 es
precision highp float;
#define INFINITE_LOOP_MAX_ITERATIONS 10

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
highp int print_val;
void PrintDebugOutput() {
  // Convert print_val:short to vec4.
  ivec4 nums;
  nums.r = (print_val >> 24) & 0xFF;
  nums.g = (print_val >> 16) & 0xFF;
  nums.b = (print_val >> 8) & 0xFF;
  nums.a = print_val & 0xFF;

  // Draw a small square at the center of the screen.
  float w_2 = float(uScreenWidthPx) / 2.0f;
  float h_2 = float(uScreenHeightPx) / 2.0f;
  const float radius = 5.0f;
  if(gl_FragCoord.x < w_2 + radius && gl_FragCoord.y < h_2 + radius &&
    gl_FragCoord.x > w_2 - radius && gl_FragCoord.y > h_2 - radius) {
    vec4 nums_f = vec4(float(nums.r) / 255.0f, float(nums.g) / 255.0f, float(nums.b) / 255.0f, float(nums.a) / 255.0f);
    fragColor = nums_f;
  }
}

void main(void) {
  // Sample image texture.
  fragColor = texture(uImageTexture, vImageTextureCoord); // texture2D() is deprecated in 300 ES.

  ivec2 quad_texture_size = textureSize(uQuadTexture, 0);
  int kQuadTexturePxWidth = quad_texture_size.x;
  int kQuadTexturePxHeight = quad_texture_size.y;

  // The current face as a texture v value.
  float face_v_val = (float(fFaceIndex) + 0.5f) / float(kQuadTexturePxHeight);

  for(int i = 0; i < INFINITE_LOOP_MAX_ITERATIONS; i += 2) { // Uniforms init to 0.
    // The current quad (high and low data) as texture u values.
    float quad_u_val_h = (float(i + 0) + 0.5f) / float(kQuadTexturePxWidth);
    float quad_u_val_l = (float(i + 1) + 0.5f) / float(kQuadTexturePxWidth);

    // quad_rgba_h has rgbaF32 = P0(x:F32,y:F32) & P1(x:F32,y:F32)
    // quad_rgba_l has rbgaF32 = P2(x:F32,y:F32) & Metadata(h:F32,l:F32)
    vec4 quad_rgba_h = texture(uQuadTexture, vec2(quad_u_val_h, face_v_val));
    vec4 quad_rgba_l = texture(uQuadTexture, vec2(quad_u_val_l, face_v_val));

    if(i >= quad_texture_size.x)
      break;
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
  print_val = kQuadTexturePxWidth;
  // print_val = kQuadTexturePxHeight;
  PrintDebugOutput(); // Uses print_val.
}
