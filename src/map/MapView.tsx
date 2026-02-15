import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { saveMapView } from '../db/database';
import type { Place } from '../types/place';
import { type MapLanguage, setMapLanguage } from './styles';
import { type MarkerRecord, syncPlaceMarkers } from './markers';

type MapViewProps = {
  center: [number, number];
  zoom: number;
  styleUrl: string;
  language: MapLanguage;
  places: Place[];
  coverByPlaceId: Record<string, string>;
  flyTo?: [number, number] | null;
  onMarkerClick: (placeId: string) => void;
  onMapClick: () => void;
};

function MapView({ center, zoom, styleUrl, language, places, coverByPlaceId, flyTo, onMarkerClick, onMapClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      setMapLanguage(map, language);
      markersRef.current = syncPlaceMarkers({
        map,
        places,
        coverByPlaceId,
        existing: markersRef.current,
        onClick: onMarkerClick
      });
    });

    map.on('click', onMapClick);
    map.on('moveend', () => {
      const c = map.getCenter();
      saveMapView([c.lng, c.lat], map.getZoom()).catch(() => undefined);
    });

    return () => {
      markersRef.current.forEach((item) => item.marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    setMapLanguage(map, language);
  }, [language]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    markersRef.current = syncPlaceMarkers({
      map,
      places,
      coverByPlaceId,
      existing: markersRef.current,
      onClick: onMarkerClick
    });
  }, [places, coverByPlaceId, onMarkerClick]);

  useEffect(() => {
    if (!flyTo || !mapRef.current) {
      return;
    }
    mapRef.current.flyTo({ center: flyTo, zoom: 13 });
  }, [flyTo]);

  return <div ref={containerRef} className="maplibre-container" />;
}

export default MapView;
