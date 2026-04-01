precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

float circle(vec2 uv, vec2 center, float radius, float blur) {
    float d = length(uv - center);
    return smoothstep(radius + blur, radius - blur, d);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.35;

    vec3 base = vec3(0.03, 0.04, 0.08);
    vec3 c1 = vec3(0.20, 0.35, 0.95);
    vec3 c2 = vec3(0.55, 0.15, 0.80);
    vec3 c3 = vec3(0.10, 0.85, 0.75);

    float glow1 = circle(p, vec2(sin(t) * 0.35, cos(t * 0.8) * 0.25), 0.45, 0.35);
    float glow2 = circle(p, vec2(cos(t * 1.3) * 0.45, sin(t * 1.1) * 0.30), 0.40, 0.30);
    float glow3 = circle(p, vec2(sin(t * 0.7) * 0.25, cos(t * 1.6) * 0.35), 0.35, 0.28);

    vec3 color = base + c1 * glow1 + c2 * glow2 + c3 * glow3;
    float vignette = smoothstep(1.5, 0.2, length(p));
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
}