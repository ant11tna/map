import mimetypes
import os
import sqlite3
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

DATA_DIR = Path('/data')
DB_PATH = DATA_DIR / 'app.db'
PHOTOS_DIR = DATA_DIR / 'photos'
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db() -> None:
    with closing(get_conn()) as conn:
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS places (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              address TEXT NOT NULL,
              lat REAL NOT NULL,
              lng REAL NOT NULL,
              title TEXT NOT NULL,
              note TEXT NOT NULL,
              visited_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            '''
        )
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS photos (
              id TEXT PRIMARY KEY,
              place_id TEXT NOT NULL,
              file_ext TEXT NOT NULL,
              mime_type TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY(place_id) REFERENCES places(id) ON DELETE CASCADE
            )
            '''
        )
        conn.commit()


class PlaceCreate(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    title: str
    note: str = ''
    visitedAt: str | None = None


class PlaceUpdate(BaseModel):
    title: str | None = None
    note: str | None = None
    visitedAt: str | None = None


class PlaceOut(BaseModel):
    id: str
    name: str
    address: str
    lat: float
    lng: float
    title: str
    note: str
    visitedAt: str | None
    photoCount: int
    coverPhotoId: str | None
    createdAt: str
    updatedAt: str


class PhotoOut(BaseModel):
    id: str
    placeId: str
    fileExt: str
    mimeType: str
    createdAt: str


def to_place(row: sqlite3.Row) -> PlaceOut:
    return PlaceOut(
        id=row['id'],
        name=row['name'],
        address=row['address'],
        lat=row['lat'],
        lng=row['lng'],
        title=row['title'],
        note=row['note'],
        visitedAt=row['visited_at'],
        photoCount=row['photo_count'],
        coverPhotoId=row['cover_photo_id'],
        createdAt=row['created_at'],
        updatedAt=row['updated_at'],
    )


def to_photo(row: sqlite3.Row) -> PhotoOut:
    return PhotoOut(
        id=row['id'],
        placeId=row['place_id'],
        fileExt=row['file_ext'],
        mimeType=row['mime_type'],
        createdAt=row['created_at'],
    )


app = FastAPI(title='travel-map-api')
origins = [x.strip() for x in os.getenv('CORS_ORIGINS', '*').split(',') if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
def startup() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    init_db()


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@app.get('/places', response_model=list[PlaceOut])
def list_places() -> list[PlaceOut]:
    with closing(get_conn()) as conn:
        rows = conn.execute(
            '''
            SELECT
              p.*,
              (SELECT COUNT(*) FROM photos ph WHERE ph.place_id = p.id) AS photo_count,
              (SELECT ph.id FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) AS cover_photo_id
            FROM places p
            ORDER BY p.updated_at DESC
            '''
        ).fetchall()
    return [to_place(row) for row in rows]


@app.post('/places', response_model=PlaceOut)
def create_place(payload: PlaceCreate) -> PlaceOut:
    place_id = str(uuid.uuid4())
    created = now_iso()
    with closing(get_conn()) as conn:
        conn.execute(
            '''
            INSERT INTO places (id, name, address, lat, lng, title, note, visited_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                place_id,
                payload.name,
                payload.address,
                payload.lat,
                payload.lng,
                payload.title,
                payload.note,
                payload.visitedAt,
                created,
                created,
            ),
        )
        conn.commit()
        row = conn.execute(
            '''
            SELECT p.*, 0 AS photo_count, NULL AS cover_photo_id
            FROM places p
            WHERE p.id = ?
            ''',
            (place_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail='Create place failed')
    return to_place(row)


@app.put('/places/{place_id}', response_model=PlaceOut)
def update_place(place_id: str, payload: PlaceUpdate) -> PlaceOut:
    with closing(get_conn()) as conn:
        row = conn.execute('SELECT * FROM places WHERE id = ?', (place_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail='Place not found')

        next_title = payload.title if payload.title is not None else row['title']
        next_note = payload.note if payload.note is not None else row['note']
        next_visited_at = payload.visitedAt if payload.visitedAt is not None else row['visited_at']
        conn.execute(
            'UPDATE places SET title = ?, note = ?, visited_at = ?, updated_at = ? WHERE id = ?',
            (next_title, next_note, next_visited_at, now_iso(), place_id),
        )
        conn.commit()
        updated = conn.execute(
            '''
            SELECT
              p.*,
              (SELECT COUNT(*) FROM photos ph WHERE ph.place_id = p.id) AS photo_count,
              (SELECT ph.id FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) AS cover_photo_id
            FROM places p
            WHERE p.id = ?
            ''',
            (place_id,),
        ).fetchone()

    if updated is None:
        raise HTTPException(status_code=404, detail='Place not found')
    return to_place(updated)


@app.delete('/places/{place_id}', status_code=204)
def delete_place(place_id: str) -> None:
    with closing(get_conn()) as conn:
        rows = conn.execute('SELECT id, file_ext FROM photos WHERE place_id = ?', (place_id,)).fetchall()
        conn.execute('DELETE FROM places WHERE id = ?', (place_id,))
        conn.commit()
    for row in rows:
        (PHOTOS_DIR / f"{row['id']}.{row['file_ext']}").unlink(missing_ok=True)


@app.get('/places/{place_id}/photos', response_model=list[PhotoOut])
def list_place_photos(place_id: str) -> list[PhotoOut]:
    with closing(get_conn()) as conn:
        exists = conn.execute('SELECT 1 FROM places WHERE id = ?', (place_id,)).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail='Place not found')
        rows = conn.execute('SELECT * FROM photos WHERE place_id = ? ORDER BY created_at ASC', (place_id,)).fetchall()
    return [to_photo(row) for row in rows]


@app.post('/places/{place_id}/photos', response_model=list[PhotoOut])
async def upload_photos(place_id: str, files: Annotated[list[UploadFile], File(...)]) -> list[PhotoOut]:
    with closing(get_conn()) as conn:
        exists = conn.execute('SELECT 1 FROM places WHERE id = ?', (place_id,)).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail='Place not found')

        created = now_iso()
        for file in files:
            ext = Path(file.filename or '').suffix.lower().lstrip('.')
            if not ext:
                guessed = mimetypes.guess_extension(file.content_type or '') or '.bin'
                ext = guessed.lstrip('.')
            photo_id = str(uuid.uuid4())
            photo_path = PHOTOS_DIR / f'{photo_id}.{ext}'
            content = await file.read()
            photo_path.write_bytes(content)
            conn.execute(
                'INSERT INTO photos (id, place_id, file_ext, mime_type, created_at) VALUES (?, ?, ?, ?, ?)',
                (photo_id, place_id, ext, file.content_type or 'application/octet-stream', created),
            )

        conn.execute('UPDATE places SET updated_at = ? WHERE id = ?', (now_iso(), place_id))
        conn.commit()
        rows = conn.execute('SELECT * FROM photos WHERE place_id = ? ORDER BY created_at ASC', (place_id,)).fetchall()
    return [to_photo(row) for row in rows]


@app.get('/photos/{photo_id}')
def download_photo(photo_id: str) -> FileResponse:
    with closing(get_conn()) as conn:
        row = conn.execute('SELECT * FROM photos WHERE id = ?', (photo_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail='Photo not found')

    path = PHOTOS_DIR / f"{photo_id}.{row['file_ext']}"
    if not path.exists():
        raise HTTPException(status_code=404, detail='Photo file missing')
    return FileResponse(path, media_type=row['mime_type'])


@app.delete('/photos/{photo_id}', status_code=204)
def remove_photo(photo_id: str) -> None:
    with closing(get_conn()) as conn:
        row = conn.execute('SELECT place_id, file_ext FROM photos WHERE id = ?', (photo_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail='Photo not found')
        conn.execute('DELETE FROM photos WHERE id = ?', (photo_id,))
        conn.execute('UPDATE places SET updated_at = ? WHERE id = ?', (now_iso(), row['place_id']))
        conn.commit()
    (PHOTOS_DIR / f"{photo_id}.{row['file_ext']}").unlink(missing_ok=True)
