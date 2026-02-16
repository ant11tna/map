import { useCallback, useEffect, useMemo, useState } from 'react';
import PlaceDetailDrawer from '../components/PlaceDetailDrawer';
import { getMapView } from '../db/database';
import MapView from '../map/MapView';
import { defaultCoverDataUrl } from '../map/markers';
import { getDefaultStyleUrl, type MapLanguage } from '../map/styles';
import { useDebounce } from '../hooks/useDebounce';
import { geocodePlaces } from '../services/geocode';
import { createPlace, getPhotoUrl, listPlaces } from '../services/api';
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
    const data = await listPlaces();
    setPlaces(data);

    const covers: Record<string, string> = {};
    data.forEach((place) => {
      if (place.coverPhotoId) {
        covers[place.id] = getPhotoUrl(place.coverPhotoId);
        return;
      }
      covers[place.id] = defaultCoverDataUrl;
    });

    setCoverByPlaceId(covers);
  }, []);

  useEffect(() => {
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
    await createPlace({
      name: pending.name,
      address: pending.address,
      lat: pending.lat,
      lng: pending.lng,
      title: pending.name,
      note: '',
      visitedAt: undefined
    });
    setPending(null);
    await loadPlaces();
  }

  return (
    <div className="album-map-page">
      <MapView
        center={center}
        zoom={zoom}
        styleUrl={getDefaultStyleUrl(language)}
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
