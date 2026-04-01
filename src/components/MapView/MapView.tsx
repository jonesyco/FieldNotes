import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { usePOIStore } from '../../store/poiStore';
import { CATEGORY_COLORS } from '../../types';
import { PORTLAND_CENTER, PORTLAND_DEFAULT_ZOOM } from '../../utils/geo';
import type { Theme } from '../../hooks/useTheme';

const MAP_STYLES: Record<Theme, string> = {
  dark:  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

// Colors for the fill-extrusion layer per theme
const BUILDING_COLORS: Record<Theme, { fill: string; base: string; opacity: number }> = {
  dark:  { fill: '#2e2e2e', base: '#1a1a1a', opacity: 0.85 },
  light: { fill: '#c4cadb', base: '#b0b8cd', opacity: 0.70 },
};

// Water fill colors — override the basemap's default per theme
const WATER_COLORS: Record<Theme, string> = {
  dark:  '#1a3a5c',  // deep steel blue — visible but fits dark palette
  light: '#a4cde4',  // soft classic-map blue
};

// Green space colors — parks, grass, woods, nature reserves
const GREEN_COLORS: Record<Theme, { landcover: string; parks: string }> = {
  dark:  { landcover: '#1c3022', parks: '#162a1c' },
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

  const { pois, selectedPOI, hoveredPOIId, addingMode, setMapBounds, highlightedGroup, relocatingPOI } = usePOIStore();

  // Refs so event handlers always see current values
  const addingModeRef = useRef(addingMode);
  const relocatingPOIRef = useRef(relocatingPOI);
  const onMapClickRef = useRef(onMapClick);
  const buildings3DRef = useRef(buildings3D);
  const themeRef = useRef(theme);
  const initialCenterRef = useRef(initialCenter ?? null);
  useEffect(() => { addingModeRef.current = addingMode; }, [addingMode]);
  useEffect(() => { relocatingPOIRef.current = relocatingPOI; }, [relocatingPOI]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { buildings3DRef.current = buildings3D; }, [buildings3D]);
  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { initialCenterRef.current = initialCenter ?? null; }, [initialCenter]);

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
          0,   base,
          20,  fill,
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

    // Re-apply water color + green spaces + 3D layer after any style reload
    m.on('style.load', () => {
      applyWaterColors(m, themeRef.current);
      applyGreenSpaces(m, themeRef.current);
      if (buildings3DRef.current) {
        addBuildingExtrusion(m, themeRef.current);
      }
    });

    return () => {
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current.clear();
      m.remove();
      map.current = null;
    };
  }, [setMapBounds, addBuildingExtrusion]);

  // Switch map style when theme changes (skip first render — already set at init)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!map.current) return;
    map.current.setStyle(MAP_STYLES[theme]);
    // style.load handler will re-add the building extrusion automatically
  }, [theme]);

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

  // Sync markers with POIs
  useEffect(() => {
    if (!map.current) return;
    const currentIds = new Set(pois.map((p) => p.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
    });

    pois.forEach((poi) => {
      const isSelected = selectedPOI?.id === poi.id;
      const isHovered = hoveredPOIId === poi.id;
      const isGroupLit = highlightedGroup != null && poi.group === highlightedGroup;
      const isGroupDimmed = highlightedGroup != null && poi.group !== highlightedGroup;
      const color = CATEGORY_COLORS[poi.category];

      const dotClass = [
        'marker-dot',
        isSelected  ? 'selected'    : '',
        isHovered   ? 'hovered'     : '',
        isGroupLit  ? 'group-lit'   : '',
        isGroupDimmed ? 'group-dimmed' : '',
      ].filter(Boolean).join(' ');

      if (!markersRef.current.has(poi.id)) {
        const el = document.createElement('div');
        el.className = 'poi-marker';
        el.style.setProperty('--marker-color', color);

        const dot = document.createElement('div');
        dot.className = dotClass;
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
        const marker = markersRef.current.get(poi.id)!;
        marker.setLngLat([poi.lng, poi.lat]);
        const dot = marker.getElement().querySelector('.marker-dot');
        if (dot) dot.className = dotClass;
      }
    });
  }, [pois, selectedPOI, hoveredPOIId, highlightedGroup]);

  // Fly to selected POI
  useEffect(() => {
    if (!map.current || !selectedPOI) return;
    map.current.flyTo({
      center: [selectedPOI.lng, selectedPOI.lat],
      zoom: Math.max(map.current.getZoom(), 14),
      duration: 700,
    });
  }, [selectedPOI?.id]);

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

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <div className="map-controls">
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
