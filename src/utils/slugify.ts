/**
 * Converts a string to a URL-safe slug
 * Example: "Hello World!" → "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '')        // Remove non-word chars
    .replace(/[\s_-]+/g, '-')        // Replace spaces/underscores with hyphen
    .replace(/^-+|-+$/g, '');        // Trim leading/trailing hyphens
}

/**
 * Generates a unique slug by appending a suffix if needed.
 * Pass a `checkExists` function that returns true if slug is taken.
 */
export async function generateUniqueSlug(
  base: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = slugify(base);
  let attempts = 0;

  while (await checkExists(slug)) {
    attempts++;
    slug = `${slugify(base)}-${attempts}`;
    if (attempts > 100) throw new Error('Could not generate unique slug');
  }

  return slug;
}
