import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import maplibregl from 'maplibre-gl';
import type { POI } from '../../types';

interface MistOverlayProps {
  enabled: boolean;
  map: maplibregl.Map | null;
  pois: POI[];
}

interface MistWisp {
  id: number;
  width: string;
  height: string;
  duration: string;
  delay: string;
  opacity: number;
  blur: string;
}

interface AnchoredMistWisp {
  lng: number;
  lat: number;
  velocityLng: number;
  velocityLat: number;
  respawnAt: number;
}

interface MistAnchor {
  lng: number;
  lat: number;
  weight: number;
}

const RIVER_CORRIDOR_POINTS: Array<[number, number]> = [
  [-122.6784, 45.5152],
  [-122.6718, 45.5292],
  [-122.6658, 45.5416],
  [-122.6612, 45.5574],
  [-122.7065, 45.6212],
  [-122.678, 45.5875],
];

const MIST_MAGNET_PATTERN = /park|garden|trail|forest|grove|water|river|bridge|waterfront|harbor|harbour|marsh|wetland|outdoor|green/i;

function buildWisp(index: number): MistWisp {
  const seed = (index * 37 + 17) % 100;
  return {
    id: index,
    width: `${180 + ((seed * 19) % 170)}px`,
    height: `${68 + ((seed * 13) % 64)}px`,
    duration: `${18 + (seed % 11)}s`,
    delay: `${-(seed % 9)}s`,
    opacity: 0.14 + ((seed % 6) * 0.035),
    blur: `${14 + (seed % 14)}px`,
  };
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickWeightedAnchor(anchors: MistAnchor[]): MistAnchor | null {
  const totalWeight = anchors.reduce((sum, anchor) => sum + anchor.weight, 0);
  if (totalWeight <= 0) return null;

  let threshold = Math.random() * totalWeight;
  for (const anchor of anchors) {
    threshold -= anchor.weight;
    if (threshold <= 0) return anchor;
  }

  return anchors[anchors.length - 1] ?? null;
}

function getDensityScore(target: POI, pois: POI[], lngSpan: number, latSpan: number) {
  const radiusLng = Math.max(lngSpan * 0.08, 0.004);
  const radiusLat = Math.max(latSpan * 0.08, 0.004);
  return pois.reduce((count, poi) => {
    if (poi.id === target.id) return count;
    const withinLng = Math.abs(poi.lng - target.lng) <= radiusLng;
    const withinLat = Math.abs(poi.lat - target.lat) <= radiusLat;
    return withinLng && withinLat ? count + 1 : count;
  }, 0);
}

function buildMistAnchors(map: maplibregl.Map, pois: POI[]): MistAnchor[] {
  const bounds = map.getBounds();
  const lngSpan = Math.max(Math.abs(bounds.getEast() - bounds.getWest()), 0.02);
  const latSpan = Math.max(Math.abs(bounds.getNorth() - bounds.getSouth()), 0.02);

  const poiAnchors = pois.map((poi) => {
    const searchable = `${poi.title} ${poi.tags.join(' ')} ${poi.neighborhood}`;
    const featureWeight = MIST_MAGNET_PATTERN.test(searchable) ? 4.5 : 1.3;
    const densityWeight = Math.min(getDensityScore(poi, pois, lngSpan, latSpan), 7) * 1.2;
    return {
      lng: poi.lng,
      lat: poi.lat,
      weight: featureWeight + densityWeight,
    };
  });

  const riverAnchors = RIVER_CORRIDOR_POINTS
    .filter(([lng, lat]) =>
      lng >= bounds.getWest() &&
      lng <= bounds.getEast() &&
      lat >= bounds.getSouth() &&
      lat <= bounds.getNorth()
    )
    .map(([lng, lat]) => ({ lng, lat, weight: 5.5 }));

  const fallbackAnchors: MistAnchor[] = [
    {
      lng: randomBetween(bounds.getWest(), bounds.getEast()),
      lat: randomBetween(bounds.getSouth(), bounds.getNorth()),
      weight: 1,
    },
    {
      lng: bounds.getCenter().lng,
      lat: bounds.getCenter().lat,
      weight: 1.25,
    },
  ];

  return [...poiAnchors, ...riverAnchors, ...fallbackAnchors];
}

function createAnchoredWisp(map: maplibregl.Map, anchors: MistAnchor[]): AnchoredMistWisp {
  const bounds = map.getBounds();
  const lngSpan = Math.max(Math.abs(bounds.getEast() - bounds.getWest()), 0.02);
  const latSpan = Math.max(Math.abs(bounds.getNorth() - bounds.getSouth()), 0.02);
  const anchor = pickWeightedAnchor(anchors);
  const anchorLng = anchor?.lng ?? randomBetween(bounds.getWest(), bounds.getEast());
  const anchorLat = anchor?.lat ?? randomBetween(bounds.getSouth(), bounds.getNorth());

  return {
    lng: anchorLng + randomBetween(-lngSpan * 0.03, lngSpan * 0.03),
    lat: anchorLat + randomBetween(-latSpan * 0.025, latSpan * 0.025),
    velocityLng: randomBetween(-lngSpan * 0.0012, lngSpan * 0.0012),
    velocityLat: randomBetween(-latSpan * 0.0009, latSpan * 0.0009),
    respawnAt: performance.now() + randomBetween(18000, 36000),
  };
}

export default function MistOverlay({ enabled, map, pois }: MistOverlayProps) {
  const wisps = useMemo(() => Array.from({ length: 11 }, (_, index) => buildWisp(index)), []);
  const wispRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const anchoredWispsRef = useRef<AnchoredMistWisp[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !map) {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      previousTimeRef.current = null;
      return;
    }

    const getAnchors = () => buildMistAnchors(map, pois);
    anchoredWispsRef.current = wisps.map(() => createAnchoredWisp(map, getAnchors()));

    const render = (timestamp: number) => {
      if (!map) return;

      const previousTime = previousTimeRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - previousTime) / 1000, 0.05);
      previousTimeRef.current = timestamp;

      const bounds = map.getBounds();
      const paddingLng = Math.max(Math.abs(bounds.getEast() - bounds.getWest()) * 0.08, 0.01);
      const paddingLat = Math.max(Math.abs(bounds.getNorth() - bounds.getSouth()) * 0.08, 0.01);
      const anchors = getAnchors();

      anchoredWispsRef.current.forEach((wisp, index) => {
        if (
          timestamp >= wisp.respawnAt ||
          wisp.lng < bounds.getWest() - paddingLng ||
          wisp.lng > bounds.getEast() + paddingLng ||
          wisp.lat < bounds.getSouth() - paddingLat ||
          wisp.lat > bounds.getNorth() + paddingLat
        ) {
          anchoredWispsRef.current[index] = createAnchoredWisp(map, anchors);
          wisp = anchoredWispsRef.current[index];
        } else {
          wisp.lng += wisp.velocityLng * deltaSeconds;
          wisp.lat += wisp.velocityLat * deltaSeconds;
        }

        const point = map.project([wisp.lng, wisp.lat]);
        const element = wispRefs.current[index];
        if (!element) return;

        element.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
      });

      animationFrameRef.current = window.requestAnimationFrame(render);
    };

    animationFrameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      previousTimeRef.current = null;
    };
  }, [enabled, map, pois, wisps]);

  return (
    <div className={`mist-overlay${enabled ? ' mist-overlay--visible' : ''}`} aria-hidden="true">
      {wisps.map((wisp) => (
        <span
          key={wisp.id}
          ref={(element) => {
            wispRefs.current[wisp.id] = element;
          }}
          className="mist-overlay__wisp"
          style={{
            width: wisp.width,
            height: wisp.height,
            animationDuration: wisp.duration,
            animationDelay: wisp.delay,
            opacity: wisp.opacity,
            filter: `blur(${wisp.blur})`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}