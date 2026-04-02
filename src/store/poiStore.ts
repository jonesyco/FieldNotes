import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { POI, FilterState, MapBounds, Category } from '../types';
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

  addPOI: (poi: Omit<POI, 'id' | 'createdAt' | 'favorite'>) => void;
  updatePOI: (id: string, updates: Partial<POI>) => void;
  deletePOI: (id: string) => void;
  toggleFavorite: (id: string) => void;
  selectPOI: (poi: POI | null) => void;
  hoverPOI: (id: string | null) => void;
  setFilter: (update: Partial<FilterState>) => void;
  toggleCategory: (cat: Category) => void;
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

      addPOI: (poiData) =>
        set((state) => ({
          pois: [
            {
              ...poiData,
              id: `poi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              createdAt: new Date().toISOString(),
              favorite: false,
            },
            ...state.pois,
          ],
        })),

      updatePOI: (id, updates) =>
        set((state) => ({
          pois: state.pois.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          selectedPOI:
            state.selectedPOI?.id === id
              ? { ...state.selectedPOI, ...updates }
              : state.selectedPOI,
        })),

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
      toggleCategory: (cat) =>
        set((state) => {
          const cats = state.filter.categories;
          return {
            filter: {
              ...state.filter,
              categories: cats.includes(cat)
                ? cats.filter((c) => c !== cat)
                : [...cats, cat],
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
      partialize: (state) => ({ pois: state.pois }),
    }
  )
);
