import Dexie, { type Table } from 'dexie';
import type { Place, PlacePhoto } from '../types/place';

type AppSetting = {
  key: string;
  value: string;
};

class TravelMapDB extends Dexie {
  places!: Table<Place, string>;
  photos!: Table<PlacePhoto, string>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('travel_map_db');
    this.version(1).stores({
      places: 'id, updatedAt, createdAt, name, photoCount',
      photos: 'id, placeId, createdAt',
      settings: 'key'
    });
  }
}

export const db = new TravelMapDB();

export async function saveMapView(center: [number, number], zoom: number) {
  await db.settings.put({ key: 'lastMapView', value: JSON.stringify({ center, zoom }) });
}

export async function getMapView(): Promise<{ center: [number, number]; zoom: number } | null> {
  const mapView = await db.settings.get('lastMapView');
  if (!mapView) {
    return null;
  }

  try {
    return JSON.parse(mapView.value) as { center: [number, number]; zoom: number };
  } catch {
    return null;
  }
}
