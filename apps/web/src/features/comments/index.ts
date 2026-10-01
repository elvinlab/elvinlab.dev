export { default as Comments } from './components/Comments.astro';
export {
  buildGiscusAttributes,
  GISCUS_CLIENT_SRC,
  GISCUS_ORIGIN,
  type GiscusConfig,
  type GiscusTheme,
  giscusThemeFor,
} from './lib/giscus.ts';
