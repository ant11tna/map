import type maplibregl from 'maplibre-gl';

export type MapLanguage = 'zh' | 'en';

export function getDefaultStyleUrl(lang: MapLanguage = 'zh') {
  const env = import.meta.env;
  if (env.VITE_MAP_STYLE_URL) {
    return env.VITE_MAP_STYLE_URL;
  }
  if (env.VITE_MAP_API_KEY) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${env.VITE_MAP_API_KEY}&language=${lang}`;
  }
  // Soft muted vector style (closer to Apple-like light map) without API key
  return 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
}

export function setMapLanguage(map: maplibregl.Map, lang: MapLanguage) {
  const style = map.getStyle();
  if (!style?.layers) {
    return;
  }

  const expr =
    lang === 'zh'
      ? ['coalesce', ['get', 'name:zh'], ['get', 'name_zh'], ['get', 'name'], '']
      : ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name'], ''];

  for (const layer of style.layers) {
    if (layer.type !== 'symbol') {
      continue;
    }
    const layout = layer.layout as Record<string, unknown> | undefined;
    if (!layout || !('text-field' in layout)) {
      continue;
    }
    try {
      map.setLayoutProperty(layer.id, 'text-field', expr as never);
    } catch {
      // ignore layers that do not accept runtime text-field updates
    }
  }
}
