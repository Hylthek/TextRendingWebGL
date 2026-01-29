attribute vec4 aVertexPosition; // Position in 3D space of vertex.
attribute vec2 aTextureCoord; // 

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying highp vec2 _vTextureCoord; // This variable is private to the shaders and is passed directly to the frag shader.
// Called "varying" because the fragment shader will interpolate the value between vertices.

void main(void) {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  _vTextureCoord = aTextureCoord;
}