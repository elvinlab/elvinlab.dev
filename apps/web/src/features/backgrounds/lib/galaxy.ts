/**
 * "Galaxy" background: a slow nebula (value-noise fbm tinted with the theme palette) with a twinkling
 * star field over it and a gentle cursor parallax for depth. Kept subtle so banner text stays
 * readable. Perf guards and uniforms come from the shared runner.
 */
import type { Background } from './contract.ts';
import { runShader, SHADER_HEADER } from './gl-runner.ts';

const FRAGMENT = `${SHADER_HEADER}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// Twinkling stars: one candidate star per grid cell, hashed position and phase.
float stars(vec2 uv, float density, float t) {
  vec2 g = uv * density;
  vec2 i = floor(g);
  vec2 f = fract(g);
  float h = hash(i);
  vec2 pos = vec2(hash(i + 1.3), hash(i + 2.7));
  float d = length(f - pos);
  float twinkle = 0.6 + 0.4 * sin(t * 2.0 + h * 6.28);
  float star = smoothstep(0.05, 0.0, d) * step(0.55, h) * twinkle;
  return star;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 parallax = (u_cursor - 0.5) * 0.08;

  // Nebula clouds.
  float n = fbm(p * 2.4 + parallax * 4.0 + vec2(u_time * 0.03, u_time * 0.02));
  float clouds = smoothstep(0.2, 0.85, n);
  vec3 nebula = mix(u_primary, u_cyan, fbm(p * 1.7 - u_time * 0.02));
  nebula = mix(nebula, u_pink, smoothstep(0.6, 1.0, n));

  // Two star layers at different depths for parallax.
  float s = stars(uv + parallax, 46.0, u_time);
  s += stars(uv + parallax * 2.0, 80.0, u_time + 5.0) * 0.7;

  // Stars take an accent tint (bright on dark themes, dark on light) so they read on both.
  vec3 starColor = mix(u_primary, u_cyan, hash(uv * 10.0));
  vec3 color = nebula * clouds + starColor * s;
  float alpha = clouds * 0.38 + s;
  outColor = vec4(color, clamp(alpha, 0.0, 0.9));
}`;

export const createGalaxy: Background = (canvas, palette) => runShader(canvas, palette, FRAGMENT);
