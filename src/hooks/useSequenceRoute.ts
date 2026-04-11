import { useEffect, useMemo } from 'react';
import { fetchSequenceRoute } from '../lib/routing';
import { usePOIStore } from '../store/poiStore';

export function useSequenceRoute() {
  const {
    pois,
    sequenceEnabled,
    setRouteGeometry,
    setRouteLoading,
    setRouteError,
  } = usePOIStore();
  const routePois = useMemo(
    () => pois.filter((poi) => poi.includeInSequence),
    [pois]
  );

  useEffect(() => {
    if (!sequenceEnabled) {
      setRouteGeometry(null);
      setRouteLoading(false);
      setRouteError(null);
      return;
    }

    if (routePois.length < 2) {
      setRouteGeometry(null);
      setRouteLoading(false);
      setRouteError('CHECK AT LEAST TWO LOCATIONS TO DRAW A ROUTE.');
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setRouteLoading(true);
      setRouteError(null);

      try {
        const route = await fetchSequenceRoute(routePois, controller.signal);
        setRouteGeometry(route);
        setRouteError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'ROUTING FAILED.';
        setRouteGeometry(null);
        setRouteError(message);
      } finally {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [routePois, sequenceEnabled, setRouteError, setRouteGeometry, setRouteLoading]);
}
