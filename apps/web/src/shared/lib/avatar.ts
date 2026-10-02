import type { ImageMetadata } from 'astro';

type ImageModules = Record<string, { default: ImageMetadata }>;

const ASSETS_DIR = 'src/assets';

// Imported through Vite so Astro's image pipeline (`imageService: 'compile'`) optimizes the file at
// build time; the glob also keeps the configured name a plain string in `site.config.ts`.
const modules: ImageModules = import.meta.glob('/src/assets/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
});

/**
 * Resolves an `identity` image (a file name inside `src/assets`) to image metadata for `<Image>`.
 * Returns `undefined` when none is configured (callers render initials); a configured file that
 * does not exist fails the build instead of silently shipping a broken image. `field` names the
 * config key in that error, so a missing `identity.photo` is not blamed on `identity.avatar`.
 */
export function pickAvatar(
  available: ImageModules,
  file: string | undefined,
  field = 'identity.avatar',
): ImageMetadata | undefined {
  if (!file) return undefined;
  const image = available[`/${ASSETS_DIR}/${file}`];
  if (!image) throw new Error(`${field} points to ${ASSETS_DIR}/${file}, which does not exist`);
  return image.default;
}

export function resolveAvatar(file: string | undefined): ImageMetadata | undefined {
  return pickAvatar(modules, file);
}

/**
 * The portrait of `/me`: `identity.photo`, or `identity.avatar` when no photo is configured.
 * Only `/me` calls this; the rest of the site keeps the avatar.
 */
export function resolvePhoto(identity: {
  photo?: string | undefined;
  avatar?: string | undefined;
}): ImageMetadata | undefined {
  return identity.photo
    ? pickAvatar(modules, identity.photo, 'identity.photo')
    : resolveAvatar(identity.avatar);
}
