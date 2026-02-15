import { useCallback, useEffect, useMemo, useState } from 'react';
import PlaceDetailDrawer from '../components/PlaceDetailDrawer';
import { db, getMapView } from '../db/database';
import MapView from '../map/MapView';
import { defaultCoverDataUrl } from '../map/markers';
import { getDefaultStyleUrl, type MapLanguage } from '../map/styles';
import { useDebounce } from '../hooks/useDebounce';
import { geocodePlaces } from '../services/geocode';
import { seedMockDataIfNeeded } from '../services/mockData';
import type { Place, SearchCandidate } from '../types/place';
import './MapPage.css';

const DEFAULT_CENTER: [number, number] = [104.1954, 35.8617];
const DEFAULT_ZOOM = 4;

type SegmentType = 'all' | 'featured';

function MapPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [segment, setSegment] = useState<SegmentType>('all');
  const [language, setLanguage] = useState<MapLanguage>('zh');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pending, setPending] = useState<SearchCandidate | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [coverByPlaceId, setCoverByPlaceId] = useState<Record<string, string>>({});

  const debouncedQuery = useDebounce(query, 400);

  const loadPlaces = useCallback(async () => {
    const data = await db.places.orderBy('updatedAt').reverse().toArray();
    setPlaces(data);

    const covers: Record<string, string> = {};
    await Promise.all(
      data.map(async (place) => {
        if (place.photoCover) {
          covers[place.id] = place.photoCover;
          return;
        }
        const first = await db.photos.where('placeId').equals(place.id).first();
        covers[place.id] = first ? URL.createObjectURL(first.blob) : defaultCoverDataUrl;
      })
    );

    setCoverByPlaceId((prev) => {
      Object.values(prev).forEach((value) => {
        if (value.startsWith('blob:')) {
          URL.revokeObjectURL(value);
        }
      });
      return covers;
    });
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK === 'true') {
      seedMockDataIfNeeded().catch(() => undefined);
    }

    getMapView().then((view) => {
      if (view) {
        setCenter(view.center);
        setZoom(view.zoom);
      }
    });

    loadPlaces();
  }, [loadPlaces]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setSearchError(null);
      return;
    }

    geocodePlaces(debouncedQuery)
      .then((items) => {
        setResults(items);
        setSearchError(null);
      })
      .catch((error) => setSearchError(error instanceof Error ? error.message : '搜索失败'));
  }, [debouncedQuery]);

  useEffect(
    () => () => {
      Object.values(coverByPlaceId).forEach((value) => {
        if (value.startsWith('blob:')) {
          URL.revokeObjectURL(value);
        }
      });
    },
    [coverByPlaceId]
  );

  const displayedPlaces = useMemo(() => {
    if (segment === 'featured') {
      return places.filter((item) => item.photoCount >= 20);
    }
    return places;
  }, [places, segment]);

  const selectedPlace = useMemo(() => places.find((item) => item.id === selectedId) ?? null, [places, selectedId]);

  async function savePending() {
    if (!pending) {
      return;
    }
    const now = new Date().toISOString();
    await db.places.put({
      id: crypto.randomUUID(),
      name: pending.name,
      address: pending.address,
      lat: pending.lat,
      lng: pending.lng,
      title: pending.name,
      note: '',
      photoCount: 0,
      createdAt: now,
      updatedAt: now
    });
    setPending(null);
    await loadPlaces();
  }

  return (
    <div className="album-map-page">
      <MapView
        center={center}
        zoom={zoom}
        styleUrl={getDefaultStyleUrl()}
        language={language}
        places={displayedPlaces}
        coverByPlaceId={coverByPlaceId}
        flyTo={flyTo}
        onMarkerClick={setSelectedId}
        onMapClick={() => setSelectedId(null)}
      />

      <div className="top-floating-bar">
        <button className="floating-btn">←</button>
        <div className="segment-control">
          <button className={segment === 'all' ? 'active' : ''} onClick={() => setSegment('all')}>
            图集
          </button>
          <button className={segment === 'featured' ? 'active' : ''} onClick={() => setSegment('featured')}>
            精选集
          </button>
        </div>
        <div className="right-actions">
          <button className="floating-btn" onClick={() => setLanguage('zh')}>
            中文
          </button>
          <button className="floating-btn" onClick={() => setLanguage('en')}>
            EN
          </button>
        </div>
      </div>

      <div className="search-panel-map">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索地点并保存" />
        {!!searchError && <p className="small-text">{searchError}</p>}
        <ul>
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setPending(item);
                  setFlyTo([item.lng, item.lat]);
                  setResults([]);
                }}
              >
                <strong>{item.name}</strong>
                <span>{item.address}</span>
              </button>
            </li>
          ))}
        </ul>
        {pending && (
          <div className="pending-save">
            <span>{pending.name}</span>
            <button onClick={savePending}>保存地点</button>
          </div>
        )}
      </div>

      <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedId(null)} onUpdated={loadPlaces} />
    </div>
  );
}

export default MapPage;
