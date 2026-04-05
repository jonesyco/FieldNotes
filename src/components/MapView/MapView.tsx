import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { usePOIStore } from '../../store/poiStore';
import { getCategoryColorById } from '../../types/categories';
import { PORTLAND_CENTER, PORTLAND_DEFAULT_ZOOM } from '../../utils/geo';
import type { Theme } from '../../hooks/useTheme';

const MAP_STYLES: Record<Theme, string> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

// Colors for the fill-extrusion layer per theme
const BUILDING_COLORS: Record<Theme, { fill: string; base: string; opacity: number }> = {
  dark: { fill: '#2e2e2e', base: '#1a1a1a', opacity: 0.85 },
  light: { fill: '#c4cadb', base: '#b0b8cd', opacity: 0.70 },
};

// Water fill colors — override the basemap's default per theme
const WATER_COLORS: Record<Theme, string> = {
  dark: '#1a3a5c',  // deep steel blue — visible but fits dark palette
  light: '#a4cde4',  // soft classic-map blue
};

// Green space colors — parks, grass, woods, nature reserves
const GREEN_COLORS: Record<Theme, { landcover: string; parks: string }> = {
  dark: { landcover: '#1c3022', parks: '#162a1c' },
  light: { landcover: '#c8e0bc', parks: '#b8d8a8' },
};

function applyWaterColors(m: maplibregl.Map, t: Theme) {
  if (m.getLayer('water')) {
    m.setPaintProperty('water', 'fill-color', WATER_COLORS[t]);
  }
}

function applyGreenSpaces(m: maplibregl.Map, t: Theme) {
  const { landcover, parks } = GREEN_COLORS[t];
  const landcoverLayers = ['landcover'];
  const parkLayers = ['park_national_park', 'park_nature_reserve', 'landuse'];
  landcoverLayers.forEach(id => {
    if (m.getLayer(id)) m.setPaintProperty(id, 'fill-color', landcover);
  });
  parkLayers.forEach(id => {
    if (m.getLayer(id)) m.setPaintProperty(id, 'fill-color', parks);
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

// Theme-aware sky colors (used with map.setSky() — v5 API)
const SKY_COLORS: Record<Theme, maplibregl.SkySpecification> = {
  dark: { 'sky-color': '#0d1b2e', 'horizon-color': '#1a3a5c', 'fog-color': '#0d1b2e' },
  light: { 'sky-color': '#87CEEB', 'horizon-color': '#b8d4f0', 'fog-color': '#c9e4f8' },
};

interface MapViewProps {
  onMapClick: (lat: number, lng: number) => void;
  theme: Theme;
  initialCenter?: [number, number] | null;
}

export default function MapView({ onMapClick, theme, initialCenter }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [buildings3D, setBuildings3D] = useState(false);
  const [terrain, setTerrain] = useState(false);

  const { pois, selectedPOI, hoveredPOIId, addingMode, setMapBounds, highlightedGroup, relocatingPOI, activeCategories, pendingFlyTo, setFlyTo, searchPreview, setSearchReturnTarget } = usePOIStore();

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
  const activeCategoriesRef = useRef(activeCategories);
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
    activeCategoriesRef.current = activeCategories;
  }, [addingMode, relocatingPOI, onMapClick, buildings3D, terrain, theme, initialCenter,
    pois, selectedPOI, hoveredPOIId, highlightedGroup, activeCategories]);

  // Add the fill-extrusion layer on top of existing building layers
  const addBuildingExtrusion = useCallback((m: maplibregl.Map, t: Theme) => {
    if (m.getLayer(BUILDING_LAYER_ID)) return; // already present
    const { fill, base, opacity } = BUILDING_COLORS[t];
    m.addLayer({
      id: BUILDING_LAYER_ID,
      type: 'fill-extrusion',
      source: 'carto',
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

  const addTerrain = useCallback((m: maplibregl.Map, t: Theme) => {
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
        paint: { 'hillshade-shadow-color': HILLSHADE_COLORS[t] },
      });
    }

    m.setSky(SKY_COLORS[t]);
    m.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.5 });
  }, []);

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
      style: MAP_STYLES[themeRef.current],
      center: PORTLAND_CENTER,
      zoom: PORTLAND_DEFAULT_ZOOM,
      attributionControl: false,
      pitchWithRotate: true,
      maxPitch: 85,
    });
    map.current = m;

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
      applyWaterColors(m, themeRef.current);
      applyGreenSpaces(m, themeRef.current);
      if (buildings3DRef.current) {
        addBuildingExtrusion(m, themeRef.current);
      }
      if (terrainRef.current) {
        addTerrain(m, themeRef.current);
      }
    });

    return () => {
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current.clear();
      previewMarkerRef.current?.remove();
      m.remove();
      map.current = null;
    };
  }, [setMapBounds, addBuildingExtrusion, addTerrain]);

  // Switch map style when theme changes (skip first render — already set at init)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!map.current) return;
    map.current.setStyle(MAP_STYLES[theme]);
    // style.load handler will re-add the building extrusion automatically
  }, [theme]);

  // Toggle 3D terrain on/off
  const toggleTerrain = useCallback(() => {
    const m = map.current;
    if (!m) return;
    const next = !terrainRef.current;
    setTerrain(next);

    if (next) {
      m.easeTo({ pitch: TERRAIN_PITCH, duration: 700 });
      if (m.isStyleLoaded()) addTerrain(m, themeRef.current);
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
      if (m.isStyleLoaded()) addBuildingExtrusion(m, themeRef.current);
    } else {
      m.easeTo({ pitch: 0, duration: 500 });
      if (m.getLayer(BUILDING_LAYER_ID)) m.removeLayer(BUILDING_LAYER_ID);
    }
  }, [addBuildingExtrusion]);

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
      if (!markersRef.current.has(poi.id)) {
        const el = document.createElement('div');
        el.className = 'poi-marker';
        el.style.setProperty('--marker-color', getCategoryColorById(activeCategoriesRef.current, poi.category));

        const dot = document.createElement('div');
        dot.className = getDotClass(poi.id, poi.group);
        el.appendChild(dot);

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
        markersRef.current.get(poi.id)!.setLngLat([poi.lng, poi.lat]);
      }
    });
  }, [pois, getDotClass]);

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
  }, [selectedPOI?.id]);

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

  // Search preview marker — pulsing pin dropped at the geocoded location
  const previewMarkerRef = useRef<maplibregl.Marker | null>(null);
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

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
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
