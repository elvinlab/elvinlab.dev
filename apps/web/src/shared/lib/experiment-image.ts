import type { ImageMetadata } from 'astro';

type ImageModules = Record<string, { default: ImageMetadata }>;

const EXPERIMENTS_DIR = 'src/assets/experiments';

// Imported through Vite so Astro's image pipeline (`imageService: 'compile'`) optimizes the file at
// build time; the glob keeps the configured name a plain string in `content/experiments.json`.
// Each entry owns a folder: `assets/experiments/<entry id>/<file>`.
const modules: ImageModules = import.meta.glob(
  '/src/assets/experiments/*/*.{png,jpg,jpeg,webp,avif}',
  { eager: true },
);

/**
 * Resolves an experiment image (a file name inside the entry's own folder
 * `src/assets/experiments/<id>/`) to image metadata for `<Image>`. A configured file that does not
 * exist fails the build instead of shipping a broken image.
 */
export function pickExperimentImage(
  available: ImageModules,
  id: string,
  file: string,
): ImageMetadata {
  const image = available[`/${EXPERIMENTS_DIR}/${id}/${file}`];
  if (!image)
    throw new Error(
      `experiment "${id}" points to an image ${EXPERIMENTS_DIR}/${id}/${file}, which does not exist`,
    );
  return image.default;
}

/** Resolves every configured file of an entry, in order; one missing file fails the build. */
export function pickExperimentImages(
  available: ImageModules,
  id: string,
  files: readonly string[] | undefined,
): ImageMetadata[] {
  return (files ?? []).map((file) => pickExperimentImage(available, id, file));
}

export function resolveExperimentImages(id: string, files: readonly string[] | undefined) {
  return pickExperimentImages(modules, id, files);
}

export function resolveExperimentImage(id: string, file: string): ImageMetadata {
  return pickExperimentImage(modules, id, file);
}
