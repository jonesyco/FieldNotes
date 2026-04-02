export interface Category {
  id: string;
  name: string;
  color: string;
  isPredefined: boolean;
}

export type CategoryId = string;

// Predefined categories - always available
export const PREDEFINED_CATEGORIES: Category[] = [
  { id: 'food', name: 'FOOD', color: '#e85d04', isPredefined: true },
  { id: 'coffee', name: 'COFFEE', color: '#b58c56', isPredefined: true },
  { id: 'bars', name: 'BARS', color: '#9b5fcb', isPredefined: true },
  { id: 'parks', name: 'PARKS', color: '#2ea86a', isPredefined: true },
  { id: 'viewpoints', name: 'VIEWPOINTS', color: '#2d88c8', isPredefined: true },
  { id: 'music', name: 'MUSIC', color: '#d63f84', isPredefined: true },
  { id: 'art', name: 'ART', color: '#d4a017', isPredefined: true },
  { id: 'shops', name: 'SHOPS', color: '#4a7fc8', isPredefined: true },
  { id: 'weird', name: 'WEIRD', color: '#c84040', isPredefined: true },
  { id: 'hidden_gems', name: 'HIDDEN GEMS', color: '#4aae3c', isPredefined: true },
  { id: 'safety', name: 'SAFETY', color: '#e03030', isPredefined: true },
  { id: 'transit', name: 'TRANSIT', color: '#6a6aa8', isPredefined: true },
  { id: 'other', name: 'OTHER', color: '#666', isPredefined: true },
];

// Helper functions
export function getCategoryById(categories: Category[], id: CategoryId): Category | undefined {
  return categories.find((cat) => cat.id === id);
}

export function getCategoryLabelById(categories: Category[], id: CategoryId): string {
  return getCategoryById(categories, id)?.name ?? 'OTHER';
}

export function getCategoryColorById(categories: Category[], id: CategoryId): string {
  return getCategoryById(categories, id)?.color ?? '#666';
}
