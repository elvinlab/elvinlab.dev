/**
 * Cursor-reactive "waves" background: a WebGL2 fragment shader paints slow color blooms over the
 * banner and a soft ripple follows the pointer. Concept inspired by rkeshs/my-portfolio's
 * HeroCanvas (MIT); this is an original implementation.
 *
 * Perf guards: DPR capped, paused when offscreen or when the tab is hidden, coarse pointers
 * throttled to 30 fps, and it bails out cleanly on context loss. Callers must respect
 * prefers-reduced-motion before starting it (see BackgroundCanvas.astro).
 */
import { clampDpr, frameInterval } from './color.ts';
import type { Background } from './contract.ts';

const VERTEX = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAGMENT = `#version 300 es
precision mediump float;
out vec4 outColor;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_cursor;
uniform vec3 u_primary;
uniform vec3 u_cyan;
uniform vec3 u_pink;

// Two drifting wave fields plus a pointer ripple, composited as soft additive glows.
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

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export const createCursorWaves: Background = (canvas, palette) => {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  });
  const noop = (): void => {};
  if (!gl) return noop;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return noop;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return noop;
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {
    res: gl.getUniformLocation(program, 'u_res'),
    time: gl.getUniformLocation(program, 'u_time'),
    cursor: gl.getUniformLocation(program, 'u_cursor'),
    primary: gl.getUniformLocation(program, 'u_primary'),
    cyan: gl.getUniformLocation(program, 'u_cyan'),
    pink: gl.getUniformLocation(program, 'u_pink'),
  };
  gl.uniform3fv(u.primary, palette.primary);
  gl.uniform3fv(u.cyan, palette.cyan);
  gl.uniform3fv(u.pink, palette.pink);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const coarse = matchMedia('(pointer: coarse)').matches;
  const minInterval = frameInterval(coarse);
  const cursor = { x: 0.5, y: 0.5 };
  const target = { x: 0.5, y: 0.5 };

  const resize = (): void => {
    const dpr = clampDpr(window.devicePixelRatio);
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const onPointer = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    target.x = (event.clientX - rect.left) / rect.width;
    target.y = 1 - (event.clientY - rect.top) / rect.height;
  };

  let raf = 0;
  let last = 0;
  let running = false;
  const start = performance.now();

  const frame = (now: number): void => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (minInterval && now - last < minInterval) return;
    last = now;
    resize();
    cursor.x += (target.x - cursor.x) * 0.06;
    cursor.y += (target.y - cursor.y) * 0.06;
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.time, (now - start) / 1000);
    gl.uniform2f(u.cursor, cursor.x, cursor.y);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const play = (): void => {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const pause = (): void => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // Pause when the banner scrolls out of view or the tab is hidden.
  const observer = new IntersectionObserver(
    ([entry]) => (entry?.isIntersecting ? play() : pause()),
    { threshold: 0 },
  );
  observer.observe(canvas);
  const onVisibility = (): void => (document.hidden ? pause() : play());
  const onLost = (event: Event): void => {
    event.preventDefault();
    pause();
  };

  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  return () => {
    pause();
    observer.disconnect();
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onLost);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
};
