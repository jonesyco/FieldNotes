import { useEffect, useMemo } from 'react';
import { fetchSequenceRoute } from '../lib/routing';
import type { POI } from '../types';
import { usePOIStore } from '../store/poiStore';

export function getOrderedSequencePois(
  pois: POI[],
  sequenceStartId: string | null,
  sequenceEndId: string | null
): POI[] {
  const includedPois = pois.filter((poi) => poi.includeInSequence);
  if (includedPois.length < 2) return includedPois;

  const startPoi = sequenceStartId
    ? includedPois.find((poi) => poi.id === sequenceStartId) ?? null
    : null;
  const endPoi = sequenceEndId
    ? includedPois.find((poi) => poi.id === sequenceEndId) ?? null
    : null;

  if (!startPoi && !endPoi) {
    return includedPois;
  }

  if (startPoi && endPoi && startPoi.id === endPoi.id) {
    const middlePois = includedPois.filter((poi) => poi.id !== startPoi.id);
    return [startPoi, ...middlePois, endPoi];
  }

  const middlePois = includedPois.filter(
    (poi) => poi.id !== startPoi?.id && poi.id !== endPoi?.id
  );

  return [
    ...(startPoi ? [startPoi] : []),
    ...middlePois,
    ...(endPoi ? [endPoi] : []),
  ];
}

export function useSequenceRoute() {
  const {
    pois,
    sequenceEnabled,
    sequenceStartId,
    sequenceEndId,
    setRouteGeometry,
    setRouteLoading,
    setRouteError,
  } = usePOIStore();
  const routePois = useMemo(
    () => getOrderedSequencePois(pois, sequenceStartId, sequenceEndId),
    [pois, sequenceStartId, sequenceEndId]
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
