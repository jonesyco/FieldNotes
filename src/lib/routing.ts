import type { POI, RouteGeometry } from '../types';

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    geometry: RouteGeometry;
  }>;
  message?: string;
}

function buildCoordinateKey(poi: POI): string {
  return `${poi.lng.toFixed(6)},${poi.lat.toFixed(6)}`;
}

export async function fetchSequenceRoute(pois: POI[], signal?: AbortSignal): Promise<RouteGeometry> {
  const distinctStops = new Set(pois.map(buildCoordinateKey));
  if (pois.length < 2 || distinctStops.size < 2) {
    throw new Error('ADD AT LEAST TWO DISTINCT LOCATIONS TO BUILD A ROUTE.');
  }

  const coordinates = pois.map((poi) => `${poi.lng},${poi.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error('ROUTING REQUEST FAILED.');
  }

  const data = await response.json() as OsrmRouteResponse;
  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry) {
    throw new Error(data.message?.toUpperCase() ?? 'NO DRIVING ROUTE FOUND FOR THIS ORDER.');
  }

  return data.routes[0].geometry;
}
