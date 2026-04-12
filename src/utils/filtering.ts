import type { POI, FilterState, MapBounds } from '../types';

export function filterAndSortPOIs(
  pois: POI[],
  filter: FilterState,
  mapBounds: MapBounds | null
): POI[] {
  let result = [...pois];

  if (filter.search.trim()) {
    const q = filter.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (filter.tags.length > 0) {
    result = result.filter((p) =>
      p.tags.some((tag) => filter.tags.some((selectedTag) => selectedTag.toLowerCase() === tag.toLowerCase()))
    );
  }

  if (filter.favoritesOnly) {
    result = result.filter((p) => p.favorite);
  }

  if (filter.inBoundsOnly && mapBounds) {
    result = result.filter(
      (p) =>
        p.lat >= mapBounds.south &&
        p.lat <= mapBounds.north &&
        p.lng >= mapBounds.west &&
        p.lng <= mapBounds.east
    );
  }

  switch (filter.sort) {
    case 'newest':
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'alphabetical':
      result.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'tag': {
      const getFirstTag = (poi: POI) => poi.tags[0]?.toLowerCase() ?? '';
      result.sort((a, b) => getFirstTag(a).localeCompare(getFirstTag(b)) || a.title.localeCompare(b.title));
      break;
    }
    case 'neighborhood':
      result.sort((a, b) => a.neighborhood.localeCompare(b.neighborhood) || a.title.localeCompare(b.title));
      break;
  }

  return result;
}
