// Runtime values are deliberately unknown until the per-request contact validator accepts them.
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
