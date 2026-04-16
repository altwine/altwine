attribute float size;
attribute vec3 color;
attribute float aRandom;

varying vec3 vColor;
varying float vAlpha;

uniform float uTime;
uniform float uSpeed;

void main() {
    vColor = color;

    float angle = uTime * (0.2 * uSpeed + aRandom * 0.05);

    float c = cos(angle);
    float s = sin(angle);

    float x = position.x * c - position.z * s;
    float z = position.x * s + position.z * c;

    vec4 mvPosition = modelViewMatrix * vec4(x, position.y, z, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    gl_PointSize = size * (300.0 / -mvPosition.z);

    vAlpha = 0.4 + 0.6 * sin(uTime * 3.0 + aRandom * 10.0);
}
