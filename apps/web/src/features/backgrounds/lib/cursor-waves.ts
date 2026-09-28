/**
 * Cursor-reactive "waves" background: slow color blooms with a soft ripple that follows the pointer.
 * Concept inspired by rkeshs/my-portfolio's HeroCanvas (MIT); this is an original implementation.
 * Perf guards and uniforms come from the shared runner.
 */
import type { Background } from './contract.ts';
import { runShader, SHADER_HEADER } from './gl-runner.ts';

const FRAGMENT = `${SHADER_HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 cursor = vec2(u_cursor.x * aspect, u_cursor.y);

  float w1 = sin(p.x * 3.0 + u_time * 0.35) * 0.5 + 0.5;
  float w2 = sin(p.y * 2.2 - u_time * 0.28 + p.x * 1.5) * 0.5 + 0.5;
  float field = w1 * w2;

  float d = distance(p, cursor);
  float ripple = sin(d * 14.0 - u_time * 1.6) * exp(-d * 2.6) * 0.5 + 0.5;
  float glow = exp(-d * 1.8);

  vec3 color = mix(u_primary, u_cyan, field);
  color = mix(color, u_pink, ripple * 0.6);
  float intensity = (field * 0.16) + (glow * 0.22);
  outColor = vec4(color, clamp(intensity, 0.0, 0.5));
}`;

export const createCursorWaves: Background = (canvas, palette) =>
  runShader(canvas, palette, FRAGMENT);
