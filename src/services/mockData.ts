import { db } from '../db/database';
import type { Place, PlacePhoto } from '../types/place';

const CITIES: Array<{ name: string; address: string; lat: number; lng: number }> = [
  { name: '上海外滩', address: '上海市黄浦区中山东一路', lat: 31.2401, lng: 121.4906 },
  { name: '北京故宫', address: '北京市东城区景山前街4号', lat: 39.9163, lng: 116.3972 },
  { name: '杭州西湖', address: '杭州市西湖区', lat: 30.2503, lng: 120.1451 },
  { name: '广州塔', address: '广州市海珠区阅江西路', lat: 23.1085, lng: 113.319 },
  { name: '成都太古里', address: '成都市锦江区中纱帽街', lat: 30.6569, lng: 104.0819 }
];

const palette = ['%236aa9ff', '%238de0c1', '%23ffb8a1', '%23b8b5ff', '%23ffd166'];

function createSvgDataUrl(label: string, color: string) {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="220"><rect width="300" height="220" fill="${color}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="24">${encodeURIComponent(label)}</text></svg>`;
}

export async function seedMockDataIfNeeded() {
  if (await db.places.count()) {
    return;
  }

  const now = Date.now();
  const places: Place[] = [];
  const photos: PlacePhoto[] = [];

  for (let i = 0; i < 20; i += 1) {
    const city = CITIES[i % CITIES.length];
    const photoCount = Math.floor(Math.random() * 50) + 1;
    const placeId = crypto.randomUUID();
    const cover = createSvgDataUrl(`${city.name}-${i + 1}`, palette[i % palette.length]);
    const time = new Date(now - i * 86400000).toISOString();

    places.push({
      id: placeId,
      name: `${city.name} ${i + 1}`,
      title: `${city.name} ${i + 1}`,
      address: city.address,
      lat: city.lat + (Math.random() - 0.5) * 0.2,
      lng: city.lng + (Math.random() - 0.5) * 0.2,
      note: 'Mock place for map UI.',
      visitedAt: time.slice(0, 10),
      photoCount,
      photoCover: cover,
      createdAt: time,
      updatedAt: time
    });

    for (let j = 0; j < Math.min(6, photoCount); j += 1) {
      const blob = new Blob([
        `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="220"><rect width="300" height="220" fill="${palette[(i + j) % palette.length]}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="20">${city.name} ${j + 1}</text></svg>`
      ], { type: 'image/svg+xml' });
      photos.push({
        id: crypto.randomUUID(),
        placeId,
        blob,
        mimeType: 'image/svg+xml',
        createdAt: time
      });
    }
  }

  await db.transaction('rw', db.places, db.photos, async () => {
    await db.places.bulkAdd(places);
    await db.photos.bulkAdd(photos);
  });
}
