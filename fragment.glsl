varying highp vec2 _vTextureCoord; // This variable is private to the shaders and is grabbed directly from the vert shader.

uniform sampler2D uSampler; // The current texture to use. WebGL supports multiple loaded at once (8+).

void main(void) {
  gl_FragColor = texture2D(uSampler, _vTextureCoord);
}