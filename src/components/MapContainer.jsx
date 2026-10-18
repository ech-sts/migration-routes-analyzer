import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import Sketch from "@arcgis/core/widgets/Sketch.js";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine.js";
import { sampleObstacles } from "../sample-obstacles.js";
import {
  findObstacleLayer,
  ensureObstacleLayerHidden,
  buildObstacleIntersectionQuery,
  bufferRouteGeometries,
  intersectBufferWithObstacles,
  summarizeRouteAnalysis
} from "../analyzer.js";

const MapContainer = forwardRef(function MapContainer(
  { config, onRouteChange, onAnalysisComplete, onStatusUpdate },
  ref
) {
  const mapElementRef = useRef(null);
  const viewRef = useRef(null);
  const sketchRef = useRef(null);
  const routesLayerRef = useRef(null);
  const bufferLayerRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const obstacleLayerRef = useRef(null);

  // Expose imperative methods to parent (App.jsx)
  useImperativeHandle(ref, () => ({
    startSketch() {
      if (sketchRef.current) {
        sketchRef.current.create("polyline");
      }
    },

    clearAll() {
      if (routesLayerRef.current) routesLayerRef.current.removeAll();
      if (bufferLayerRef.current) bufferLayerRef.current.removeAll();
      if (highlightLayerRef.current) highlightLayerRef.current.removeAll();
      if (sketchRef.current) sketchRef.current.cancel();
      if (onRouteChange) onRouteChange(0);
    },

    async analyze() {
      if (!routesLayerRef.current || !viewRef.current) {
        throw new Error("Map or sketch layer is not initialized yet.");
      }

      try {
        await viewRef.current.map.loadAll();
      } catch (loadErr) {
        console.warn("Could not load every WebMap layer before analysis:", loadErr);
      }

      const routeGraphics = routesLayerRef.current.graphics
        .filter(
          (g) =>
            g &&
            g.geometry &&
            (g.geometry.type === "polyline" || g.geometry.type === "line")
        )
        .toArray();

      if (routeGraphics.length === 0) {
        throw new Error("Please sketch at least one migration route on the map first.");
      }

      const routeGeometries = routeGraphics.map((g) => g.geometry);

      // 1. Buffer sketched routes
      let bufferPolygon;
      try {
        bufferPolygon = bufferRouteGeometries(
          routeGeometries,
          config.bufferDistance,
          config.bufferUnit,
          geometryEngine
        );
      } catch (err) {
        throw new Error(`Buffering failed: ${err.message}`);
      }

      // 2. Clear old buffer & highlight graphics, render new buffer
      if (bufferLayerRef.current) {
        bufferLayerRef.current.removeAll();
        const bufferGraphic = new Graphic({
          geometry: bufferPolygon,
          symbol: new SimpleFillSymbol({
            color: [255, 140, 0, 0.2],
            outline: {
              color: [255, 140, 0, 0.85],
              width: 1.5,
              style: "dash"
            }
          }),
          attributes: {
            type: "route-buffer",
            distance: config.bufferDistance,
            unit: config.bufferUnit
          }
        });
        bufferLayerRef.current.add(bufferGraphic);
      }

      // 3. Query obstacle layer
      const obstacleLayer =
        findObstacleLayer(viewRef.current.map, config.obstacleLayerTitle) ||
        obstacleLayerRef.current;
      obstacleLayerRef.current = obstacleLayer;

      let features = [];
      if (obstacleLayer) {
        ensureObstacleLayerHidden(obstacleLayer);
        try {
          if (typeof obstacleLayer.queryFeatures === "function") {
            const query = buildObstacleIntersectionQuery(obstacleLayer, bufferPolygon);
            const res = await obstacleLayer.queryFeatures(query);
            features = res.features || [];
          } else if (obstacleLayer.graphics) {
            features = obstacleLayer.graphics.toArray();
          }
        } catch (queryErr) {
          console.warn("Could not query obstacle layer:", queryErr);
          throw new Error(`Could not query obstacle layer: ${queryErr.message}`);
        }
      }

      // 4. Intersect buffer with obstacles
      const intersected = intersectBufferWithObstacles(
        bufferPolygon,
        features,
        geometryEngine,
        config,
        { prefiltered: Boolean(obstacleLayer?.queryFeatures) }
      );

      // 5. Highlight intersected obstacles
      if (highlightLayerRef.current) {
        highlightLayerRef.current.removeAll();
        for (const obs of intersected) {
          const highlightGraphic = new Graphic({
            geometry: obs.geometry,
            symbol: new SimpleMarkerSymbol({
              style: "diamond",
              color: [229, 62, 62, 0.9],
              size: 14,
              outline: {
                color: [255, 255, 255, 1],
                width: 2
              }
            }),
            attributes: {
              title: obs.title,
              category: obs.category,
              weight: obs.weight,
              description: obs.description
            },
            popupTemplate: {
              title: "{title}",
              content: `
                <p><strong>Category:</strong> {category}</p>
                <p><strong>Difficulty Weight:</strong> {weight}</p>
                <p>{description}</p>
              `
            }
          });
          highlightLayerRef.current.add(highlightGraphic);
        }
      }

      // 6. Calculate total length in km
      let totalLengthKm = 0;
      for (const geom of routeGeometries) {
        try {
          if (geometryEngine.geodesicLength) {
            totalLengthKm += geometryEngine.geodesicLength(geom, "kilometers");
          } else {
            totalLengthKm += geometryEngine.planarLength(geom, "kilometers");
          }
        } catch (e) {
          // ignore geometry length calculation failure
        }
      }

      // 7. Consolidate results
      const summary = summarizeRouteAnalysis(intersected, config, {
        routeCount: routeGraphics.length,
        totalLengthKm
      });

      // 8. Adjust view extent to show buffer corridor if available
      if (bufferPolygon && bufferPolygon.extent && viewRef.current.goTo) {
        viewRef.current.goTo(bufferPolygon.extent.expand(1.3), { duration: 800 });
      }

      return summary;
    }
  }));

  // Setup ArcGIS View and Layers when custom element is mounted
  useEffect(() => {
    const mapEl = mapElementRef.current;
    if (!mapEl) return;

    let destroyed = false;

    async function initializeLayers(view) {
      if (destroyed || !view || !view.map) return;
      viewRef.current = view;

      try {
        await view.map.loadAll();
      } catch (loadErr) {
        console.warn("Could not load every WebMap layer before obstacle discovery:", loadErr);
      }

      // Ensure view padding and UI elements
      view.ui.move("zoom", "top-left");

      // 1. Routes Sketch Layer
      const routesLayer = new GraphicsLayer({
        id: "user-sketched-routes",
        title: "Sketched Migration Routes",
        listMode: "show"
      });
      view.map.add(routesLayer);
      routesLayerRef.current = routesLayer;

      // 2. Buffer corridor visualization layer
      const bufferLayer = new GraphicsLayer({
        id: "route-buffer-corridor",
        title: "Route Buffer Corridor",
        listMode: "show"
      });
      view.map.add(bufferLayer);
      bufferLayerRef.current = bufferLayer;

      // 3. Highlight layer for intersected obstacles
      const highlightLayer = new GraphicsLayer({
        id: "intersected-obstacles-highlight",
        title: "Intersected Obstacles (Analysis)",
        listMode: "show"
      });
      view.map.add(highlightLayer);
      highlightLayerRef.current = highlightLayer;

      // 4. Look for existing route obstacles layer in WebMap
      let obstacleLayer = findObstacleLayer(view.map, config.obstacleLayerTitle);

      if (obstacleLayer) {
        // Enforce invisiblity requirement
        ensureObstacleLayerHidden(obstacleLayer);
        obstacleLayerRef.current = obstacleLayer;
        if (onStatusUpdate) {
          onStatusUpdate(`Connected to WebMap layer: "${obstacleLayer.title}" (invisible on map)`);
        }
      } else {
        // Create local fallback GeoJSON layer using sampleObstacles
        try {
          const blob = new Blob([JSON.stringify(sampleObstacles)], {
            type: "application/json"
          });
          const url = URL.createObjectURL(blob);
          const fallbackLayer = new GeoJSONLayer({
            id: "route-obstacles-fallback",
            title: config.obstacleLayerTitle,
            url,
            visible: false, // Must be invisible per requirement
            listMode: "hide",
            outFields: ["*"]
          });
          view.map.add(fallbackLayer);
          obstacleLayerRef.current = fallbackLayer;
          if (onStatusUpdate) {
            onStatusUpdate(`Initialized fallback obstacle dataset (${sampleObstacles.features.length} points, hidden on map)`);
          }
        } catch (e) {
          console.warn("Could not create fallback GeoJSONLayer:", e);
        }
      }

      // 5. Initialize Sketch widget
      const sketch = new Sketch({
        view,
        layer: routesLayer,
        creationMode: "update",
        availableCreateTools: ["polyline"],
        defaultUpdateOptions: {
          toggleToolOnClick: false
        },
        visibleElements: {
          createTools: {
            point: false,
            polyline: true,
            polygon: false,
            rectangle: false,
            circle: false
          },
          selectionTools: {
            "lasso-selection": false,
            "rectangle-selection": false
          },
          settingsMenu: false
        },
        polylineSymbol: new SimpleLineSymbol({
          color: [255, 140, 0, 1], // Warm orange for migration paths
          width: 3.5,
          style: "solid"
        })
      });

      view.ui.add(sketch, "top-right");
      sketchRef.current = sketch;

      // Listen to sketch events to update route count
      const updateCount = () => {
        if (!routesLayerRef.current) return;
        const count = routesLayerRef.current.graphics.filter(
          (g) => g && g.geometry && (g.geometry.type === "polyline" || g.geometry.type === "line")
        ).length;
        if (onRouteChange) {
          onRouteChange(count);
        }
      };

      sketch.on("create", (event) => {
        if (event.state === "complete") {
          updateCount();
          if (onStatusUpdate) {
            onStatusUpdate("Route polyline sketched. Click 'Analyze Route' to evaluate.");
          }
        }
      });

      sketch.on("delete", () => {
        updateCount();
      });

      sketch.on("update", (event) => {
        if (event.state === "complete") {
          updateCount();
        }
      });
    }

    const handleViewReady = (event) => {
      const view = event.target.view;
      if (view) {
        initializeLayers(view);
      }
    };

    mapEl.addEventListener("arcgisViewReadyChange", handleViewReady);

    // If view is already attached
    if (mapEl.view) {
      initializeLayers(mapEl.view);
    }

    return () => {
      destroyed = true;
      if (mapEl) {
        mapEl.removeEventListener("arcgisViewReadyChange", handleViewReady);
      }
      if (sketchRef.current) {
        sketchRef.current.destroy();
        sketchRef.current = null;
      }
    };
  }, [config.webmapId, config.obstacleLayerTitle]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <arcgis-map
        ref={mapElementRef}
        item-id={config.webmapId}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <arcgis-zoom position="top-left" />
        <arcgis-scale-bar position="bottom-left" />
      </arcgis-map>

      {/* Floating on-map toolbar for quick sketching & buffer indicator */}
      <div
        style={{
          position: "absolute",
          top: "15px",
          left: "60px",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: "6px 12px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          backdropFilter: "blur(4px)"
        }}
      >
        <calcite-button
          appearance="outline"
          kind="brand"
          scale="s"
          icon-start="pencil"
          onClick={() => {
            if (sketchRef.current) {
              sketchRef.current.create("polyline");
            }
          }}
          title="Click to start drawing a migration route on the map"
        >
          Draw Route Polyline
        </calcite-button>

        <calcite-chip scale="s" value="buffer-info" icon="extent">
          Corridor: {config.bufferDistance} {config.bufferUnit}
        </calcite-chip>
      </div>
    </div>
  );
});

export default MapContainer;
