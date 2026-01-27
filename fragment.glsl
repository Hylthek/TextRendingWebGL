varying highp vec2 _vTextureCoord; // This variable is private and is grabbed directly from the vert shader.

uniform sampler2D uSampler;

void main(void) {
  gl_FragColor = texture2D(uSampler, _vTextureCoord);
}