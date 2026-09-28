export { default as BackgroundCanvas } from './components/BackgroundCanvas.astro';
export { clampDpr, frameInterval, parseColor, type Rgb } from './lib/color.ts';
export type { Background, Palette } from './lib/contract.ts';
export { createCursorWaves } from './lib/cursor-waves.ts';
export { createGalaxy } from './lib/galaxy.ts';
export { runShader, SHADER_HEADER } from './lib/gl-runner.ts';
