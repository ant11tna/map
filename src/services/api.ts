import type { Place, PlacePhoto } from '../types/place';

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

function getApiUrl(path: string) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), init);
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${await response.text()}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function getPhotoUrl(photoId: string) {
  return getApiUrl(`/photos/${photoId}`);
}

export async function listPlaces() {
  return request<Place[]>('/places');
}

export async function createPlace(payload: Omit<Place, 'id' | 'createdAt' | 'updatedAt' | 'photoCount' | 'photoCover' | 'coverPhotoId'>) {
  return request<Place>('/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updatePlace(placeId: string, payload: Partial<Pick<Place, 'title' | 'note' | 'visitedAt'>>) {
  return request<Place>(`/places/${placeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deletePlace(placeId: string) {
  await request<void>(`/places/${placeId}`, { method: 'DELETE' });
}

export async function listPlacePhotos(placeId: string) {
  return request<PlacePhoto[]>(`/places/${placeId}/photos`);
}

export async function uploadPlacePhotos(placeId: string, files: FileList | File[]) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file));

  return request<PlacePhoto[]>(`/places/${placeId}/photos`, {
    method: 'POST',
    body: formData
  });
}

export async function deletePhoto(photoId: string) {
  await request<void>(`/photos/${photoId}`, { method: 'DELETE' });
}
