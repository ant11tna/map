import { useEffect, useMemo, useState } from 'react';
import { deletePhoto, getPhotoUrl, listPlacePhotos, updatePlace, uploadPlacePhotos } from '../services/api';
import type { Place, PlacePhoto } from '../types/place';

type PlaceDetailDrawerProps = {
  place: Place | null;
  onClose: () => void;
  onUpdated: () => void;
};

function PlaceDetailDrawer({ place, onClose, onUpdated }: PlaceDetailDrawerProps) {
  const [form, setForm] = useState({ title: '', note: '', visitedAt: '' });
  const [photos, setPhotos] = useState<PlacePhoto[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!place) {
      setPhotos([]);
      return;
    }
    setForm({
      title: place.title,
      note: place.note,
      visitedAt: place.visitedAt ?? ''
    });
    listPlacePhotos(place.id).then(setPhotos).catch(() => setMessage('加载图片失败。'));
  }, [place]);

  useEffect(() => {
    if (!place) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await updatePlace(place.id, {
          title: form.title.trim() || place.name,
          note: form.note,
          visitedAt: form.visitedAt || undefined
        });
        onUpdated();
      } catch {
        setMessage('自动保存失败。');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [form, place, onUpdated]);

  const photoUrls = useMemo(() => photos.map((photo) => ({ id: photo.id, url: getPhotoUrl(photo.id) })), [photos]);

  if (!place) {
    return null;
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length || !place) {
      return;
    }
    try {
      const newPhotos = await uploadPlacePhotos(place.id, files);
      setPhotos(newPhotos);
      onUpdated();
      setMessage('图片已上传');
    } catch {
      setMessage('图片上传失败。');
    }
  }

  async function removePhoto(id: string) {
    if (!place) {
      return;
    }
    try {
      await deletePhoto(id);
      const newPhotos = await listPlacePhotos(place.id);
      setPhotos(newPhotos);
      onUpdated();
    } catch {
      setMessage('删除图片失败。');
    }
  }

  return (
    <aside className="glass-drawer">
      <div className="drawer-header">
        <h2>地点详情</h2>
        <button onClick={onClose}>关闭</button>
      </div>
      <p className="small-text">{place.address}</p>
      <label>
        标题
        <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
      </label>
      <label>
        到访日期
        <input
          type="date"
          value={form.visitedAt}
          onChange={(e) => setForm((prev) => ({ ...prev, visitedAt: e.target.value }))}
        />
      </label>
      <label>
        笔记
        <textarea rows={4} value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} />
      </label>
      <label>
        新增照片
        <input type="file" accept="image/*" multiple onChange={(e) => uploadPhotos(e.target.files)} />
      </label>
      <div className="photo-grid">
        {photoUrls.map((item) => (
          <figure key={item.id}>
            <img src={item.url} alt="地点照片" />
            <button onClick={() => removePhoto(item.id)}>删除</button>
          </figure>
        ))}
      </div>
      {message && <p className="small-text">{message}</p>}
    </aside>
  );
}

export default PlaceDetailDrawer;
