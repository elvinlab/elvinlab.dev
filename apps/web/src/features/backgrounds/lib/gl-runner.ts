/**
 * Shared WebGL2 runner for token-driven background shaders. It compiles a fullscreen fragment
 * shader, feeds it the standard uniforms (resolution, time, smoothed cursor and the palette), and
 * owns every performance guard so each effect only supplies GLSL.
 *
 * Guards: DPR capped, paused when offscreen or when the tab is hidden, coarse pointers throttled to
 * 30 fps, and clean bail-out on context loss. Callers must honor prefers-reduced-motion first.
 */
import { clampDpr, frameInterval } from './color.ts';
import type { BackgroundHandle, Palette } from './contract.ts';

const VERTEX = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

/** Uniform header every effect fragment can rely on; effects append their `void main()`. */
export const SHADER_HEADER = `#version 300 es
precision mediump float;
out vec4 outColor;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_cursor;
uniform vec3 u_base;
uniform vec3 u_primary;
uniform vec3 u_cyan;
uniform vec3 u_pink;
`;

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

/** Starts a fragment-shader background on `canvas` and returns a cleanup that releases everything. */
export function runShader(
  canvas: HTMLCanvasElement,
  palette: Palette,
  fragment: string,
): BackgroundHandle {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  });
  const noop: BackgroundHandle = { destroy: () => {}, setPalette: () => {} };
  if (!gl) return noop;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return noop;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return noop;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const loc = (name: string) => gl.getUniformLocation(program, name);
  const uRes = loc('u_res');
  const uTime = loc('u_time');
  const uCursor = loc('u_cursor');
  const uBase = loc('u_base');
  const uPrimary = loc('u_primary');
  const uCyan = loc('u_cyan');
  const uPink = loc('u_pink');
  const applyPalette = (next: Palette): void => {
    gl.uniform3fv(uBase, next.base);
    gl.uniform3fv(uPrimary, next.primary);
    gl.uniform3fv(uCyan, next.cyan);
    gl.uniform3fv(uPink, next.pink);
  };
  applyPalette(palette);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const minInterval = frameInterval(matchMedia('(pointer: coarse)').matches);
  const cursor = { x: 0.5, y: 0.5 };
  const target = { x: 0.5, y: 0.5 };

  const resize = (): void => {
    const dpr = clampDpr(window.devicePixelRatio);
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);
    if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
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
    cursor.x += (target.x - cursor.x) * 0.05;
    cursor.y += (target.y - cursor.y) * 0.05;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uCursor, cursor.x, cursor.y);
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

  const observer = new IntersectionObserver(
    ([entry]) => (entry?.isIntersecting ? play() : pause()),
    { threshold: 0 },
  );
  observer.observe(canvas);
  const onVisibility = (): void => (document.hidden ? pause() : play());
  const onLost = (event: Event): void => {
    event.preventDefault();
    pause();
    // Hide the canvas so the browser never paints its broken-context icon; the banner's static
    // grid and glows show through instead.
    canvas.style.display = 'none';
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  return {
    setPalette: (next) => {
      if (!gl.isContextLost()) applyPalette(next);
    },
    destroy: () => {
      pause();
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
