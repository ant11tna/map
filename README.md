# 旅行记录地图（前后端分离 + 集中存储）

本项目已新增轻后端：
- `api/`：FastAPI + SQLite + 文件存储
- `web/`：Nginx 托管前端并反代 `/api`
- `docker-compose.yml`：一键启动，适合 NAS

## 目录结构

```txt
api/
  main.py
  requirements.txt
  Dockerfile
web/
  nginx.conf
  Dockerfile
src/
  services/api.ts
docker-compose.yml
```

## 数据存储

后端固定使用 `/data`：
- SQLite：`/data/app.db`
- 照片：`/data/photos/{photoId}.{ext}`

在 `docker-compose` 中已映射到宿主机：`./data:/data`。

---

## 一、Windows 本地测试步骤

### 1) 启动 API（FastAPI）

在项目根目录执行：

```bash
cd api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set CORS_ORIGINS=http://localhost:5173,http://localhost:8080
uvicorn main:app --host 0.0.0.0 --port 8787
```

健康检查：

```bash
curl http://127.0.0.1:8787/health
```

### 2) 启动前端开发模式

另开终端（项目根目录）：

```bash
npm install
npm run dev
```

Vite 已内置 `/api -> http://127.0.0.1:8787` 代理，默认无需额外配置。

如需显式指定 API 前缀，可在 `.env.local` 设置：

```bash
VITE_API_BASE=/api
```

---

## 二、NAS / 服务器 docker-compose 部署

### 1) 构建前端产物

在项目根目录：

```bash
npm install
npm run build
```

### 2) 启动容器

```bash
docker compose up -d --build
```

默认端口：
- Web: `8080`
- API: `8787`

访问：
- 前端：`http://<NAS-IP>:8080`
- API 健康检查：`http://<NAS-IP>:8787/health`

---

## 三、接口摘要

- `GET /places`：地点列表
- `POST /places`：创建地点
- `PUT /places/{id}`：更新标题/笔记/到访日期
- `DELETE /places/{id}`：删除地点（级联照片）
- `GET /places/{id}/photos`：地点照片列表
- `POST /places/{id}/photos`：multipart 上传照片（字段名 `files`）
- `GET /photos/{photoId}`：下载/预览照片
- `DELETE /photos/{photoId}`：删除照片

---

## 四、前端改造说明

- 新增 `VITE_API_BASE`（默认 `/api`）
- 地点读写改为调用后端 API（不再依赖 IndexedDB 主流程）
- 照片上传改为 `multipart/form-data` 到 `/places/{id}/photos`
- 旧 IndexedDB 导入导出页（`/list`）仍保留，可作为迁移辅助工具

---

## 五、数据目录备份说明

请备份宿主机 `./data` 目录即可：

```txt
data/
  app.db
  photos/
```

建议备份策略：
1. 定时（每天/每周）打包 `./data`
2. 备份到另一块磁盘或云盘
3. 升级前先执行一次手动备份

恢复时只需停止容器、替换 `./data` 后再启动：

```bash
docker compose down
docker compose up -d
```
