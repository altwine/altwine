attribute float size;
attribute vec3 color;
attribute float aRandom;

varying vec3 vColor;
varying float vAlpha;

uniform float uTime;

void main() {
    vColor = color;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    gl_PointSize = size * (300.0 / -mvPosition.z);

    float t = 1.0;
    if (size > 1.5) {
        t = 0.7 + 0.3 * sin(uTime * 3.0 + aRandom * 20.0);
    }

    vAlpha = t;
}
