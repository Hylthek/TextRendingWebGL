#version 300 es
precision highp float;

in vec4 aVertexPosition; // Position in 3D space of vertex.
in vec2 aTextureCoord;
in int aFaceIndex; // Face index (per vertex). Last vertex in triangle is provoking.

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

// These variables are private to the shaders and are passed directly to the frag shader.
out highp vec2 vImageTextureCoord; // Default = varying = linear face interpolation.
flat out int fFaceIndex; // Flat = no face interpolation.

// Consts from JS.
uniform int uScreenWidthPx;
uniform int uScreenHeightPx;

void main(void) {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

  vImageTextureCoord = aTextureCoord;
  fFaceIndex = aFaceIndex;
}