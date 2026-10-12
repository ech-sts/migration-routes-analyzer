/**
 * Refugee Migration Routes Analyzer - Main Application Controller
 * Powered by ArcGIS Maps SDK for JavaScript
 */

import { getConfig, saveConfig, resetConfig as clearConfig, DEFAULT_CONFIG } from "./config.js";
import {
  findObstacleLayer,
  ensureObstacleLayerHidden,
  extractObstacleAttributes,
  bufferRouteGeometries,
  intersectBufferWithObstacles,
  summarizeRouteAnalysis
} from "./analyzer.js";
import { SAMPLE_OBSTACLES } from "./sample-obstacles.js";

// Global app state
const state = {
  config: null,
  map: null,
  view: null,
  sketch: null,
  routeGraphicsLayer: null,
  bufferGraphicsLayer: null,
  highlightGraphicsLayer: null,
  obstacleLayer: null,
  obstacleFeatures: [],
  currentBufferGeometry: null,
  latestAnalysis: null,
  geometryEngine: null,
  GraphicClass: null,
  isAnalyzing: false,
  usingSampleData: false
};

/**
 * Initialize application when DOM is ready
 */
export function initApp() {
  state.config = getConfig();
  setupUIEventListeners();
  loadArcGIS();
}

/**
 * Loads ArcGIS Maps SDK modules via require() (AMD CDN)
 */
function loadArcGIS() {
  updateStatus("Loading ArcGIS Maps SDK for JavaScript...", "info");

  if (typeof window.require !== "function") {
    console.warn("ArcGIS Maps SDK require() not found. Initializing offline preview mode.");
    initOfflineMode();
    return;
  }

  window.require(
    [
      "esri/WebMap",
      "esri/Map",
      "esri/views/MapView",
      "esri/widgets/Sketch",
      "esri/layers/GraphicsLayer",
      "esri/layers/FeatureLayer",
      "esri/geometry/geometryEngine",
      "esri/Graphic",
      "esri/geometry/Polyline",
      "esri/geometry/Polygon",
      "esri/geometry/Point",
      "esri/symbols/SimpleLineSymbol",
      "esri/symbols/SimpleFillSymbol",
      "esri/symbols/SimpleMarkerSymbol"
    ],
    (
      WebMap,
      Map,
      MapView,
      Sketch,
      GraphicsLayer,
      FeatureLayer,
      geometryEngine,
      Graphic,
      Polyline,
      Polygon,
      Point,
      SimpleLineSymbol,
      SimpleFillSymbol,
      SimpleMarkerSymbol
    ) => {
      try {
        state.geometryEngine = geometryEngine;
        state.GraphicClass = Graphic;

        initializeMapAndView({
          WebMap,
          Map,
          MapView,
          Sketch,
          GraphicsLayer,
          FeatureLayer,
          geometryEngine,
          Graphic,
          Polyline,
          Polygon,
          Point,
          SimpleLineSymbol,
          SimpleFillSymbol,
          SimpleMarkerSymbol
        });
      } catch (err) {
        console.error("Error initializing ArcGIS map:", err);
        updateStatus("Error initializing map: " + err.message, "error");
        initOfflineMode();
      }
    },
    (loadErr) => {
      console.warn("ArcGIS CDN failed to load (network/offline):", loadErr);
      initOfflineMode();
    }
  );
}

/**
 * Initializes the WebMap and MapView
 */
async function initializeMapAndView(esri) {
  const { WebMap, Map, MapView, Sketch, GraphicsLayer, FeatureLayer, Graphic } = esri;

  // Initialize graphics layers
  state.routeGraphicsLayer = new GraphicsLayer({
    title: "Migration Routes (Sketched)",
    listMode: "hide"
  });

  state.bufferGraphicsLayer = new GraphicsLayer({
    title: "Route Buffer Corridor",
    listMode: "hide"
  });

  state.highlightGraphicsLayer = new GraphicsLayer({
    title: "Encountered Obstacles Highlight",
    listMode: "hide"
  });

  let webmapLoaded = false;

  // Attempt to load configured WebMap
  if (state.config.webmapId && state.config.webmapId.trim() !== "") {
    try {
      updateStatus(`Loading WebMap (${state.config.webmapId})...`, "info");
      state.map = new WebMap({
        portalItem: {
          id: state.config.webmapId
        }
      });

      await state.map.load();
      webmapLoaded = true;
      updateStatus("WebMap loaded successfully.", "success");
    } catch (e) {
      console.warn("Could not load WebMap by ID:", e);
      webmapLoaded = false;
    }
  }

  // Fallback to standard base map if WebMap is missing or failed
  if (!webmapLoaded) {
    updateStatus("Using fallback migration base map...", "info");
    state.map = new Map({
      basemap: "topo-vector"
    });
  }

  // Create MapView
  state.view = new MapView({
    container: "viewDiv",
    map: state.map,
    center: state.config.defaultCenter,
    zoom: state.config.defaultZoom
  });

  await state.view.when();

  // Add our custom graphics layers on top
  state.map.addMany([
    state.bufferGraphicsLayer,
    state.highlightGraphicsLayer,
    state.routeGraphicsLayer
  ]);

  // Inspect and configure the obstacle layer in the map
  await configureObstacleLayer(esri);

  // Setup Sketch widget for route editing
  setupSketchWidget(esri);

  updateStatus("Ready. Sketch a migration route into Europe, then click 'Analyze Route'.", "ready");
}

/**
 * Finds and configures the 'route-obstacles' layer.
 * Enforces layer.visible = false as required.
 */
async function configureObstacleLayer(esri) {
  const { FeatureLayer, Graphic, Point } = esri;
  let targetLayer = findObstacleLayer(state.map, state.config.obstacleLayerTitle);

  if (targetLayer) {
    // Crucial requirement: "these obstacles are difficulties that refugees face on their migration routes and this layer is not visible in the map."
    ensureObstacleLayerHidden(targetLayer);
    state.obstacleLayer = targetLayer;
    state.usingSampleData = false;

    try {
      await targetLayer.load();
      ensureObstacleLayerHidden(targetLayer);

      // Query all features from the layer for fast in-memory spatial intersection
      if (typeof targetLayer.queryFeatures === "function") {
        const query = targetLayer.createQuery();
        query.where = "1=1";
        query.outFields = ["*"];
        query.returnGeometry = true;
        const featureSet = await targetLayer.queryFeatures(query);
        state.obstacleFeatures = featureSet.features || [];
      }
      updateObstacleSourceBadge(`WebMap Layer: "${targetLayer.title}" (Hidden, ${state.obstacleFeatures.length} obstacles)`);
    } catch (queryErr) {
      console.warn("Could not pre-fetch obstacle layer features:", queryErr);
    }
  } else {
    // If not found in the webmap, create a hidden feature layer from realistic sample obstacles
    console.info(`Layer "${state.config.obstacleLayerTitle}" not found in WebMap. Initializing fallback obstacle layer.`);
    state.usingSampleData = true;

    // Convert SAMPLE_OBSTACLES into ArcGIS Graphics / Features
    const sampleGraphics = SAMPLE_OBSTACLES.map((obs) => {
      return new Graphic({
        geometry: new Point({
          longitude: obs.geometry.longitude,
          latitude: obs.geometry.latitude,
          spatialReference: { wkid: 4326 }
        }),
        attributes: {
          id: obs.id,
          title: obs.title,
          description: obs.description,
          weight: obs.weight,
          category: obs.category,
          perspectiveNote: obs.perspectiveNote
        }
      });
    });

    state.obstacleFeatures = sampleGraphics;

    // Create hidden layer in map
    const mockLayer = new FeatureLayer({
      title: state.config.obstacleLayerTitle,
      source: sampleGraphics,
      objectIdField: "id",
      fields: [
        { name: "id", type: "string" },
        { name: state.config.titleField || "title", type: "string" },
        { name: state.config.descriptionField || "description", type: "string" },
        { name: state.config.weightField || "weight", type: "double" },
        { name: state.config.categoryField || "category", type: "string" }
      ],
      visible: false, // Ensure layer is invisible as required
      listMode: "hide"
    });

    state.map.add(mockLayer);
    state.obstacleLayer = mockLayer;
    ensureObstacleLayerHidden(mockLayer);

    updateObstacleSourceBadge(`Fallback Dataset: "${state.config.obstacleLayerTitle}" (Hidden, ${SAMPLE_OBSTACLES.length} obstacles)`);
  }
}

/**
 * Configures the Sketch widget for polyline migration routes
 */
function setupSketchWidget(esri) {
  const { Sketch } = esri;

  // Custom polyline symbol for migration routes
  const routeSymbol = {
    type: "simple-line",
    color: state.config.colors.route,
    width: state.config.colors.routeWidth || 3,
    style: "solid",
    cap: "round",
    join: "round"
  };

  state.sketch = new Sketch({
    layer: state.routeGraphicsLayer,
    view: state.view,
    creationMode: "update",
    defaultCreateOptions: { hasZ: false },
    polylineSymbol: routeSymbol,
    visibleElements: {
      createTools: {
        point: false,
        polygon: false,
        rectangle: false,
        circle: false,
        polyline: true
      },
      selectionTools: {
        "lasso-selection": false,
        "rectangle-selection": false
      },
      settingsMenu: false
    }
  });

  // Attach sketch events to track user interactions
  state.sketch.on("create", (event) => {
    if (event.state === "complete") {
      onRoutesModified();
    }
  });

  state.sketch.on("update", (event) => {
    if (event.state === "complete") {
      onRoutesModified();
    }
  });

  state.sketch.on("delete", () => {
    onRoutesModified();
  });

  // Add sketch widget to bottom-left of view
  state.view.ui.add(state.sketch, "bottom-left");
}

/**
 * Triggered whenever routes are created, updated, or removed
 */
function onRoutesModified() {
  const count = state.routeGraphicsLayer ? state.routeGraphicsLayer.graphics.length : 0;
  const routeCountElem = document.getElementById("route-count-display");
  if (routeCountElem) {
    routeCountElem.textContent = count === 1 ? "1 route sketched" : `${count} routes sketched`;
  }

  // Clear previous buffer and highlight if routes change
  if (state.bufferGraphicsLayer) state.bufferGraphicsLayer.removeAll();
  if (state.highlightGraphicsLayer) state.highlightGraphicsLayer.removeAll();
  state.currentBufferGeometry = null;

  const analyzeBtn = document.getElementById("analyze-btn");
  if (analyzeBtn) {
    if (count > 0) {
      analyzeBtn.classList.add("pulse");
    } else {
      analyzeBtn.classList.remove("pulse");
    }
  }
}

/**
 * Core analysis workflow
 * Triggered when clicking "Analyze Route" button
 */
export async function analyzeRoutes() {
  if (state.isAnalyzing) return;

  const graphics = state.routeGraphicsLayer ? state.routeGraphicsLayer.graphics.toArray() : [];

  if (graphics.length === 0) {
    alert("Please sketch at least one migration route polyline on the map first using the 'Draw Route' tool.");
    return;
  }

  setAnalyzingState(true);
  updateStatus("Buffering migration routes and calculating spatial intersections...", "info");

  try {
    const geometries = graphics.map((g) => g.geometry);

    // Calculate total route distance
    let totalLengthKm = 0;
    if (state.geometryEngine && typeof state.geometryEngine.geodesicLength === "function") {
      for (const geom of geometries) {
        totalLengthKm += state.geometryEngine.geodesicLength(geom, "kilometers") || 0;
      }
    }

    // Step 1: Buffer the route polylines by configurable buffer distance and unit
    const bufferDist = state.config.bufferDistance;
    const bufferUnit = state.config.bufferUnit;

    const bufferGeometry = bufferRouteGeometries(geometries, bufferDist, bufferUnit, state.geometryEngine);
    state.currentBufferGeometry = bufferGeometry;

    // Display buffer graphics on map
    renderBufferGraphic(bufferGeometry);

    // Step 2: Query / Intersect buffer with the route-obstacles layer
    let featuresToIntersect = state.obstacleFeatures;

    // If layer supports spatial query directly, use it to get exact intersecting features
    if (state.obstacleLayer && typeof state.obstacleLayer.queryFeatures === "function" && !state.usingSampleData) {
      try {
        const query = state.obstacleLayer.createQuery();
        query.geometry = bufferGeometry;
        query.spatialRelationship = "intersects";
        query.outFields = ["*"];
        query.returnGeometry = true;
        const featureSet = await state.obstacleLayer.queryFeatures(query);
        if (featureSet && featureSet.features) {
          featuresToIntersect = featureSet.features;
        }
      } catch (spatialQueryErr) {
        console.warn("Spatial query on obstacleLayer failed, falling back to client-side intersection:", spatialQueryErr);
      }
    }

    // Perform spatial intersection
    const intersectedObstacles = intersectBufferWithObstacles(
      bufferGeometry,
      featuresToIntersect,
      state.geometryEngine,
      state.config
    );

    // Step 3: Highlight intersected obstacles on map
    renderObstacleHighlights(intersectedObstacles);

    // Step 4: Consolidate analysis and generate refugee perspective feedback
    const summary = summarizeRouteAnalysis(intersectedObstacles, state.config, {
      routeCount: graphics.length,
      totalLengthKm
    });

    state.latestAnalysis = summary;

    // Step 5: Render summary and perspective feedback in UI
    renderAnalysisResults(summary);

    updateStatus(`Analysis complete: ${summary.obstacleCount} obstacles encountered (Total Weight: ${summary.totalWeight}).`, "success");

    // Scroll analysis panel to top on mobile/tablet
    const panel = document.getElementById("analysis-panel");
    if (panel) {
      panel.scrollTop = 0;
      panel.classList.add("active");
    }
  } catch (err) {
    console.error("Error during route analysis:", err);
    updateStatus("Analysis failed: " + err.message, "error");
    alert("Analysis encountered an error: " + err.message);
  } finally {
    setAnalyzingState(false);
  }
}

/**
 * Renders the route buffer on bufferGraphicsLayer
 */
function renderBufferGraphic(bufferGeometry) {
  if (!state.bufferGraphicsLayer || !state.GraphicClass || !bufferGeometry) return;

  state.bufferGraphicsLayer.removeAll();

  const bufferGraphic = new state.GraphicClass({
    geometry: bufferGeometry,
    symbol: {
      type: "simple-fill",
      color: state.config.colors.bufferFill,
      outline: {
        color: state.config.colors.bufferOutline,
        width: 1.5,
        style: "dash"
      }
    }
  });

  state.bufferGraphicsLayer.add(bufferGraphic);

  const toggle = document.getElementById("toggle-buffer-visibility");
  if (toggle) {
    state.bufferGraphicsLayer.visible = toggle.checked;
  }
}

/**
 * Highlights intersected obstacle features on highlightGraphicsLayer
 */
function renderObstacleHighlights(intersectedObstacles) {
  if (!state.highlightGraphicsLayer || !state.GraphicClass) return;

  state.highlightGraphicsLayer.removeAll();

  for (const obs of intersectedObstacles) {
    const geom = obs.geometry;
    if (!geom) continue;

    // Marker symbol sized proportionally to weight
    const size = Math.min(24, Math.max(12, obs.weight * 2));

    const graphic = new state.GraphicClass({
      geometry: geom,
      symbol: {
        type: "simple-marker",
        color: state.config.colors.obstacleHighlightFill,
        size: size,
        outline: {
          color: state.config.colors.obstacleHighlight,
          width: 2
        }
      },
      attributes: {
        id: obs.id,
        title: obs.title,
        description: obs.description,
        weight: obs.weight,
        category: obs.category,
        perspectiveNote: obs.perspectiveNote
      },
      popupTemplate: {
        title: "{title} (Difficulty Weight: {weight}/10)",
        content: `
          <div style="font-family: inherit; font-size: 13px;">
            <p><strong>Category:</strong> {category}</p>
            <p><strong>Description:</strong> {description}</p>
            <p style="background: #fff3cd; padding: 8px; border-left: 3px solid #ffc107; border-radius: 4px; margin-top: 8px;">
              <strong>Refugee Experience:</strong> {perspectiveNote}
            </p>
          </div>
        `
      }
    });

    state.highlightGraphicsLayer.add(graphic);
  }
}

/**
 * Renders the analysis summary and educational refugee perspective feedback in the panel
 */
function renderAnalysisResults(summary) {
  const container = document.getElementById("analysis-results-container");
  const emptyState = document.getElementById("analysis-empty-state");
  if (!container) return;

  if (emptyState) emptyState.style.display = "none";
  container.style.display = "block";

  const { totalWeight, obstacleCount, averageWeight, maxWeight, perspectiveFeedback, routeMetrics, buffer } = summary;
  const { risk, categories, narratives, reflectionQuestions } = perspectiveFeedback;

  // Build HTML
  let html = `
    <div class="result-card overview-card">
      <div class="risk-badge-banner" style="background-color: ${risk.color}">
        <span class="risk-badge-label">${risk.level}</span>
        <span class="risk-badge-score">Total Difficulty Score: ${totalWeight}</span>
      </div>
      <p class="risk-narrative">${risk.description}</p>

      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-value">${obstacleCount}</div>
          <div class="metric-label">Obstacles Encountered</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${averageWeight}</div>
          <div class="metric-label">Avg Difficulty Weight</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${maxWeight}/10</div>
          <div class="metric-label">Peak Threat Level</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${buffer.distance} ${buffer.unit}</div>
          <div class="metric-label">Buffer Corridor</div>
        </div>
      </div>
      ${routeMetrics.totalLengthKm ? `<div class="route-length-note">Estimated route length: <strong>${routeMetrics.totalLengthKm} km</strong> across ${routeMetrics.routeCount} sketched path(s)</div>` : ""}
    </div>

    <!-- Educational Refugee Perspective Section -->
    <div class="result-card perspective-card">
      <div class="card-header">
        <span class="card-icon">🧭</span>
        <h3>Refugee Perspective & Journey Reality</h3>
      </div>
      <p class="perspective-intro">
        As students analyzing this migration route, consider the lived experiences of individuals and families who attempt this passage when escaping conflict, persecution, or extreme deprivation:
      </p>

      <div class="narratives-list">
        ${narratives
          .map(
            (nar) => `
          <div class="narrative-item">
            <span class="narrative-bullet">⚠️</span>
            <div class="narrative-text">${nar}</div>
          </div>
        `
          )
          .join("")}
      </div>

      <div class="reflection-box">
        <h4>Student Reflection & Inquiry Questions</h4>
        <ul>
          ${reflectionQuestions
            .map((q) => `<li><strong>•</strong> ${q}</li>`)
            .join("")}
        </ul>
      </div>
    </div>

    <!-- Category Breakdown Section -->
    <div class="result-card categories-card">
      <div class="card-header">
        <span class="card-icon">📊</span>
        <h3>Hazard Breakdown by Category</h3>
      </div>
      <div class="category-bars">
        ${categories
          .map((cat) => {
            const pct = Math.min(100, Math.round((cat.totalWeight / Math.max(1, totalWeight)) * 100));
            return `
            <div class="category-bar-row">
              <div class="category-info">
                <span class="category-name">${cat.name} (${cat.count})</span>
                <span class="category-weight">${cat.totalWeight} pts (${pct}%)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    </div>

    <!-- Encountered Obstacles List -->
    <div class="result-card obstacles-card">
      <div class="card-header">
        <span class="card-icon">🛑</span>
        <h3>Encountered Difficulties Along Route (${obstacleCount})</h3>
      </div>
      ${
        obstacleCount === 0
          ? `<p class="empty-list-note">No documented obstacles intersect the buffered corridor for this sketched route.</p>`
          : `
        <div class="obstacles-list">
          ${summary.obstacles
            .map((obs, idx) => {
              const weightClass = obs.weight >= 8 ? "weight-severe" : obs.weight >= 5 ? "weight-moderate" : "weight-low";
              return `
              <div class="obstacle-item" data-id="${obs.id}">
                <div class="obstacle-item-header">
                  <span class="obstacle-title">${idx + 1}. ${obs.title}</span>
                  <span class="obstacle-weight-badge ${weightClass}">Weight: ${obs.weight}</span>
                </div>
                <div class="obstacle-category-tag">${obs.category}</div>
                <div class="obstacle-description">${obs.description}</div>
                ${
                  obs.perspectiveNote
                    ? `<div class="obstacle-perspective-note"><em>"${obs.perspectiveNote}"</em></div>`
                    : ""
                }
              </div>
            `;
            })
            .join("")}
        </div>
      `
      }
    </div>
  `;

  container.innerHTML = html;

  // Add click handlers on obstacle items to focus on map if coordinates available
  container.querySelectorAll(".obstacle-item").forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-id");
      focusObstacleOnMap(id);
    });
  });
}

/**
 * Focuses and zooms to an obstacle on the map when clicked in the summary list
 */
function focusObstacleOnMap(id) {
  if (!state.view || !state.highlightGraphicsLayer) return;

  const graphic = state.highlightGraphicsLayer.graphics.find((g) => g.attributes && g.attributes.id === id);
  if (graphic && graphic.geometry) {
    state.view.goTo({
      target: graphic.geometry,
      zoom: Math.max(state.view.zoom, 8)
    });
    state.view.openPopup({
      features: [graphic],
      location: graphic.geometry
    });
  }
}

/**
 * Offline / fallback preview mode when ArcGIS CDN cannot be contacted
 */
function initOfflineMode() {
  updateStatus("Operating in standalone preview mode (ArcGIS CDN offline in this environment).", "info");
  updateObstacleSourceBadge(`Simulated Dataset: "${state.config.obstacleLayerTitle}" (Hidden, ${SAMPLE_OBSTACLES.length} obstacles)`);

  const viewDiv = document.getElementById("viewDiv");
  if (viewDiv && !viewDiv.querySelector(".offline-map-placeholder")) {
    viewDiv.innerHTML = `
      <div class="offline-map-placeholder">
        <div class="offline-card">
          <h3>🗺️ Interactive Migration Map Canvas</h3>
          <p>ArcGIS Maps SDK for JavaScript is configured to load from CDN (<code>https://js.arcgis.com/4.31/</code>).</p>
          <p>In standard browser environments with internet access, the full interactive WebMap, Sketch polyline widget, and geometryEngine buffer will render directly.</p>
          <div class="offline-demo-box">
            <h4>Demo Route Simulation</h4>
            <p>You can click the <strong>'Simulate Route & Analyze'</strong> button below to run the complete analysis engine on sample refugee routes across the Mediterranean and Balkans.</p>
            <button id="simulate-route-btn" class="btn btn-primary">Simulate Route & Analyze</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("simulate-route-btn")?.addEventListener("click", () => {
      simulateAndAnalyze();
    });
  }
}

/**
 * Simulates route analysis with realistic coordinates and mock spatial intersection
 */
function simulateAndAnalyze() {
  updateStatus("Simulating route sketching and spatial buffering...", "info");

  // Create sample intersected obstacles (subset of SAMPLE_OBSTACLES that fall on Central Med route)
  const simulatedObstacles = SAMPLE_OBSTACLES.filter((o) =>
    ["obs-med-central", "obs-med-libya-coast", "obs-balkan-mountains", "obs-hungary-fence", "obs-smuggler-extortion"].includes(o.id)
  );

  const summary = summarizeRouteAnalysis(simulatedObstacles, state.config, {
    routeCount: 1,
    totalLengthKm: 1850
  });

  state.latestAnalysis = summary;
  renderAnalysisResults(summary);
  updateStatus("Simulation complete: 5 obstacles encountered (Total Weight: 43).", "success");
}

/**
 * Setup DOM event listeners for buttons, controls, settings modal
 */
function setupUIEventListeners() {
  // Analyze Route button
  const analyzeBtn = document.getElementById("analyze-btn");
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", () => {
      if (state.geometryEngine) {
        analyzeRoutes();
      } else {
        simulateAndAnalyze();
      }
    });
  }

  // Draw Route button
  const drawRouteBtn = document.getElementById("draw-route-btn");
  if (drawRouteBtn) {
    drawRouteBtn.addEventListener("click", () => {
      if (state.sketch) {
        state.sketch.create("polyline");
        updateStatus("Drawing mode active: Click on map to add vertices to your route. Double click to finish.", "info");
      } else {
        simulateAndAnalyze();
      }
    });
  }

  // Clear Route button
  const clearRouteBtn = document.getElementById("clear-route-btn");
  if (clearRouteBtn) {
    clearRouteBtn.addEventListener("click", () => {
      if (state.routeGraphicsLayer) state.routeGraphicsLayer.removeAll();
      if (state.bufferGraphicsLayer) state.bufferGraphicsLayer.removeAll();
      if (state.highlightGraphicsLayer) state.highlightGraphicsLayer.removeAll();
      state.currentBufferGeometry = null;
      state.latestAnalysis = null;
      onRoutesModified();

      const container = document.getElementById("analysis-results-container");
      const emptyState = document.getElementById("analysis-empty-state");
      if (container) container.style.display = "none";
      if (emptyState) emptyState.style.display = "block";
      updateStatus("Routes and analysis cleared. Click 'Draw Route' to start.", "ready");
    });
  }

  // Buffer visibility toggle
  const toggleBuffer = document.getElementById("toggle-buffer-visibility");
  if (toggleBuffer) {
    toggleBuffer.addEventListener("change", (e) => {
      if (state.bufferGraphicsLayer) {
        state.bufferGraphicsLayer.visible = e.target.checked;
      }
    });
  }

  // Settings modal open/close
  const settingsBtn = document.getElementById("settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsBtn = document.getElementById("close-settings-btn");
  const cancelSettingsBtn = document.getElementById("cancel-settings-btn");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const resetSettingsBtn = document.getElementById("reset-settings-btn");
  const shareLinkBtn = document.getElementById("share-link-btn");

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener("click", () => {
      populateSettingsForm();
      settingsModal.classList.add("modal-open");
    });
  }

  const closeModal = () => {
    if (settingsModal) settingsModal.classList.remove("modal-open");
  };

  if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeModal);
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener("click", closeModal);

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
      applySettingsFromForm();
      closeModal();
    });
  }

  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener("click", () => {
      if (confirm("Reset all settings to default values?")) {
        clearConfig();
        state.config = getConfig();
        populateSettingsForm();
        alert("Settings reset to defaults. Reloading app...");
        window.location.reload();
      }
    });
  }

  if (shareLinkBtn) {
    shareLinkBtn.addEventListener("click", () => {
      const shareUrl = generateShareableUrl();
      navigator.clipboard?.writeText(shareUrl).then(
        () => alert("Shareable URL copied to clipboard!\n" + shareUrl),
        () => prompt("Copy shareable URL:", shareUrl)
      );
    });
  }

  // Help / About modal
  const helpBtn = document.getElementById("help-btn");
  const helpModal = document.getElementById("help-modal");
  const closeHelpBtn = document.getElementById("close-help-btn");
  if (helpBtn && helpModal) {
    helpBtn.addEventListener("click", () => helpModal.classList.add("modal-open"));
  }
  if (closeHelpBtn && helpModal) {
    closeHelpBtn.addEventListener("click", () => helpModal.classList.remove("modal-open"));
  }

  // Slider synchronization with number input
  const bufferSlider = document.getElementById("setting-buffer-slider");
  const bufferInput = document.getElementById("setting-buffer");
  if (bufferSlider && bufferInput) {
    bufferSlider.addEventListener("input", () => {
      bufferInput.value = bufferSlider.value;
    });
    bufferInput.addEventListener("input", () => {
      bufferSlider.value = bufferInput.value;
    });
  }
}

/**
 * Populates the settings modal form with current configuration values
 */
function populateSettingsForm() {
  const c = state.config || getConfig();

  setVal("setting-webmap-id", c.webmapId || "");
  setVal("setting-buffer", c.bufferDistance || 30);
  setVal("setting-buffer-slider", c.bufferDistance || 30);
  setVal("setting-unit", c.bufferUnit || "kilometers");
  setVal("setting-layer-title", c.obstacleLayerTitle || "route-obstacles");
  setVal("setting-weight-field", c.weightField || "weight");
  setVal("setting-desc-field", c.descriptionField || "description");
  setVal("setting-title-field", c.titleField || "title");
  setVal("setting-category-field", c.categoryField || "category");
}

/**
 * Saves and applies modified settings from the form
 */
function applySettingsFromForm() {
  const updated = {
    webmapId: getVal("setting-webmap-id").trim(),
    bufferDistance: parseFloat(getVal("setting-buffer")) || 30,
    bufferUnit: getVal("setting-unit"),
    obstacleLayerTitle: getVal("setting-layer-title").trim() || "route-obstacles",
    weightField: getVal("setting-weight-field").trim() || "weight",
    descriptionField: getVal("setting-desc-field").trim() || "description",
    titleField: getVal("setting-title-field").trim() || "title",
    categoryField: getVal("setting-category-field").trim() || "category"
  };

  saveConfig(updated);
  state.config = getConfig();

  // Update buffer label in UI
  const bufferLabel = document.getElementById("buffer-distance-label");
  if (bufferLabel) {
    bufferLabel.textContent = `${state.config.bufferDistance} ${state.config.bufferUnit}`;
  }

  alert("Settings saved. If you changed WebMap ID or Layer Title, refresh page to reload the map.");
}

/**
 * Generates a shareable URL containing the current settings
 */
function generateShareableUrl() {
  const c = state.config || getConfig();
  const url = new URL(window.location.href);
  url.searchParams.set("webmap", c.webmapId);
  url.searchParams.set("buffer", c.bufferDistance);
  url.searchParams.set("unit", c.bufferUnit);
  url.searchParams.set("layer", c.obstacleLayerTitle);
  url.searchParams.set("weightField", c.weightField);
  url.searchParams.set("descField", c.descriptionField);
  return url.toString();
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function updateStatus(text, type = "info") {
  const banner = document.getElementById("status-banner");
  if (banner) {
    banner.textContent = text;
    banner.className = `status-banner status-${type}`;
  }
}

function updateObstacleSourceBadge(text) {
  const badge = document.getElementById("obstacle-source-badge");
  if (badge) {
    badge.textContent = text;
  }
}

function setAnalyzingState(loading) {
  state.isAnalyzing = loading;
  const analyzeBtn = document.getElementById("analyze-btn");
  if (analyzeBtn) {
    analyzeBtn.disabled = loading;
    analyzeBtn.innerHTML = loading
      ? `<span class="spinner"></span> Analyzing Route...`
      : `<span class="btn-icon">⚡</span> Analyze Route`;
  }
}

// Auto-initialize when loaded in browser
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initApp();
  });
}
