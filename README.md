# Refugee Migration Routes Analyzer

An educational web application built with the **ArcGIS Maps SDK for JavaScript** that provides critical feedback on sketched refugee migration routes into Europe.

---

## 🎯 Pedagogical & Educational Purpose

When studying migration and forced displacement, students often view maps as abstract political boundaries. In reality, refugees escaping war, persecution, and human rights violations face severe, perilous obstacles along their journeys.

This application challenges students to **take the perspective of refugees**:
1. Students use drawing tools to sketch potential migration routes (polylines) from regions of origin or transit (such as Syria, Afghanistan, or North Africa) across the Mediterranean, the Balkans, or Eastern Europe.
2. An **invisible layer** in the WebMap called `route-obstacles` contains real-world difficulties: deadly sea corridors, militarized border walls, pushbacks, sub-zero mountain passes, desert transit hazards, and human exploitation checkpoints.
3. Upon clicking **"Analyze Route"**, the application buffers the sketched paths and performs spatial intersections with the unseen obstacle layer.
4. The application returns an educational summary detailing cumulative difficulty weights, categorized hazard breakdowns, and reflective inquiry prompts to help students understand the lived reality and harrowing choices of forced displacement.

---

## ✨ Features

- **React 18 + Vite**: High-performance, modern React architecture with modular components.
- **ArcGIS Map Components (`@arcgis/map-components`)**: Declarative ArcGIS web components including `<arcgis-map>`, `<arcgis-zoom>`, and `<arcgis-scale-bar>`.
- **Esri Calcite UI (`@esri/calcite-components`)**: Beautiful, accessible, enterprise-grade design system following Esri best practices with `<calcite-shell>`, `<calcite-navigation>`, `<calcite-panel>`, `<calcite-dialog>`, `<calcite-card>`, `<calcite-chip>`, and `<calcite-notice>`.
- **ArcGIS Maps SDK for JavaScript**: Deep integration with `WebMap`, `MapView`, `Sketch`, `GraphicsLayer`, and `geometryEngine`.
- **Route Sketching & Editing**: Intuitive polyline sketching using the ArcGIS `Sketch` widget with custom line styling and route distance metrics.
- **Geodesic Buffering**: Configurable corridor buffering (e.g. 30 km) using `geometryEngine.geodesicBuffer` to accurately model the route's sphere of interaction across continental distances.
- **Invisible Obstacles Layer**: The `route-obstacles` layer is hidden on the map (`visible = false`, `listMode = "hide"`) to represent the unseen dangers that refugees cannot anticipate until they encounter them.
- **Difficulty Weights & Descriptions**: Each obstacle has a severity weight (1–10) and description.
- **Spatial Intersection & Aggregation**: Buffer polygons intersect with the obstacles layer to compute:
  - Total cumulative difficulty score
  - Average and peak threat levels
  - Categorized breakdown (Maritime Hazards, Border Enforcement, Environmental/Terrain, Human Exploitation)
  - Full list of intersected obstacles with severity badges and descriptions
- **Interactive Map Feedback**: Highlights triggered obstacles on the map after analysis, allowing students to click obstacles in the summary to zoom directly to their locations.
- **Refugee Perspective & Inquiry Prompts**: Structured reflection questions guiding classroom discussions on asylum policies, border closures, and humanitarian needs.
- **Localization**: English and German interface translations are stored in `src/locales/`; the browser language is detected automatically, and the selected language is remembered.
- **High Configurability**: WebMap ID, buffer distance, units, layer title, and attribute field names can be configured in:
  1. The built-in **Settings Dialog** (saved in browser `localStorage`)
  2. **URL Query Parameters** (enabling teachers to generate one-click shareable assignment links)
  3. `src/config.js`
- **Zero-Dependency Fallback & Standalone Mode**: If the WebMap ID is not specified or offline, the app seamlessly activates a rich dataset of realistic sample obstacles so the app is always fully interactive.

---

## ⚙️ Configuration Options

All non-static parameters are completely configurable:

| Parameter | Default Value | Description | URL Query Param |
|-----------|---------------|-------------|-----------------|
| `webmapId` | `"433c2a6b28f84737a4d538e14674724b"` | ArcGIS Online WebMap item ID | `?webmap=...` |
| `bufferDistance` | `30` | Distance of route corridor buffer | `?buffer=50` |
| `bufferUnit` | `"kilometers"` | Unit: `kilometers`, `miles`, `meters`, `nautical-miles` | `?unit=kilometers` |
| `obstacleLayerTitle` | `"route-obstacles"` | Name/title of hidden layer in WebMap | `?layer=route-obstacles` |
| `weightField` | `"weight"` | Obstacle attribute for difficulty weight | `?weightField=weight` |
| `descriptionField` | `"description"` | Obstacle attribute for description | `?descField=description` |
| `titleField` | `"title"` | Obstacle attribute for name/title | `?titleField=title` |
| `categoryField` | `"category"` | Obstacle attribute for category | `?categoryField=category` |

### Shareable URL Example for Teachers:
```
https://example.com/?webmap=YOUR_WEBMAP_ID&buffer=40&unit=kilometers&layer=route-obstacles
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ (tested on Node.js v22)

### Development Server
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Previewing Production Build
```bash
npm run preview
```
or launch the included production server:
```bash
npm start
```

### Running Tests
To run the automated unit test suite:
```bash
npm test
```

---

## 📁 Project Structure

```
migration-routes-analyzer/
├── index.html                  # Vite + React HTML template
├── vite.config.js              # Vite configuration with React plugin
├── server.js                   # Production static asset server
├── package.json                # Project manifest, scripts, and dependencies
├── README.md                   # Documentation and pedagogical guide
├── src/
│   ├── main.jsx                # React root and component registration
│   ├── App.jsx                 # Main application shell with Calcite Shell
│   ├── analyzer.js             # Buffering, spatial intersection & perspective logic
│   ├── config.js               # Configuration manager (defaults, URL params, storage)
│   ├── sample-obstacles.js     # Realistic fallback refugee obstacles dataset
│   └── components/
│       ├── Header.jsx          # Calcite navigation header with action buttons
│       ├── MapContainer.jsx    # ArcGIS Map Component, Sketch & analysis pipeline
│       ├── AnalysisPanel.jsx   # Results panel with difficulty metrics & inquiry prompts
│       ├── SettingsModal.jsx   # Calcite dialog for non-static parameter configuration
│       └── GuideModal.jsx      # Educational guide dialog explaining refugee journey context
└── tests/
    ├── analyzer.test.js        # Unit tests for spatial analysis & risk evaluation
    └── config.test.js          # Unit tests for configuration & URL parameters
```

---

## 📜 License

Apache-2.0
