import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { usePOIStore } from '../../store/poiStore';
import { PORTLAND_CENTER, PORTLAND_DEFAULT_ZOOM } from '../../utils/geo';
import type { Theme } from '../../hooks/useTheme';
import type { POI, RouteGeometry } from '../../types';
import DecayOverlay from './DecayOverlay';
import MistOverlay from './MistOverlay';
import { getDisplayTitle, getSpookyMarkerGlyph } from '../../utils/spookyText';

const MAP_STYLES: Record<Theme, string> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

const UPSIDE_DOWN_STYLE = MAP_STYLES.dark;

// Colors for the fill-extrusion layer per theme
const BUILDING_COLORS: Record<Theme, { fill: string; base: string; opacity: number }> = {
  dark: { fill: '#2e2e2e', base: '#1a1a1a', opacity: 0.85 },
  light: { fill: '#c4cadb', base: '#b0b8cd', opacity: 0.70 },
};

const MIRROR_WORLD_BUILDING_COLORS = { fill: '#6b3328', base: '#1a0a0f', opacity: 0.94 };

// Water fill colors — override the basemap's default per theme
const WATER_COLORS: Record<Theme, string> = {
  dark: '#1a3a5c',  // deep steel blue — visible but fits dark palette
  light: '#a4cde4',  // soft classic-map blue
};

const MIRROR_WORLD_WATER_COLOR = '#1b0815';

// Green space colors — parks, grass, woods, nature reserves
const GREEN_COLORS: Record<Theme, { landcover: string; parks: string }> = {
  dark: { landcover: '#1c3022', parks: '#162a1c' },
  light: { landcover: '#c8e0bc', parks: '#b8d8a8' },
};

const MIRROR_WORLD_GREEN_COLORS = { landcover: '#2d180d', parks: '#1f0d0b' };

const MIRROR_WORLD_ROAD_COLORS = {
  major: '#a5562d',
  minor: '#5a2b20',
  boundary: '#261017',
  buildingOutline: '#1a0c11',
  label: '#f0b278',
  halo: '#14060d',
  background: '#0b0309',
};

const MIRROR_WORLD_MARKER_COLOR = '#d2642a';

type StyleLayer = NonNullable<ReturnType<maplibregl.Map['getStyle']>['layers']>[number];

function getSourceLayerName(layer: StyleLayer): string {
  const candidate = layer as StyleLayer & { 'source-layer'?: string };
  return typeof candidate['source-layer'] === 'string' ? candidate['source-layer'] : '';
}

function getSourceId(layer: StyleLayer): string {
  const candidate = layer as StyleLayer & { source?: string };
  return typeof candidate.source === 'string' ? candidate.source : '';
}

function getBuildingColors(theme: Theme, upsideDownMode: boolean) {
  return upsideDownMode ? MIRROR_WORLD_BUILDING_COLORS : BUILDING_COLORS[theme];
}

function getMapStyle(theme: Theme, upsideDownMode: boolean) {
  return upsideDownMode ? UPSIDE_DOWN_STYLE : MAP_STYLES[theme];
}

function getBuildingSourceId(upsideDownMode: boolean) {
  return upsideDownMode ? 'carto' : 'carto';
}

function getWaterColor(theme: Theme, upsideDownMode: boolean) {
  return upsideDownMode ? MIRROR_WORLD_WATER_COLOR : WATER_COLORS[theme];
}

function getGreenColors(theme: Theme, upsideDownMode: boolean) {
  return upsideDownMode ? MIRROR_WORLD_GREEN_COLORS : GREEN_COLORS[theme];
}

function getMarkerColor(upsideDownMode: boolean) {
  return upsideDownMode ? MIRROR_WORLD_MARKER_COLOR : DEFAULT_MARKER_COLOR;
}

function applyWaterColors(m: maplibregl.Map, t: Theme, upsideDownMode: boolean) {
  if (m.getLayer('water')) {
    m.setPaintProperty('water', 'fill-color', getWaterColor(t, upsideDownMode));
  }
}

function applyGreenSpaces(m: maplibregl.Map, t: Theme, upsideDownMode: boolean) {
  const { landcover, parks } = getGreenColors(t, upsideDownMode);
  const landcoverLayers = ['landcover'];
  const parkLayers = ['park_national_park', 'park_nature_reserve', 'landuse'];
  landcoverLayers.forEach(id => {
    if (m.getLayer(id)) m.setPaintProperty(id, 'fill-color', landcover);
  });
  parkLayers.forEach(id => {
    if (m.getLayer(id)) m.setPaintProperty(id, 'fill-color', parks);
  });
}

function applyMirrorWorldAtmosphere(m: maplibregl.Map) {
  const layers = m.getStyle().layers ?? [];

  layers.forEach((layer) => {
    const id = layer.id.toLowerCase();
    const sourceLayer = getSourceLayerName(layer).toLowerCase();

    if (layer.type === 'background') {
      m.setPaintProperty(layer.id, 'background-color', MIRROR_WORLD_ROAD_COLORS.background);
      return;
    }

    if (layer.type === 'fill') {
      if (id.includes('water') || sourceLayer.includes('water')) {
        m.setPaintProperty(layer.id, 'fill-color', MIRROR_WORLD_WATER_COLOR);
        m.setPaintProperty(layer.id, 'fill-opacity', 0.9);
        return;
      }

      if (id.includes('park') || sourceLayer.includes('park') || sourceLayer.includes('landuse')) {
        m.setPaintProperty(layer.id, 'fill-color', MIRROR_WORLD_GREEN_COLORS.parks);
        return;
      }

      if (id.includes('landcover') || sourceLayer.includes('landcover')) {
        m.setPaintProperty(layer.id, 'fill-color', MIRROR_WORLD_GREEN_COLORS.landcover);
        return;
      }

      if (id.includes('building') || sourceLayer.includes('building')) {
        m.setPaintProperty(layer.id, 'fill-color', MIRROR_WORLD_BUILDING_COLORS.base);
        m.setPaintProperty(layer.id, 'fill-opacity', 0.85);
      }
    }

    if (layer.type === 'line') {
      if (id.includes('building') || sourceLayer.includes('building') || id.includes('structure')) {
        m.setPaintProperty(layer.id, 'line-color', MIRROR_WORLD_ROAD_COLORS.buildingOutline);
        m.setPaintProperty(layer.id, 'line-opacity', 0.12);
        return;
      }

      if (id.includes('road') || id.includes('street') || id.includes('highway') || sourceLayer.includes('road')) {
        const isMajor =
          id.includes('highway') ||
          id.includes('motorway') ||
          id.includes('primary') ||
          id.includes('trunk');
        m.setPaintProperty(layer.id, 'line-color', isMajor ? MIRROR_WORLD_ROAD_COLORS.major : MIRROR_WORLD_ROAD_COLORS.minor);
        m.setPaintProperty(layer.id, 'line-opacity', isMajor ? 0.76 : 0.52);
        return;
      }

      if (id.includes('boundary') || sourceLayer.includes('boundary')) {
        m.setPaintProperty(layer.id, 'line-color', MIRROR_WORLD_ROAD_COLORS.boundary);
        m.setPaintProperty(layer.id, 'line-opacity', 0.35);
      }
    }

    if (layer.type === 'symbol' && getSourceId(layer) === 'carto') {
      m.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });
}

const BUILDING_LAYER_ID = 'fieldnotes-3d-buildings';
const BUILDING_PITCH = 50;

const TERRAIN_SOURCE_ID = 'fieldnotes-terrain';
const HILLSHADE_SOURCE_ID = 'fieldnotes-hillshade';
const HILLSHADE_LAYER_ID = 'fieldnotes-hillshade-layer';
const TERRAIN_PITCH = 65;
// AWS terrain tiles — global coverage, free, no API key required (Terrarium encoding)
const TERRAIN_TILES = ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'];

// Theme-aware hillshade shadow colors
const HILLSHADE_COLORS: Record<Theme, string> = {
  dark: '#0d0a04',
  light: '#473B24',
};

const MIRROR_WORLD_HILLSHADE_COLOR = '#13040a';

// Theme-aware sky colors (used with map.setSky() — v5 API)
const SKY_COLORS: Record<Theme, maplibregl.SkySpecification> = {
  dark: { 'sky-color': '#0d1b2e', 'horizon-color': '#1a3a5c', 'fog-color': '#0d1b2e' },
  light: { 'sky-color': '#87CEEB', 'horizon-color': '#b8d4f0', 'fog-color': '#c9e4f8' },
};

const MIRROR_WORLD_SKY: maplibregl.SkySpecification = {
  'sky-color': '#1a0c19',
  'horizon-color': '#4a1f1d',
  'fog-color': '#200c14',
};

const ROUTE_SOURCE_ID = 'fieldnotes-sequence-route';
const ROUTE_HIGHLIGHT_SOURCE_ID = 'fieldnotes-sequence-route-highlight-source';
const ROUTE_CASING_LAYER_ID = 'fieldnotes-sequence-route-casing';
const ROUTE_LAYER_ID = 'fieldnotes-sequence-route-line';
const ROUTE_HIGHLIGHT_LAYER_ID = 'fieldnotes-sequence-route-highlight';
const ROUTE_COLORS: Record<Theme, { line: string; casing: string; highlight: string }> = {
  dark: { line: '#ff9b54', casing: '#201008', highlight: '#fff4e6' },
  light: { line: '#d95f02', casing: '#ffffff', highlight: '#fff7cf' },
};
const MIRROR_WORLD_ROUTE_COLORS = { line: '#df6e29', casing: '#1a0908', highlight: '#ffd39d' };
const ROUTE_HIGHLIGHT_WINDOW = 0.16;
const ROUTE_ANIMATION_DURATION_MS = 2800;
const DEFAULT_MARKER_COLOR = '#e85d04';

function getSegmentDistance(a: [number, number], b: [number, number]) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function interpolateCoordinate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
}

function getPointAtDistance(
  coordinates: [number, number][],
  cumulativeDistances: number[],
  targetDistance: number
): [number, number] {
  if (targetDistance <= 0) return coordinates[0];
  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
  if (targetDistance >= totalDistance) return coordinates[coordinates.length - 1];

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const segmentStart = cumulativeDistances[index];
    const segmentEnd = cumulativeDistances[index + 1];
    if (targetDistance <= segmentEnd) {
      const segmentLength = segmentEnd - segmentStart;
      if (segmentLength === 0) return coordinates[index];
      const ratio = (targetDistance - segmentStart) / segmentLength;
      return interpolateCoordinate(coordinates[index], coordinates[index + 1], ratio);
    }
  }

  return coordinates[coordinates.length - 1];
}

function buildRouteHighlightSegment(route: RouteGeometry, progress: number): RouteGeometry | null {
  const coordinates = route.coordinates;
  if (coordinates.length < 2) return null;

  const cumulativeDistances = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    cumulativeDistances.push(
      cumulativeDistances[index - 1] + getSegmentDistance(coordinates[index - 1], coordinates[index])
    );
  }

  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
  if (totalDistance === 0) return null;

  const halfWindow = ROUTE_HIGHLIGHT_WINDOW / 2;
  const startDistance = Math.max(0, progress - halfWindow) * totalDistance;
  const endDistance = Math.min(1, progress + halfWindow) * totalDistance;

  const highlightCoordinates: [number, number][] = [
    getPointAtDistance(coordinates, cumulativeDistances, startDistance),
  ];

  for (let index = 1; index < coordinates.length - 1; index += 1) {
    const pointDistance = cumulativeDistances[index];
    if (pointDistance > startDistance && pointDistance < endDistance) {
      highlightCoordinates.push(coordinates[index]);
    }
  }

  highlightCoordinates.push(getPointAtDistance(coordinates, cumulativeDistances, endDistance));

  if (highlightCoordinates.length < 2) return null;

  return {
    type: 'LineString',
    coordinates: highlightCoordinates,
  };
}

interface MapViewProps {
  onMapClick: (lat: number, lng: number) => void;
  theme: Theme;
  initialCenter?: [number, number] | null;
}

function getVisibleMirrorWorldPois(map: maplibregl.Map | null, pois: POI[]) {
  if (!map) return [];
  const bounds = map.getBounds();
  return pois.filter((poi) =>
    poi.lng >= bounds.getWest() &&
    poi.lng <= bounds.getEast() &&
    poi.lat >= bounds.getSouth() &&
    poi.lat <= bounds.getNorth()
  );
}

export default function MapView({ onMapClick, theme, initialCenter }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const previewMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [buildings3D, setBuildings3D] = useState(false);
  const [terrain, setTerrain] = useState(false);

  const {
    pois,
    selectedPOI,
    hoveredPOIId,
    addingMode,
    setMapBounds,
    highlightedGroup,
    relocatingPOI,
    pendingFlyTo,
    setFlyTo,
    searchPreview,
    setSearchReturnTarget,
    sequenceEnabled,
    upsideDownMode,
    routeGeometry,
  } = usePOIStore();

  // Refs so callbacks and effects always read current values without stale closures
  const addingModeRef = useRef(addingMode);
  const relocatingPOIRef = useRef(relocatingPOI);
  const onMapClickRef = useRef(onMapClick);
  const buildings3DRef = useRef(buildings3D);
  const terrainRef = useRef(terrain);
  const themeRef = useRef(theme);
  const initialCenterRef = useRef(initialCenter ?? null);
  const poisRef = useRef(pois);
  const selectedPOIRef = useRef(selectedPOI);
  const hoveredPOIIdRef = useRef(hoveredPOIId);
  const highlightedGroupRef = useRef(highlightedGroup);
  const sequenceEnabledRef = useRef(sequenceEnabled);
  const upsideDownModeRef = useRef(upsideDownMode);
  const routeGeometryRef = useRef<RouteGeometry | null>(routeGeometry);
  useEffect(() => {
    addingModeRef.current = addingMode;
    relocatingPOIRef.current = relocatingPOI;
    onMapClickRef.current = onMapClick;
    buildings3DRef.current = buildings3D;
    terrainRef.current = terrain;
    themeRef.current = theme;
    initialCenterRef.current = initialCenter ?? null;
    poisRef.current = pois;
    selectedPOIRef.current = selectedPOI;
    hoveredPOIIdRef.current = hoveredPOIId;
    highlightedGroupRef.current = highlightedGroup;
    sequenceEnabledRef.current = sequenceEnabled;
    upsideDownModeRef.current = upsideDownMode;
    routeGeometryRef.current = routeGeometry;
  }, [addingMode, relocatingPOI, onMapClick, buildings3D, terrain, theme, initialCenter,
    pois, selectedPOI, hoveredPOIId, highlightedGroup, sequenceEnabled, upsideDownMode, routeGeometry]);

  // Add the fill-extrusion layer on top of existing building layers
  const addBuildingExtrusion = useCallback((m: maplibregl.Map, t: Theme, mirrorWorld: boolean) => {
    if (m.getLayer(BUILDING_LAYER_ID)) return; // already present
    const { fill, base, opacity } = getBuildingColors(t, mirrorWorld);
    m.addLayer({
      id: BUILDING_LAYER_ID,
      type: 'fill-extrusion',
      source: getBuildingSourceId(mirrorWorld),
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': [
          'interpolate', ['linear'],
          ['coalesce', ['get', 'render_height'], 0],
          0, base,
          20, fill,
          100, fill,
        ],
        'fill-extrusion-height': [
          'coalesce', ['get', 'render_height'], 0,
        ],
        'fill-extrusion-base': [
          'coalesce', ['get', 'render_min_height'], 0,
        ],
        'fill-extrusion-opacity': opacity,
      },
    });
  }, []);

  const addTerrain = useCallback((m: maplibregl.Map, t: Theme, mirrorWorld: boolean) => {
    // Use separate sources for terrain mesh and hillshade for better render quality
    if (!m.getSource(TERRAIN_SOURCE_ID)) {
      m.addSource(TERRAIN_SOURCE_ID, { type: 'raster-dem', tiles: TERRAIN_TILES, encoding: 'terrarium', tileSize: 256, maxzoom: 15 });
    }
    if (!m.getSource(HILLSHADE_SOURCE_ID)) {
      m.addSource(HILLSHADE_SOURCE_ID, { type: 'raster-dem', tiles: TERRAIN_TILES, encoding: 'terrarium', tileSize: 256, maxzoom: 15 });
    }

    if (!m.getLayer(HILLSHADE_LAYER_ID)) {
      m.addLayer({
        id: HILLSHADE_LAYER_ID,
        type: 'hillshade',
        source: HILLSHADE_SOURCE_ID,
        layout: { visibility: 'visible' },
        paint: { 'hillshade-shadow-color': mirrorWorld ? MIRROR_WORLD_HILLSHADE_COLOR : HILLSHADE_COLORS[t] },
      });
    }

    m.setSky(mirrorWorld ? MIRROR_WORLD_SKY : SKY_COLORS[t]);
    m.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.5 });
  }, []);

  const moveRouteLayersToTop = useCallback((m: maplibregl.Map) => {
    if (m.getLayer(ROUTE_CASING_LAYER_ID)) m.moveLayer(ROUTE_CASING_LAYER_ID);
    if (m.getLayer(ROUTE_LAYER_ID)) m.moveLayer(ROUTE_LAYER_ID);
    if (m.getLayer(ROUTE_HIGHLIGHT_LAYER_ID)) m.moveLayer(ROUTE_HIGHLIGHT_LAYER_ID);
  }, []);

  const removeRouteLayers = useCallback((m: maplibregl.Map) => {
    if (m.getLayer(ROUTE_HIGHLIGHT_LAYER_ID)) m.removeLayer(ROUTE_HIGHLIGHT_LAYER_ID);
    if (m.getLayer(ROUTE_LAYER_ID)) m.removeLayer(ROUTE_LAYER_ID);
    if (m.getLayer(ROUTE_CASING_LAYER_ID)) m.removeLayer(ROUTE_CASING_LAYER_ID);
    if (m.getSource(ROUTE_HIGHLIGHT_SOURCE_ID)) m.removeSource(ROUTE_HIGHLIGHT_SOURCE_ID);
    if (m.getSource(ROUTE_SOURCE_ID)) m.removeSource(ROUTE_SOURCE_ID);
  }, []);

  const upsertRouteLayers = useCallback((m: maplibregl.Map, t: Theme, mirrorWorld: boolean, route: RouteGeometry) => {
    const routeData = {
      type: 'Feature' as const,
      properties: {},
      geometry: route,
    };

    const existingSource = m.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(routeData);
    } else {
      m.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: routeData,
      });
    }

    const initialHighlightData = {
      type: 'Feature' as const,
      properties: {},
      geometry: buildRouteHighlightSegment(route, ROUTE_HIGHLIGHT_WINDOW / 2) ?? route,
    };
    const existingHighlightSource = m.getSource(ROUTE_HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (existingHighlightSource) {
      existingHighlightSource.setData(initialHighlightData);
    } else {
      m.addSource(ROUTE_HIGHLIGHT_SOURCE_ID, {
        type: 'geojson',
        data: initialHighlightData,
      });
    }

    const colors = mirrorWorld ? MIRROR_WORLD_ROUTE_COLORS : ROUTE_COLORS[t];

    if (!m.getLayer(ROUTE_CASING_LAYER_ID)) {
      m.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': colors.casing,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 5, 12, 8, 16, 12],
          'line-opacity': 0.9,
        },
      });
    }

    if (!m.getLayer(ROUTE_LAYER_ID)) {
      m.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': colors.line,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 12, 4, 16, 6],
          'line-opacity': 0.95,
        },
      });
    }

    if (!m.getLayer(ROUTE_HIGHLIGHT_LAYER_ID)) {
      m.addLayer({
        id: ROUTE_HIGHLIGHT_LAYER_ID,
        type: 'line',
        source: ROUTE_HIGHLIGHT_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': colors.highlight,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 6, 16, 8],
          'line-opacity': 1,
          'line-blur': 0.6,
        },
      });
    }

    m.setPaintProperty(ROUTE_CASING_LAYER_ID, 'line-color', colors.casing);
    m.setPaintProperty(ROUTE_LAYER_ID, 'line-color', colors.line);
    m.setPaintProperty(ROUTE_HIGHLIGHT_LAYER_ID, 'line-color', colors.highlight);
    moveRouteLayersToTop(m);
  }, [moveRouteLayersToTop]);

  const removeTerrain = useCallback((m: maplibregl.Map) => {
    m.setTerrain(null);
    m.setSky({});
    if (m.getLayer(HILLSHADE_LAYER_ID)) m.removeLayer(HILLSHADE_LAYER_ID);
    setTimeout(() => {
      if (m.getSource(HILLSHADE_SOURCE_ID)) m.removeSource(HILLSHADE_SOURCE_ID);
      if (m.getSource(TERRAIN_SOURCE_ID)) m.removeSource(TERRAIN_SOURCE_ID);
    }, 150);
  }, []);

  // Compute the CSS class string for a marker dot from the latest ref values
  const getDotClass = useCallback((poiId: string, group?: string) => {
    const isSelected = selectedPOIRef.current?.id === poiId;
    const isHovered = hoveredPOIIdRef.current === poiId;
    const isGroupLit = highlightedGroupRef.current != null && group === highlightedGroupRef.current;
    const isGroupDimmed = highlightedGroupRef.current != null && group !== highlightedGroupRef.current;
    return ['marker-dot',
      isSelected ? 'selected' : '',
      isHovered ? 'hovered' : '',
      isGroupLit ? 'group-lit' : '',
      isGroupDimmed ? 'group-dimmed' : '',
    ].filter(Boolean).join(' ');
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(themeRef.current, upsideDownModeRef.current),
      center: PORTLAND_CENTER,
      zoom: PORTLAND_DEFAULT_ZOOM,
      attributionControl: false,
      pitchWithRotate: true,
      maxPitch: 85,
    });
    map.current = m;
    setMapInstance(m);

    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    m.on('moveend', () => {
      const b = m.getBounds();
      setMapBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    });

    m.on('click', (e) => {
      if (addingModeRef.current || relocatingPOIRef.current) {
        onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
      }
    });

    // Re-apply water color + green spaces + 3D layers after any style reload
    m.on('style.load', () => {
      applyWaterColors(m, themeRef.current, upsideDownModeRef.current);
      applyGreenSpaces(m, themeRef.current, upsideDownModeRef.current);
      if (upsideDownModeRef.current) {
        applyMirrorWorldAtmosphere(m);
      }
      if (buildings3DRef.current) {
        addBuildingExtrusion(m, themeRef.current, upsideDownModeRef.current);
      }
      if (terrainRef.current) {
        addTerrain(m, themeRef.current, upsideDownModeRef.current);
      }
      if (sequenceEnabledRef.current && routeGeometryRef.current) {
        upsertRouteLayers(m, themeRef.current, upsideDownModeRef.current, routeGeometryRef.current);
      }
    });

    const liveMarkers = markersRef.current;

    return () => {
      liveMarkers.forEach((mk) => mk.remove());
      liveMarkers.clear();
      previewMarkerRef.current?.remove();
      previewMarkerRef.current = null;
      m.remove();
      map.current = null;
      setMapInstance(null);
    };
  }, [setMapBounds, addBuildingExtrusion, addTerrain, upsertRouteLayers]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.setStyle(getMapStyle(themeRef.current, upsideDownMode));
  }, [upsideDownMode]);

  // Toggle 3D terrain on/off
  const toggleTerrain = useCallback(() => {
    const m = map.current;
    if (!m) return;
    const next = !terrainRef.current;
    setTerrain(next);

    if (next) {
      m.easeTo({ pitch: TERRAIN_PITCH, duration: 700 });
      if (m.isStyleLoaded()) addTerrain(m, themeRef.current, upsideDownModeRef.current);
    } else {
      m.easeTo({ pitch: buildings3DRef.current ? BUILDING_PITCH : 0, duration: 500 });
      if (m.isStyleLoaded()) removeTerrain(m);
    }
  }, [addTerrain, removeTerrain]);

  // Toggle 3D buildings on/off
  const toggle3D = useCallback(() => {
    const m = map.current;
    if (!m) return;
    const next = !buildings3DRef.current;
    setBuildings3D(next);

    if (next) {
      // Tilt and zoom in slightly so buildings are dramatic
      m.easeTo({ pitch: BUILDING_PITCH, zoom: Math.max(m.getZoom(), 15), duration: 600 });
      if (m.isStyleLoaded()) {
        addBuildingExtrusion(m, themeRef.current, upsideDownModeRef.current);
        moveRouteLayersToTop(m);
      }
    } else {
      m.easeTo({ pitch: 0, duration: 500 });
      if (m.getLayer(BUILDING_LAYER_ID)) m.removeLayer(BUILDING_LAYER_ID);
    }
  }, [addBuildingExtrusion, moveRouteLayersToTop]);

  // Update cursor based on adding/relocating mode
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = (addingMode || relocatingPOI) ? 'crosshair' : '';
  }, [addingMode, relocatingPOI]);

  // Add/remove/reposition markers when POI list changes (structural sync only)
  useEffect(() => {
    if (!map.current) return;
    const currentIds = new Set(pois.map((p) => p.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
    });

    pois.forEach((poi) => {
      const displayTitle = getDisplayTitle(poi.title, upsideDownMode);
      if (!markersRef.current.has(poi.id)) {
        const el = document.createElement('div');
        el.className = upsideDownMode ? 'poi-marker poi-marker--upside-down' : 'poi-marker';
        el.style.setProperty('--marker-color', getMarkerColor(upsideDownMode));

        const inner = document.createElement('div');
        inner.className = upsideDownMode ? 'poi-marker-inner poi-marker-inner--upside-down' : 'poi-marker-inner';
        inner.dataset.label = displayTitle;

        const dot = document.createElement('div');
        dot.className = getDotClass(poi.id, poi.group);
        inner.appendChild(dot);

        const glyph = document.createElement('span');
        glyph.className = 'marker-glyph';
        glyph.textContent = upsideDownMode ? getSpookyMarkerGlyph(poi.title, poi.tags) : '';
        inner.appendChild(glyph);
        el.appendChild(inner);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = usePOIStore.getState().pois.find((x) => x.id === poi.id);
          if (p) usePOIStore.getState().selectPOI(p);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([poi.lng, poi.lat])
          .addTo(map.current!);

        markersRef.current.set(poi.id, marker);
      } else {
        const marker = markersRef.current.get(poi.id)!;
        marker.setLngLat([poi.lng, poi.lat]);
        const element = marker.getElement();
        element.className = upsideDownMode ? 'poi-marker poi-marker--upside-down' : 'poi-marker';
        element.style.setProperty('--marker-color', getMarkerColor(upsideDownMode));
        const inner = element.querySelector('.poi-marker-inner');
        if (inner instanceof HTMLDivElement) {
          inner.className = upsideDownMode ? 'poi-marker-inner poi-marker-inner--upside-down' : 'poi-marker-inner';
          inner.dataset.label = displayTitle;
        }
        const glyph = element.querySelector('.marker-glyph');
        if (glyph) glyph.textContent = upsideDownMode ? getSpookyMarkerGlyph(poi.title, poi.tags) : '';
        const dot = element.querySelector('.marker-dot');
        if (dot) dot.className = getDotClass(poi.id, poi.group);
      }
    });
  }, [pois, getDotClass, upsideDownMode]);

  // Update marker visual state when selection/hover/group changes (no DOM creation)
  useEffect(() => {
    if (!map.current) return;
    poisRef.current.forEach((poi) => {
      const dot = markersRef.current.get(poi.id)?.getElement().querySelector('.marker-dot');
      if (dot) dot.className = getDotClass(poi.id, poi.group);
    });
  }, [selectedPOI?.id, hoveredPOIId, highlightedGroup, getDotClass]);

  // Fly to selected POI
  useEffect(() => {
    if (!map.current || !selectedPOI) return;
    map.current.flyTo({
      center: [selectedPOI.lng, selectedPOI.lat],
      zoom: Math.max(map.current.getZoom(), 14),
      duration: 700,
    });
  }, [selectedPOI]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    if (!sequenceEnabled || !routeGeometry) {
      removeRouteLayers(map.current);
      return;
    }

    upsertRouteLayers(map.current, theme, upsideDownMode, routeGeometry);
  }, [sequenceEnabled, routeGeometry, theme, upsideDownMode, removeRouteLayers, upsertRouteLayers]);

  useEffect(() => {
    if (!sequenceEnabled || !routeGeometry || !map.current) return;

    let animationFrameId = 0;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      const m = map.current;
      if (!m?.getLayer(ROUTE_HIGHLIGHT_LAYER_ID)) {
        animationFrameId = window.requestAnimationFrame(animate);
        return;
      }

      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % ROUTE_ANIMATION_DURATION_MS) / ROUTE_ANIMATION_DURATION_MS;
      const highlightSource = m.getSource(ROUTE_HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (highlightSource) {
        highlightSource.setData({
          type: 'Feature',
          properties: {},
          geometry: buildRouteHighlightSegment(routeGeometry, progress) ?? routeGeometry,
        });
      }
      animationFrameId = window.requestAnimationFrame(animate);
    };
    animationFrameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [sequenceEnabled, routeGeometry, theme, upsideDownMode]);

  // Fly to geocoded location from LocationSearch
  useEffect(() => {
    if (!map.current || !pendingFlyTo) return;
    if (pendingFlyTo.saveReturn) {
      const c = map.current.getCenter();
      setSearchReturnTarget({ center: [c.lng, c.lat], zoom: map.current.getZoom() });
    }
    map.current.flyTo({ center: pendingFlyTo.center, zoom: pendingFlyTo.zoom ?? 13, duration: 900 });
    setFlyTo(null);
  }, [pendingFlyTo, setFlyTo, setSearchReturnTarget]);

  // Fly to user's geolocation when it becomes available (after initial render)
  const hasFlewToGeo = useRef(false);
  useEffect(() => {
    if (initialCenter && map.current && !hasFlewToGeo.current) {
      hasFlewToGeo.current = true;
      map.current.flyTo({ center: initialCenter, zoom: 13, duration: 1200 });
    }
  }, [initialCenter]);

  const handleRecenter = useCallback(() => {
    const center = initialCenterRef.current ?? PORTLAND_CENTER;
    map.current?.flyTo({ center, zoom: PORTLAND_DEFAULT_ZOOM, pitch: 0, duration: 800 });
  }, []);

  useEffect(() => {
    if (previewMarkerRef.current) {
      previewMarkerRef.current.remove();
      previewMarkerRef.current = null;
    }
    if (!searchPreview || !map.current) return;
    const el = document.createElement('div');
    el.className = 'search-preview-marker';
    previewMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([searchPreview.lng, searchPreview.lat])
      .addTo(map.current);
    return () => {
      previewMarkerRef.current?.remove();
      previewMarkerRef.current = null;
    };
  }, [searchPreview]);

  const showMirrorWorld = upsideDownMode;
  const visibleMirrorWorldPois = getVisibleMirrorWorldPois(mapInstance, pois);

  return (
    <div className="map-stage">
      <div
        className={[
          'map-world',
          showMirrorWorld ? 'map-world--mirror' : '',
          showMirrorWorld ? 'map-world--upside-down' : '',
        ].filter(Boolean).join(' ')}
      >
        <div ref={mapContainer} className="map-world__canvas" />
        <MistOverlay enabled={showMirrorWorld} map={mapInstance} pois={visibleMirrorWorldPois} />
        <DecayOverlay enabled={showMirrorWorld} map={mapInstance} pois={visibleMirrorWorldPois} />
        <div className="map-vignette" aria-hidden="true" />
      </div>
      <div className="map-controls">
        <button
          className={`map-ctrl-btn${terrain ? ' map-ctrl-btn--active' : ''}`}
          onClick={toggleTerrain}
          title={terrain ? 'Disable 3D terrain' : 'Enable 3D terrain'}
          aria-pressed={terrain}
        >
          ⛰ TERRAIN
        </button>
        <button
          className={`map-ctrl-btn${buildings3D ? ' map-ctrl-btn--active' : ''}`}
          onClick={toggle3D}
          title={buildings3D ? 'Disable 3D buildings' : 'Enable 3D buildings'}
          aria-pressed={buildings3D}
        >
          3D
        </button>
        <button className="map-ctrl-btn" onClick={handleRecenter} title="Return to home location">
          ⊕ HOME
        </button>
      </div>
    </div>
  );
}
