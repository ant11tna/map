export type Place = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  title: string;
  note: string;
  visitedAt?: string;
  photoCount: number;
  photoCover?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlacePhoto = {
  id: string;
  placeId: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
};

export type SearchCandidate = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type MapView = {
  center: [number, number];
  zoom: number;
};
