import type { ImageMetadata } from 'astro';

type ImageModules = Record<string, { default: ImageMetadata }>;

const EDUCATION_DIR = 'src/assets/education';

// Imported through Vite so Astro's image pipeline optimizes the file at build time; the glob keeps
// the configured name a plain string in `content/credentials.json`. Documents are public copies
// kept as `assets/education/<file>` (docs/DESIGN.md, "Images of experiments and credentials").
const modules: ImageModules = import.meta.glob('/src/assets/education/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
});

/** Resolves a configured file to image metadata; a file that does not exist fails the build. */
export function resolveEducationImage(id: string, file: string): ImageMetadata {
  const image = modules[`/${EDUCATION_DIR}/${file}`];
  if (!image) {
    throw new Error(
      `credential "${id}" points to an image ${EDUCATION_DIR}/${file}, which does not exist`,
    );
  }
  return image.default;
}
