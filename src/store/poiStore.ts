import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { POI, FilterState, MapBounds, RouteGeometry } from '../types';
import { dedupeTags, getLegacyCategoryTag } from '../utils/tags';

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
  sequenceStartId: string | null;
  sequenceEndId: string | null;
  routeGeometry: RouteGeometry | null;
  routeLoading: boolean;
  routeError: string | null;
  pendingFlyTo: { center: [number, number]; zoom?: number; saveReturn?: boolean } | null;
  searchPreview: { lat: number; lng: number; label: string } | null;
  searchReturnTarget: { center: [number, number]; zoom: number } | null;

  addPOI: (poi: Omit<POI, 'id' | 'createdAt' | 'favorite'>) => void;
  updatePOI: (id: string, updates: Partial<POI>) => void;
  deletePOI: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleSequenceInclusion: (id: string) => void;
  selectPOI: (poi: POI | null) => void;
  hoverPOI: (id: string | null) => void;
  setFilter: (update: Partial<FilterState>) => void;
  toggleTag: (tag: string) => void;
  setMapBounds: (bounds: MapBounds) => void;
  setAddingMode: (mode: boolean) => void;
  setEditingPOI: (poi: POI | null) => void;
  relocatingPOI: POI | null;
  setRelocatingPOI: (poi: POI | null) => void;
  importPOIs: (pois: POI[]) => void;
  resetFilters: () => void;
  highlightedGroup: string | null;
  setHighlightedGroup: (group: string | null) => void;
  replacePois: (
    pois: POI[],
    sequenceEnabled?: boolean,
    sequenceStartId?: string | null,
    sequenceEndId?: string | null
  ) => void;
  setCollectionId: (id: string | null) => void;
  setIsSaving: (v: boolean) => void;
  setSyncError: (message: string | null) => void;
  setSequenceEnabled: (enabled: boolean) => void;
  setSequenceStartId: (id: string | null) => void;
  setSequenceEndId: (id: string | null) => void;
  reorderPOIs: (draggedId: string, targetId: string, placement: DropPlacement) => void;
  setRouteGeometry: (route: RouteGeometry | null) => void;
  setRouteLoading: (loading: boolean) => void;
  setRouteError: (message: string | null) => void;
  setFlyTo: (target: { center: [number, number]; zoom?: number; saveReturn?: boolean } | null) => void;
  setSearchPreview: (preview: { lat: number; lng: number; label: string } | null) => void;
  setSearchReturnTarget: (t: { center: [number, number]; zoom: number } | null) => void;
  loadSharedCollection: (id: string, viewerUserId?: string) => Promise<void>;
  loadCollectionForEditing: (id: string) => Promise<void>;
}

const DEFAULT_FILTER: FilterState = {
  search: '',
  tags: [],
  favoritesOnly: false,
  inBoundsOnly: false,
  sort: 'newest',
};

interface PersistedPOIStore {
  pois: POI[];
  sequenceEnabled: boolean;
  sequenceStartId: string | null;
  sequenceEndId: string | null;
}

type StoredPOI = POI & { category?: unknown; tags?: unknown };

function isStoredPOI(value: unknown): value is StoredPOI {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string'
  );
}

function stripSeedPois(pois: StoredPOI[]): StoredPOI[] {
  return pois.filter((poi) => !poi.id.startsWith('seed-'));
}

function normalizePOI(poi: StoredPOI): POI {
  const rawTags = Array.isArray(poi.tags)
    ? poi.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
  const legacyCategoryTag = getLegacyCategoryTag(poi.category);

  return {
    ...poi,
    includeInSequence: poi.includeInSequence ?? true,
    tags: dedupeTags(legacyCategoryTag ? [...rawTags, legacyCategoryTag] : rawTags),
  };
}

function normalizePOIs(pois: StoredPOI[]): POI[] {
  return stripSeedPois(pois).map(normalizePOI);
}

function sanitizeSequenceEndpointId(pois: POI[], id: string | null | undefined): string | null {
  if (!id) return null;
  return pois.some((poi) => poi.id === id && poi.includeInSequence) ? id : null;
}

function sanitizeSequenceEndpoints(
  pois: POI[],
  sequenceStartId: string | null | undefined,
  sequenceEndId: string | null | undefined
) {
  return {
    sequenceStartId: sanitizeSequenceEndpointId(pois, sequenceStartId),
    sequenceEndId: sanitizeSequenceEndpointId(pois, sequenceEndId),
  };
}

function migratePersistedState(persistedState: unknown): PersistedPOIStore {
  const state =
    typeof persistedState === 'object' && persistedState !== null
      ? (persistedState as Partial<Record<keyof PersistedPOIStore | 'activeCategories', unknown>>)
      : undefined;

  const pois = Array.isArray(state?.pois)
    ? normalizePOIs(state.pois.filter(isStoredPOI))
    : [];

  const sequenceEnabled = typeof state?.sequenceEnabled === 'boolean' ? state.sequenceEnabled : false;
  const sequenceStartId = typeof state?.sequenceStartId === 'string' ? state.sequenceStartId : null;
  const sequenceEndId = typeof state?.sequenceEndId === 'string' ? state.sequenceEndId : null;

  const endpoints = sanitizeSequenceEndpoints(pois, sequenceStartId, sequenceEndId);

  return { pois, sequenceEnabled, ...endpoints };
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

function normalizeFilterState(filter: Partial<FilterState> | undefined): FilterState {
  return {
    search: typeof filter?.search === 'string' ? filter.search : DEFAULT_FILTER.search,
    tags: Array.isArray(filter?.tags)
      ? filter.tags.filter((tag): tag is string => typeof tag === 'string')
      : DEFAULT_FILTER.tags,
    favoritesOnly: typeof filter?.favoritesOnly === 'boolean' ? filter.favoritesOnly : DEFAULT_FILTER.favoritesOnly,
    inBoundsOnly: typeof filter?.inBoundsOnly === 'boolean' ? filter.inBoundsOnly : DEFAULT_FILTER.inBoundsOnly,
    sort:
      filter?.sort === 'newest' ||
      filter?.sort === 'alphabetical' ||
      filter?.sort === 'tag' ||
      filter?.sort === 'neighborhood'
        ? filter.sort
        : DEFAULT_FILTER.sort,
  };
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
      sequenceStartId: null,
      sequenceEndId: null,
      routeGeometry: null,
      routeLoading: false,
      routeError: null,
      pendingFlyTo: null,
      searchPreview: null,
      searchReturnTarget: null,

      addPOI: (poiData) =>
        set((state) => ({
          pois: [
            ...(state.sequenceEnabled ? state.pois : []),
            {
              ...poiData,
              tags: dedupeTags(poiData.tags),
              includeInSequence: poiData.includeInSequence ?? true,
              id: `poi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              createdAt: new Date().toISOString(),
              favorite: false,
            },
            ...(!state.sequenceEnabled ? state.pois : []),
          ],
        })),

      updatePOI: (id, updates) =>
        set((state) => {
          const pois = state.pois.map((p) =>
            p.id === id
              ? { ...p, ...updates, ...(updates.tags ? { tags: dedupeTags(updates.tags) } : {}) }
              : p
          );
          const endpoints = sanitizeSequenceEndpoints(pois, state.sequenceStartId, state.sequenceEndId);

          return {
            pois,
            sequenceStartId: endpoints.sequenceStartId,
            sequenceEndId: endpoints.sequenceEndId,
            selectedPOI:
              state.selectedPOI?.id === id
                ? {
                    ...state.selectedPOI,
                    ...updates,
                    ...(updates.tags ? { tags: dedupeTags(updates.tags) } : {}),
                  }
                : state.selectedPOI,
          };
        }),

      deletePOI: (id) =>
        set((state) => {
          const pois = state.pois.filter((p) => p.id !== id);
          const endpoints = sanitizeSequenceEndpoints(pois, state.sequenceStartId, state.sequenceEndId);

          return {
            pois,
            sequenceStartId: endpoints.sequenceStartId,
            sequenceEndId: endpoints.sequenceEndId,
            selectedPOI: state.selectedPOI?.id === id ? null : state.selectedPOI,
          };
        }),

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
        set((state) => {
          const pois = state.pois.map((p) =>
            p.id === id ? { ...p, includeInSequence: !p.includeInSequence } : p
          );
          const endpoints = sanitizeSequenceEndpoints(pois, state.sequenceStartId, state.sequenceEndId);

          return {
            pois,
            sequenceStartId: endpoints.sequenceStartId,
            sequenceEndId: endpoints.sequenceEndId,
            selectedPOI:
              state.selectedPOI?.id === id
                ? { ...state.selectedPOI, includeInSequence: !state.selectedPOI.includeInSequence }
                : state.selectedPOI,
          };
        }),

      selectPOI: (poi) => set({ selectedPOI: poi }),
      hoverPOI: (id) => set({ hoveredPOIId: id }),
      setFilter: (update) =>
        set((state) => ({ filter: normalizeFilterState({ ...normalizeFilterState(state.filter), ...update }) })),
      toggleTag: (tag) =>
        set((state) => {
          const filter = normalizeFilterState(state.filter);
          const normalizedTag = tag.toLowerCase();
          const tags = filter.tags;
          return {
            filter: {
              ...filter,
              tags: tags.some((value) => value.toLowerCase() === normalizedTag)
                ? tags.filter((value) => value.toLowerCase() !== normalizedTag)
                : [...tags, tag],
            },
          };
        }),
      setMapBounds: (bounds) => set({ mapBounds: bounds }),
      setAddingMode: (mode) => set({ addingMode: mode }),
      setEditingPOI: (poi) => set({ editingPOI: poi }),
      setRelocatingPOI: (poi) => set({ relocatingPOI: poi }),
      importPOIs: (pois) =>
        set((state) => ({ pois: [...state.pois, ...normalizePOIs(pois as StoredPOI[])] })),
      resetFilters: () => set({ filter: normalizeFilterState(DEFAULT_FILTER) }),
      highlightedGroup: null,
      setHighlightedGroup: (group) => set({ highlightedGroup: group }),
      replacePois: (pois, sequenceEnabled, sequenceStartId, sequenceEndId) =>
        set(() => {
          const normalizedPois = normalizePOIs(pois as StoredPOI[]);
          const endpoints = sanitizeSequenceEndpoints(normalizedPois, sequenceStartId, sequenceEndId);

          return {
            pois: normalizedPois,
            sequenceStartId: endpoints.sequenceStartId,
            sequenceEndId: endpoints.sequenceEndId,
            ...(typeof sequenceEnabled === 'boolean' ? { sequenceEnabled } : {}),
          };
        }),
      setCollectionId: (id) => set({ collectionId: id }),
      setIsSaving: (v) => set({ isSaving: v }),
      setSyncError: (message) => set({ syncError: message }),
      setSequenceEnabled: (enabled) =>
        set(() => ({
          sequenceEnabled: enabled,
          ...(!enabled
            ? {
                routeGeometry: null,
                routeLoading: false,
                routeError: null,
              }
            : {}),
        })),
      setSequenceStartId: (id) =>
        set((state) => ({
          sequenceStartId: sanitizeSequenceEndpointId(state.pois, id),
        })),
      setSequenceEndId: (id) =>
        set((state) => ({
          sequenceEndId: sanitizeSequenceEndpointId(state.pois, id),
        })),
      reorderPOIs: (draggedId, targetId, placement) =>
        set((state) => ({ pois: movePoiById(state.pois, draggedId, targetId, placement) })),
      setRouteGeometry: (route) => set({ routeGeometry: route }),
      setRouteLoading: (loading) => set({ routeLoading: loading }),
      setRouteError: (message) => set({ routeError: message }),
      setFlyTo: (target) => set({ pendingFlyTo: target }),
      setSearchPreview: (preview) => set({ searchPreview: preview }),
      setSearchReturnTarget: (t) => set({ searchReturnTarget: t }),

      loadSharedCollection: async (id, viewerUserId) => {
        set({ isSaving: true });
        try {
          const { loadCollection } = await import('../lib/collections');
          const collection = await loadCollection(id);
          const isOwner = Boolean(collection.user_id) && collection.user_id === viewerUserId;
          set({
            pois: normalizePOIs(collection.pois as StoredPOI[]),
            collectionId: id,
            isReadOnly: !isOwner,
            selectedPOI: null,
            filter: normalizeFilterState(DEFAULT_FILTER),
            syncError: null,
            sequenceEnabled: collection.sequence_enabled ?? false,
            sequenceStartId: null,
            sequenceEndId: null,
            routeGeometry: null,
            routeLoading: false,
            routeError: null,
          });
          set((state) => sanitizeSequenceEndpoints(
            state.pois,
            collection.sequence_start_id,
            collection.sequence_end_id
          ));
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
            pois: normalizePOIs(collection.pois as StoredPOI[]),
            collectionId: id,
            isReadOnly: false,
            selectedPOI: null,
            filter: normalizeFilterState(DEFAULT_FILTER),
            syncError: null,
            sequenceEnabled: collection.sequence_enabled ?? false,
            sequenceStartId: null,
            sequenceEndId: null,
            routeGeometry: null,
            routeLoading: false,
            routeError: null,
          });
          set((state) => sanitizeSequenceEndpoints(
            state.pois,
            collection.sequence_start_id,
            collection.sequence_end_id
          ));
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
      version: 4,
      migrate: migratePersistedState,
      partialize: (state) => ({
        pois: state.pois,
        sequenceEnabled: state.sequenceEnabled,
        sequenceStartId: state.sequenceStartId,
        sequenceEndId: state.sequenceEndId,
      }),
    }
  )
);
