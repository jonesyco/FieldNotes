export interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
}

export async function searchPlace(query: string): Promise<GeoResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error('Geocode request failed');
  return res.json();
}
