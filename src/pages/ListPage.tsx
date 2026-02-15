import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import type { Place } from '../types/place';

type ImportPlace = Partial<Place> & Pick<Place, 'id' | 'name' | 'address' | 'lat' | 'lng' | 'createdAt' | 'updatedAt'>;

function isValidPlace(value: unknown): value is ImportPlace {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.address === 'string' &&
    typeof record.lat === 'number' &&
    typeof record.lng === 'number' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

function ListPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPlaces() {
    try {
      const data = await db.places.orderBy('updatedAt').reverse().toArray();
      setPlaces(data);
    } catch {
      setMessage('读取列表失败，请刷新重试。');
    }
  }

  useEffect(() => {
    loadPlaces();
  }, []);

  async function exportJSON() {
    try {
      const blob = new Blob([JSON.stringify(places, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travel-map-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`导出成功，共 ${places.length} 条。`);
    } catch {
      setMessage('导出失败，请重试。');
    }
  }

  async function importJSON(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const data = JSON.parse(content) as unknown;
      if (!Array.isArray(data)) {
        throw new Error('导入文件格式错误，应为数组');
      }

      const normalized: Place[] = data.filter(isValidPlace).map((item) => ({
        ...item,
        title: item.title ?? item.name,
        note: item.note ?? '',
        visitedAt: item.visitedAt,
        photoCount: item.photoCount ?? 0
      }));

      await db.places.bulkPut(normalized);
      setMessage(`导入完成：有效 ${normalized.length} 条（原始 ${data.length} 条）`);
      await loadPlaces();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败');
    }
  }

  return (
    <div className="list-page">
      <section className="panel">
        <h2>导入 / 导出</h2>
        <button onClick={exportJSON}>导出 JSON</button>
        <label>
          导入 JSON
          <input type="file" accept="application/json" onChange={(e) => importJSON(e.target.files?.[0] ?? null)} />
        </label>
        {message && <p>{message}</p>}
      </section>

      <section className="panel">
        <h2>已保存地点（按更新时间倒序）</h2>
        <ul className="place-list">
          {places.map((place) => (
            <li key={place.id}>
              <Link to="/">{place.title || place.name}</Link>
              <span>（{place.photoCount} 张）</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default ListPage;
