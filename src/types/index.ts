export type Category =
  | 'food'
  | 'coffee'
  | 'bars'
  | 'parks'
  | 'viewpoints'
  | 'music'
  | 'art'
  | 'shops'
  | 'weird'
  | 'hidden_gems'
  | 'safety'
  | 'transit'
  | 'other';

export const CATEGORIES: Category[] = [
  'food', 'coffee', 'bars', 'parks', 'viewpoints',
  'music', 'art', 'shops', 'weird', 'hidden_gems',
  'safety', 'transit', 'other',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  food: 'FOOD',
  coffee: 'COFFEE',
  bars: 'BARS',
  parks: 'PARKS',
  viewpoints: 'VIEWPOINTS',
  music: 'MUSIC',
  art: 'ART',
  shops: 'SHOPS',
  weird: 'WEIRD',
  hidden_gems: 'HIDDEN GEMS',
  safety: 'SAFETY',
  transit: 'TRANSIT',
  other: 'OTHER',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  food: '#e85d04',
  coffee: '#b58c56',
  bars: '#9b5fcb',
  parks: '#2ea86a',
  viewpoints: '#2d88c8',
  music: '#d63f84',
  art: '#d4a017',
  shops: '#4a7fc8',
  weird: '#c84040',
  hidden_gems: '#4aae3c',
  safety: '#e03030',
  transit: '#6a6aa8',
  other: '#666',
};

export interface POI {
  id: string;
  title: string;
  description: string;
  category: Category;
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
  categories: Category[];
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
