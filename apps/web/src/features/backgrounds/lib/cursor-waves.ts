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

  // Gentle drifting ambience so the banner is alive even when the pointer is still.
  float ambient = sin(p.x * 3.0 + u_time * 0.35) * sin(p.y * 2.4 - u_time * 0.3) * 0.5 + 0.5;

  // Concentric ripples expanding from the pointer (the "drops" of the reference).
  float d = distance(p, cursor);
  float rings = sin(d * 26.0 - u_time * 3.2) * 0.5 + 0.5;
  float reach = smoothstep(0.85, 0.0, d);
  float ripple = rings * reach;
  float glow = exp(-d * 2.0);

  // Cool violet-to-cyan palette; the ripple highlights toward cyan (the pink stays a text accent).
  vec3 color = mix(u_primary, u_cyan, ambient);
  color = mix(color, u_cyan, ripple * 0.6);
  float intensity = ambient * 0.12 + glow * 0.4 + ripple * 0.28;
  outColor = vec4(color, clamp(intensity, 0.0, 0.7));
}`;

export const createCursorWaves: Background = (canvas, palette) =>
  runShader(canvas, palette, FRAGMENT);
