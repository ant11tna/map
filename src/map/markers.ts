import maplibregl from 'maplibre-gl';
import type { Place } from '../types/place';

export type MarkerRecord = {
  placeId: string;
  marker: maplibregl.Marker;
};

function markerHtml(place: Place, coverUrl: string) {
  return `<div class="album-marker"><div class="thumb" style="background-image:url('${coverUrl}')"></div><div class="badge">${place.photoCount}</div><div class="pin-tail"></div></div>`;
}

export function createPlaceMarker(params: {
  map: maplibregl.Map;
  place: Place;
  coverUrl: string;
  onClick: (placeId: string) => void;
}) {
  const { map, place, coverUrl, onClick } = params;
  const element = document.createElement('div');
  element.className = 'album-marker-wrap';
  element.innerHTML = markerHtml(place, coverUrl);
  element.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick(place.id);
  });

  return new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat([place.lng, place.lat]).addTo(map);
}

export function syncPlaceMarkers(params: {
  map: maplibregl.Map;
  places: Place[];
  coverByPlaceId: Record<string, string>;
  existing: MarkerRecord[];
  onClick: (placeId: string) => void;
}) {
  const { map, places, coverByPlaceId, existing, onClick } = params;
  existing.forEach((item) => item.marker.remove());

  return places.map((place) => ({
    placeId: place.id,
    marker: createPlaceMarker({
      map,
      place,
      coverUrl: coverByPlaceId[place.id] ?? defaultCoverDataUrl,
      onClick
    })
  }));
}

export const defaultCoverDataUrl =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="160"><rect width="220" height="160" fill="%23d2d7e2"/><text x="50%" y="50%" fill="%23666" dominant-baseline="middle" text-anchor="middle" font-size="18">No Photo</text></svg>';
