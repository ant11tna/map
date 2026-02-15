import type { SearchCandidate } from '../types/place';

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
};

export async function geocodePlaces(query: string, timeoutMs = 8000): Promise<SearchCandidate[]> {
  if (!query.trim()) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=8`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`搜索失败：${response.status}`);
    }

    const data = (await response.json()) as NominatimResult[];
    return data.map((item) => ({
      id: String(item.place_id),
      name: item.name || item.display_name.split(',')[0],
      address: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon)
    }));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('搜索超时，请重试');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
