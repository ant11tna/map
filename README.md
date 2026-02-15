# 旅行记录地图（MapLibre GL 矢量地图版）

## 安装与启动

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

## 地图方案说明

本项目已从 Leaflet 栅格瓦片迁移到 **MapLibre GL JS 矢量地图**，支持：

- 全屏地图拖拽/缩放
- 地名语言切换（中文 / 英文）
- 相册缩略图 HTML Marker（圆角缩略图 + 白边 + 阴影 + 尖角 + 数量 badge）
- 点击 marker 打开右侧详情抽屉（标题、日期、笔记、照片增删）
- 地图视角持久化（center + zoom）

## 底图样式与 API Key

默认 style 来源：
- 优先 `VITE_MAP_STYLE_URL`
- 若未设置且提供了 `VITE_MAP_API_KEY`，默认使用 MapTiler Streets：`https://api.maptiler.com/maps/streets-v2/style.json?key=...`
- 都未设置时默认使用 **Carto Voyager 矢量样式**（更柔和、接近系统地图观感）：`https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`

可选环境变量：

```bash
VITE_MAP_STYLE_URL=
VITE_MAP_API_KEY=
VITE_ENABLE_MOCK=false
```

## 语言切换实现方式

语言切换通过 `setMapLanguage(map, lang)` 直接修改 style 的 symbol 文本图层 `text-field`：

- 中文：`coalesce(get('name:zh'), get('name_zh'), get('name'), '')`
- 英文：`coalesce(get('name:en'), get('name_en'), get('name'), '')`

切换时不重建 map，只调用 `map.setLayoutProperty(...)` 动态更新 label。

## 开发模式 mock places 开关

开发模式可开启 mock 数据用于截图和 UI 验证：

1. 新建 `.env.local`

```bash
VITE_ENABLE_MOCK=true
```

2. 重启开发服务

```bash
npm run dev
```

当本地数据库为空时，会自动生成 20 条地点数据（包含随机照片数量与占位封面）。

## 代码结构

```txt
src/
  map/
    MapView.tsx
    markers.ts
    styles.ts
  services/
    geocode.ts
    mockData.ts
  db/
    database.ts
```


## 想要更接近示例图的底图

如果你不喜欢大色块，可以直接在 `.env.local` 指定更柔和的 style，例如：

```bash
VITE_MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json
# 或更浅色
# VITE_MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
```

这两个都不需要 API Key。
