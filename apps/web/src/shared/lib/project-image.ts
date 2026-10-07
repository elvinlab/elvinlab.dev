import type { ImageMetadata } from 'astro';

type ImageModules = Record<string, { default: ImageMetadata }>;

const PROJECTS_DIR = 'src/assets/projects';

// Imported through Vite so Astro's image pipeline (`imageService: 'compile'`) optimizes the file at
// build time; the glob keeps the configured name a plain string in `content/experiments.json`.
const modules: ImageModules = import.meta.glob('/src/assets/projects/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
});

/**
 * Resolves a project image (a file name inside `src/assets/projects`) to image metadata for
 * `<Image>`. A configured file that does not exist fails the build instead of shipping a broken
 * image.
 */
export function pickProjectImage(available: ImageModules, file: string): ImageMetadata {
  const image = available[`/${PROJECTS_DIR}/${file}`];
  if (!image)
    throw new Error(`a project image points to ${PROJECTS_DIR}/${file}, which does not exist`);
  return image.default;
}

export function resolveProjectImage(file: string): ImageMetadata {
  return pickProjectImage(modules, file);
}
