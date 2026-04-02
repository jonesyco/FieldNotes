import { CategoryId } from './categories';

export interface POI {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
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

export type SortOption = 'newest' | 'alphabetical' | 'category' | 'neighborhood';

export interface FilterState {
  search: string;
  categories: CategoryId[];
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
