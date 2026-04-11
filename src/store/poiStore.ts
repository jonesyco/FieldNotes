import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { POI, FilterState, MapBounds, RouteGeometry } from '../types';
import type { CategoryId, Category } from '../types/categories';
import { PREDEFINED_CATEGORIES } from '../types/categories';

type DropPlacement = 'before' | 'after';

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
  syncError: string | null;
  sequenceEnabled: boolean;
  routeGeometry: RouteGeometry | null;
  routeLoading: boolean;
  routeError: string | null;
  pendingFlyTo: { center: [number, number]; zoom?: number; saveReturn?: boolean } | null;
  searchPreview: { lat: number; lng: number; label: string } | null;
  searchReturnTarget: { center: [number, number]; zoom: number } | null;
  activeCategories: Category[];

  addPOI: (poi: Omit<POI, 'id' | 'createdAt' | 'favorite'>) => void;
  updatePOI: (id: string, updates: Partial<POI>) => void;
  deletePOI: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleSequenceInclusion: (id: string) => void;
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
  replacePois: (pois: POI[], categories?: Category[], sequenceEnabled?: boolean) => void;
  setCollectionId: (id: string | null) => void;
  setIsSaving: (v: boolean) => void;
  setSyncError: (message: string | null) => void;
  setSequenceEnabled: (enabled: boolean) => void;
  reorderPOIs: (draggedId: string, targetId: string, placement: DropPlacement) => void;
  setRouteGeometry: (route: RouteGeometry | null) => void;
  setRouteLoading: (loading: boolean) => void;
  setRouteError: (message: string | null) => void;
  setFlyTo: (target: { center: [number, number]; zoom?: number; saveReturn?: boolean } | null) => void;
  setSearchPreview: (preview: { lat: number; lng: number; label: string } | null) => void;
  setSearchReturnTarget: (t: { center: [number, number]; zoom: number } | null) => void;
  loadSharedCollection: (id: string, viewerUserId?: string) => Promise<void>;
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

interface PersistedPOIStore {
  pois: POI[];
  activeCategories: Category[];
  sequenceEnabled: boolean;
}

function isStoredPOI(value: unknown): value is POI {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string'
  );
}

function isStoredCategory(value: unknown): value is Category {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'color' in value &&
    typeof value.color === 'string' &&
    'isPredefined' in value &&
    typeof value.isPredefined === 'boolean'
  );
}

function stripSeedPois(pois: POI[]): POI[] {
  return pois.filter((poi) => !poi.id.startsWith('seed-'));
}

function normalizePOI(poi: POI): POI {
  return {
    ...poi,
    includeInSequence: poi.includeInSequence ?? true,
  };
}

function normalizePOIs(pois: POI[]): POI[] {
  return stripSeedPois(pois).map(normalizePOI);
}

function migratePersistedState(persistedState: unknown): PersistedPOIStore {
  const state =
    typeof persistedState === 'object' && persistedState !== null
      ? (persistedState as Partial<Record<keyof PersistedPOIStore, unknown>>)
      : undefined;

  const pois = Array.isArray(state?.pois)
    ? normalizePOIs(state.pois.filter(isStoredPOI))
    : [];

  const activeCategories = Array.isArray(state?.activeCategories)
    ? state.activeCategories.filter(isStoredCategory)
    : PREDEFINED_CATEGORIES;

  const sequenceEnabled = typeof state?.sequenceEnabled === 'boolean' ? state.sequenceEnabled : false;

  return { pois, activeCategories, sequenceEnabled };
}

function movePoiById(pois: POI[], draggedId: string, targetId: string, placement: DropPlacement): POI[] {
  if (draggedId === targetId) return pois;

  const draggedIndex = pois.findIndex((poi) => poi.id === draggedId);
  const targetIndex = pois.findIndex((poi) => poi.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) return pois;

  const next = [...pois];
  const [draggedPoi] = next.splice(draggedIndex, 1);
  const targetIndexAfterRemoval = next.findIndex((poi) => poi.id === targetId);
  const insertIndex = placement === 'before' ? targetIndexAfterRemoval : targetIndexAfterRemoval + 1;

  next.splice(insertIndex, 0, draggedPoi);

  return next;
}

export const usePOIStore = create<POIStore>()(
  persist(
    (set) => ({
      pois: [],
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
      syncError: null,
      sequenceEnabled: false,
      routeGeometry: null,
      routeLoading: false,
      routeError: null,
      pendingFlyTo: null,
      searchPreview: null,
      searchReturnTarget: null,
      activeCategories: PREDEFINED_CATEGORIES,

      addPOI: (poiData) =>
        set((state) => {
          // Validate category exists in activeCategories
          const categoryExists = state.activeCategories.some((c) => c.id === poiData.category);
          const validCategory = categoryExists ? poiData.category : 'other';
          return {
            pois: [
              ...(state.sequenceEnabled ? state.pois : []),
              {
                ...poiData,
                category: validCategory,
                includeInSequence: poiData.includeInSequence ?? true,
                id: `poi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                createdAt: new Date().toISOString(),
                favorite: false,
              },
              ...(!state.sequenceEnabled ? state.pois : []),
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
      toggleSequenceInclusion: (id) =>
        set((state) => ({
          pois: state.pois.map((p) =>
            p.id === id ? { ...p, includeInSequence: !p.includeInSequence } : p
          ),
          selectedPOI:
            state.selectedPOI?.id === id
              ? { ...state.selectedPOI, includeInSequence: !state.selectedPOI.includeInSequence }
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
        set((state) => ({ pois: [...state.pois, ...normalizePOIs(pois)] })),
      resetFilters: () => set({ filter: DEFAULT_FILTER }),
      highlightedGroup: null,
      setHighlightedGroup: (group) => set({ highlightedGroup: group }),
      replacePois: (pois, categories, sequenceEnabled) =>
        set(() => ({
          pois: normalizePOIs(pois),
          ...(categories ? { activeCategories: categories } : {}),
          ...(typeof sequenceEnabled === 'boolean' ? { sequenceEnabled } : {}),
        })),
      setCollectionId: (id) => set({ collectionId: id }),
      setIsSaving: (v) => set({ isSaving: v }),
      setSyncError: (message) => set({ syncError: message }),
      setSequenceEnabled: (enabled) => set({ sequenceEnabled: enabled }),
      reorderPOIs: (draggedId, targetId, placement) =>
        set((state) => ({ pois: movePoiById(state.pois, draggedId, targetId, placement) })),
      setRouteGeometry: (route) => set({ routeGeometry: route }),
      setRouteLoading: (loading) => set({ routeLoading: loading }),
      setRouteError: (message) => set({ routeError: message }),
      setFlyTo: (target) => set({ pendingFlyTo: target }),
      setSearchPreview: (preview) => set({ searchPreview: preview }),
      setSearchReturnTarget: (t) => set({ searchReturnTarget: t }),

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

      loadSharedCollection: async (id, viewerUserId) => {
        set({ isSaving: true });
        try {
          const { loadCollection } = await import('../lib/collections');
          const collection = await loadCollection(id);
          const isOwner = Boolean(collection.user_id) && collection.user_id === viewerUserId;
          set({
            pois: normalizePOIs(collection.pois),
            collectionId: id,
            isReadOnly: !isOwner,
            selectedPOI: null,
            filter: DEFAULT_FILTER,
            activeCategories: collection.categories || PREDEFINED_CATEGORIES,
            syncError: null,
            sequenceEnabled: collection.sequence_enabled ?? false,
            routeGeometry: null,
            routeLoading: false,
            routeError: null,
          });
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
            pois: normalizePOIs(collection.pois),
            collectionId: id,
            isReadOnly: false,
            selectedPOI: null,
            filter: DEFAULT_FILTER,
            activeCategories: collection.categories || PREDEFINED_CATEGORIES,
            syncError: null,
            sequenceEnabled: collection.sequence_enabled ?? false,
            routeGeometry: null,
            routeLoading: false,
            routeError: null,
          });
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
      version: 2,
      migrate: migratePersistedState,
      partialize: (state) => ({
        pois: state.pois,
        activeCategories: state.activeCategories,
        sequenceEnabled: state.sequenceEnabled,
      }),
    }
  )
);
