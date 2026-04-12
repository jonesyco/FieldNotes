export interface POI {
  id: string;
  title: string;
  description: string;
  includeInSequence: boolean;
  tags: string[];
  neighborhood: string;
  group?: string;
  lat: number;
  lng: number;
  photoUrl?: string;
  websiteUrl?: string;
  createdAt: string;
  favorite: boolean;
}

export type SortOption = 'newest' | 'alphabetical' | 'tag' | 'neighborhood';

export interface FilterState {
  search: string;
  tags: string[];
  favoritesOnly: boolean;
  inBoundsOnly: boolean;
  sort: SortOption;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}
