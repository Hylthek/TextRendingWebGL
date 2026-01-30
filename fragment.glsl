#version 300 es
precision highp float;

// Shader externs.
in highp vec2 vImageTextureCoord; // This variable is private to the shaders and is grabbed directly from the vert shader.
flat in int fFaceIndex; // WebGL default states that the last vertex of a triangle is the provoking vertex, passing its aFaceIndex to the entire face.

// Sampler means the current texture to use. WebGL supports multiple loaded at once (8+).
uniform sampler2D uImageTexture;
uniform sampler2D uQuadTexture; // A 2D texture for storing quad curve data (face, quad).

// Consts
int kQuadTexturePxWidth = 100; // How many pixels in QuadTexture horizontally. MUST BE EVEN.
const int kQuadTexturePxHeight = 100; // Vise versa.

// Builtin outputs.
out vec4 fragColor;

void main(void) {
  fragColor = texture(uImageTexture, vImageTextureCoord); // texture2D() is deprecated in 300 ES.

  // The current face as a texture v value.
  float face_v_val = (float(fFaceIndex) + 0.5f) / float(kQuadTexturePxHeight);

  for(int i = 0; i < kQuadTexturePxWidth; i += 2) {
    // The current quad (high and low data) as texture u values.
    // quad_u_val_h has rgbaF32 = P0(x:F32,y:F32) & P1(x:F32,y:F32)
    // quad_u_val_l has rbgaF32 = P2(x:F32,y:F32) & Metadata(h:F32,l:F32)
    float quad_u_val_h = (float(i + 0) + 0.5f) / float(kQuadTexturePxWidth);
    float quad_u_val_l = (float(i + 1) + 0.5f) / float(kQuadTexturePxWidth);
    vec4 quad_rgba_h = texture(uQuadTexture, vec2(quad_u_val_h, face_v_val));
    vec4 quad_rgba_l = texture(uQuadTexture, vec2(quad_u_val_l, face_v_val));
  }

  // Color by face.
  switch(fFaceIndex) {
    case 0:
      fragColor.r = 1.0;
      break;
    case 1:
      fragColor.r = 0.0;
      break;
    case 2:
      fragColor.g = 1.0;
      break;
    case 3:
      fragColor.g = 0.0;
      break;
    case 4:
      fragColor.b = 1.0;
      break;
    case 5:
      fragColor.b = 0.0;
      break;
  }
}