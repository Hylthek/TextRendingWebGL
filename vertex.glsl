attribute vec4 aVertexPosition; // Position in 3D space of vertex.
attribute vec2 aTextureCoord; // 

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying highp vec2 _vTextureCoord; // This variable is private and is passed directly to the frag shader.

void main(void) {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  _vTextureCoord = aTextureCoord;
}