import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { POI, FilterState, MapBounds } from '../types';
import type { CategoryId, Category } from '../types/categories';
import { PREDEFINED_CATEGORIES } from '../types/categories';
import { SEED_POIS } from '../data/seedData';

interface POIStore {
  pois: POI[];
  selectedPOI: POI | null;
  hoveredPOIId: string | null;
  filter: FilterState;
  mapBounds: MapBounds | null;
  addingMode: boolean;
  editingPOI: POI | null;
  collectionId: string | null;
  isReadOnly: boolean;
  isSaving: boolean;
  activeCategories: Category[];

  addPOI: (poi: Omit<POI, 'id' | 'createdAt' | 'favorite'>) => void;
  updatePOI: (id: string, updates: Partial<POI>) => void;
  deletePOI: (id: string) => void;
  toggleFavorite: (id: string) => void;
  selectPOI: (poi: POI | null) => void;
  hoverPOI: (id: string | null) => void;
  setFilter: (update: Partial<FilterState>) => void;
  toggleCategory: (catId: CategoryId) => void;
  setMapBounds: (bounds: MapBounds) => void;
  setAddingMode: (mode: boolean) => void;
  setEditingPOI: (poi: POI | null) => void;
  relocatingPOI: POI | null;
  setRelocatingPOI: (poi: POI | null) => void;
  importPOIs: (pois: POI[]) => void;
  resetFilters: () => void;
  highlightedGroup: string | null;
  setHighlightedGroup: (group: string | null) => void;
  setCollectionId: (id: string | null) => void;
  setIsReadOnly: (v: boolean) => void;
  setIsSaving: (v: boolean) => void;
  loadSharedCollection: (id: string) => Promise<void>;
  loadCollectionForEditing: (id: string) => Promise<void>;
  addCategory: (name: string, color: string) => void;
  updateCategory: (id: CategoryId, name: string, color: string) => void;
  deleteCategory: (id: CategoryId) => void;
  toggleCategoryActive: (id: CategoryId) => void;
}

const DEFAULT_FILTER: FilterState = {
  search: '',
  categories: [],
  favoritesOnly: false,
  inBoundsOnly: false,
  sort: 'newest',
};

export const usePOIStore = create<POIStore>()(
  persist(
    (set) => ({
      pois: SEED_POIS,
      selectedPOI: null,
      hoveredPOIId: null,
      filter: DEFAULT_FILTER,
      mapBounds: null,
      addingMode: false,
      editingPOI: null,
      relocatingPOI: null,
      collectionId: null,
      isReadOnly: false,
      isSaving: false,
      activeCategories: PREDEFINED_CATEGORIES,

      addPOI: (poiData) =>
        set((state) => {
          // Validate category exists in activeCategories
          const categoryExists = state.activeCategories.some((c) => c.id === poiData.category);
          const validCategory = categoryExists ? poiData.category : 'other';
          return {
            pois: [
              {
                ...poiData,
                category: validCategory,
                id: `poi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                createdAt: new Date().toISOString(),
                favorite: false,
              },
              ...state.pois,
            ],
          };
        }),

      updatePOI: (id, updates) =>
        set((state) => {
          // Validate category if being updated
          let validUpdates = updates;
          if (updates.category) {
            const categoryExists = state.activeCategories.some((c) => c.id === updates.category);
            if (!categoryExists) {
              validUpdates = { ...updates, category: 'other' };
            }
          }
          return {
            pois: state.pois.map((p) => (p.id === id ? { ...p, ...validUpdates } : p)),
            selectedPOI:
              state.selectedPOI?.id === id
                ? { ...state.selectedPOI, ...validUpdates }
                : state.selectedPOI,
          };
        }),

      deletePOI: (id) =>
        set((state) => ({
          pois: state.pois.filter((p) => p.id !== id),
          selectedPOI: state.selectedPOI?.id === id ? null : state.selectedPOI,
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          pois: state.pois.map((p) =>
            p.id === id ? { ...p, favorite: !p.favorite } : p
          ),
          selectedPOI:
            state.selectedPOI?.id === id
              ? { ...state.selectedPOI, favorite: !state.selectedPOI.favorite }
              : state.selectedPOI,
        })),

      selectPOI: (poi) => set({ selectedPOI: poi }),
      hoverPOI: (id) => set({ hoveredPOIId: id }),
      setFilter: (update) =>
        set((state) => ({ filter: { ...state.filter, ...update } })),
      toggleCategory: (catId) =>
        set((state) => {
          const cats = state.filter.categories;
          return {
            filter: {
              ...state.filter,
              categories: cats.includes(catId)
                ? cats.filter((c) => c !== catId)
                : [...cats, catId],
            },
          };
        }),
      setMapBounds: (bounds) => set({ mapBounds: bounds }),
      setAddingMode: (mode) => set({ addingMode: mode }),
      setEditingPOI: (poi) => set({ editingPOI: poi }),
      setRelocatingPOI: (poi) => set({ relocatingPOI: poi }),
      importPOIs: (pois) =>
        set((state) => ({ pois: [...state.pois, ...pois] })),
      resetFilters: () => set({ filter: DEFAULT_FILTER }),
      highlightedGroup: null,
      setHighlightedGroup: (group) => set({ highlightedGroup: group }),
      setCollectionId: (id) => set({ collectionId: id }),
      setIsReadOnly: (v) => set({ isReadOnly: v }),
      setIsSaving: (v) => set({ isSaving: v }),

      addCategory: (name, color) =>
        set((state) => {
          const newCategory: Category = {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            color,
            isPredefined: false,
          };
          return {
            activeCategories: [...state.activeCategories, newCategory],
          };
        }),

      updateCategory: (id, name, color) =>
        set((state) => ({
          activeCategories: state.activeCategories.map((cat) =>
            cat.id === id ? { ...cat, name, color } : cat
          ),
        })),

      deleteCategory: (id) =>
        set((state) => {
          // Cannot delete 'other' category
          if (id === 'other') return state;

          // Delete category and reassign POIs to 'other'
          return {
            activeCategories: state.activeCategories.filter((cat) => cat.id !== id),
            pois: state.pois.map((poi) =>
              poi.category === id ? { ...poi, category: 'other' } : poi
            ),
            selectedPOI:
              state.selectedPOI?.category === id
                ? { ...state.selectedPOI, category: 'other' }
                : state.selectedPOI,
          };
        }),

      toggleCategoryActive: (id) =>
        set((state) => {
          // Cannot delete 'other' category
          if (id === 'other') return state;

          const categoryExists = state.activeCategories.some((cat) => cat.id === id);
          if (!categoryExists) {
            // Re-enable predefined category
            const predefined = PREDEFINED_CATEGORIES.find((cat) => cat.id === id);
            if (predefined) {
              return {
                activeCategories: [...state.activeCategories, predefined],
              };
            }
          } else {
            // Disable category and reassign POIs to 'other'
            return {
              activeCategories: state.activeCategories.filter((cat) => cat.id !== id),
              pois: state.pois.map((poi) =>
                poi.category === id ? { ...poi, category: 'other' } : poi
              ),
              selectedPOI:
                state.selectedPOI?.category === id
                  ? { ...state.selectedPOI, category: 'other' }
                  : state.selectedPOI,
            };
          }
          return state;
        }),

      loadSharedCollection: async (id) => {
        set({ isSaving: true });
        try {
          const { loadCollection } = await import('../lib/collections');
          const collection = await loadCollection(id);
          set({
            pois: collection.pois,
            collectionId: id,
            isReadOnly: true,
            selectedPOI: null,
            filter: DEFAULT_FILTER,
            activeCategories: collection.categories || PREDEFINED_CATEGORIES,
          });
        } catch (err) {
          console.error('Failed to load collection:', err);
          alert('Could not load the shared map. The link may be invalid or expired.');
        } finally {
          set({ isSaving: false });
        }
      },
      loadCollectionForEditing: async (id) => {
        set({ isSaving: true });
        try {
          const { loadCollection } = await import('../lib/collections');
          const collection = await loadCollection(id);
          set({
            pois: collection.pois,
            collectionId: id,
            isReadOnly: false,
            selectedPOI: null,
            filter: DEFAULT_FILTER,
            activeCategories: collection.categories || PREDEFINED_CATEGORIES,
          });
          window.history.replaceState({}, '', `?c=${id}`);
        } catch (err) {
          console.error('Failed to load collection:', err);
          alert('Could not load the map. Please try again.');
        } finally {
          set({ isSaving: false });
        }
      },
    }),
    {
      name: 'fieldnotes-store',
      partialize: (state) => ({ pois: state.pois, activeCategories: state.activeCategories }),
    }
  )
);
