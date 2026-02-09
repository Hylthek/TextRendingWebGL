#version 300 es
precision highp float;

in vec4 aVertexPosition; // Position in 3D space of vertex. The 4th component is set to default, 1.0f by glsl specs.
in vec2 aTextureCoord;
in int aFaceIndex; // Face index (per vertex). Last vertex in triangle is provoking.
in vec2 aCanvasCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

// These variables are private to the shaders and are passed directly to the frag shader.
out highp vec2 vImageTextureCoord; // Default = varying = linear face interpolation.
out highp vec2 vCanvasCoord; // Default = varying = linear face interpolation.
flat out int fFaceIndex; // Flat = no face interpolation.

void main(void) {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

  vImageTextureCoord = aTextureCoord;
  vCanvasCoord = aCanvasCoord;
  fFaceIndex = aFaceIndex;
}