uniform sampler2D pointTexture;

varying vec3 vColor;
varying float vAlpha;

void main() {
    vec4 fragColor = vec4(vColor, vAlpha);
    fragColor *= texture2D(pointTexture, gl_PointCoord);
    gl_FragColor = fragColor;
}
