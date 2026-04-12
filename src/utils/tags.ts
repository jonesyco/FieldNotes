import type { POI } from '../types';

export function dedupeTags(tags: string[]): string[] {
  const uniqueTags = new Map<string, string>();

  for (const tag of tags) {
    const trimmedTag = tag.trim();
    if (!trimmedTag) continue;

    const normalizedTag = trimmedTag.toLowerCase();
    if (!uniqueTags.has(normalizedTag)) {
      uniqueTags.set(normalizedTag, trimmedTag);
    }
  }

  return Array.from(uniqueTags.values());
}

export function collectTagsFromPois(pois: Pick<POI, 'tags'>[]): string[] {
  const allTags = pois.flatMap((poi) => poi.tags);
  return dedupeTags(allTags).sort((a, b) => a.localeCompare(b));
}

export function getLegacyCategoryTag(category: unknown): string | null {
  if (typeof category !== 'string') return null;

  const normalizedCategory = category
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

  return normalizedCategory || null;
}
