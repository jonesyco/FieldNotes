import { useEffect, useRef } from 'react';
import { usePOIStore } from '../store/poiStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { updateCollection } from '../lib/collections';
import type { POI } from '../types';
import type { Category } from '../types/categories';

/**
 * Syncs the active collection with Supabase:
 * - Subscribes to Realtime updates from other collaborators.
 * - Debounce-saves local edits back to Supabase.
 *
 * Refs prevent the save→Realtime→save loop:
 *   skipNextRealtime: set before each save so our own echo is ignored.
 *   remoteUpdate: set when incoming Realtime data updates pois, so we
 *                 don't immediately re-save what we just received.
 *   prevCollectionId: detects when a collection is freshly loaded so the
 *                     initial set-pois doesn't trigger a spurious save.
 */
export function useCollectionSync() {
  const { pois, collectionId, activeCategories, replacePois } = usePOIStore();

  const skipNextRealtimeRef = useRef(false);
  const remoteUpdateRef = useRef(false);
  const prevCollectionIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Supabase Realtime — re-subscribe whenever the active collection changes
  useEffect(() => {
    if (!collectionId || !isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel(`collection-${collectionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'collections', filter: `id=eq.${collectionId}` },
        (payload) => {
          // Ignore our own update bouncing back from Supabase
          if (skipNextRealtimeRef.current) {
            skipNextRealtimeRef.current = false;
            return;
          }
          remoteUpdateRef.current = true;
          const row = payload.new as { pois: POI[]; categories?: Category[] };
          replacePois(row.pois, row.categories);
        }
      )
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [collectionId]);

  // Debounced auto-save — fires after local edits settle
  useEffect(() => {
    if (!collectionId || !isSupabaseConfigured) return;

    // Skip the initial trigger that fires when a collection is first loaded
    if (prevCollectionIdRef.current !== collectionId) {
      prevCollectionIdRef.current = collectionId;
      return;
    }

    // Skip if this pois update came from a remote Realtime event
    if (remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
      return;
    }

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      skipNextRealtimeRef.current = true;
      try {
        await updateCollection(collectionId, pois, activeCategories);
      } catch (err) {
        console.error('Auto-save failed:', err);
        skipNextRealtimeRef.current = false;
      }
    }, 1500);

    return () => clearTimeout(saveTimerRef.current);
  }, [pois, activeCategories, collectionId]);
}
