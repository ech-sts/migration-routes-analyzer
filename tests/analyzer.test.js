import test from "node:test";
import assert from "node:assert/strict";
import {
  findObstacleLayer,
  ensureObstacleLayerHidden,
  extractObstacleAttributes,
  bufferRouteGeometries,
  intersectBufferWithObstacles,
  evaluateJourneyRisk,
  generateRefugeePerspectiveFeedback,
  summarizeRouteAnalysis
} from "../src/analyzer.js";
import { DEFAULT_CONFIG } from "../src/config.js";

test("findObstacleLayer finds layer by exact or case-insensitive title", () => {
  const layers = [
    { id: "base-layer", title: "World Topo" },
    { id: "layer-1", title: "Route-Obstacles" },
    { id: "layer-2", title: "Cities" }
  ];

  const found = findObstacleLayer(layers, "route-obstacles");
  assert.notEqual(found, null);
  assert.equal(found.id, "layer-1");

  const notFound = findObstacleLayer(layers, "non-existent");
  assert.equal(notFound, null);
});

test("ensureObstacleLayerHidden sets layer.visible to false", () => {
  const layer = { id: "route-obstacles", visible: true, listMode: "show" };
  ensureObstacleLayerHidden(layer);
  assert.equal(layer.visible, false);
  assert.equal(layer.listMode, "hide");
});

test("extractObstacleAttributes extracts normalized fields and handles fallbacks", () => {
  // 1. Direct standard fields
  const item1 = {
    attributes: {
      title: "Minefield Danger",
      description: "Unmarked minefield from 1990s conflict",
      weight: 8,
      category: "Terrain"
    }
  };
  const extracted1 = extractObstacleAttributes(item1, DEFAULT_CONFIG);
  assert.equal(extracted1.title, "Minefield Danger");
  assert.equal(extracted1.description, "Unmarked minefield from 1990s conflict");
  assert.equal(extracted1.weight, 8);
  assert.equal(extracted1.category, "Terrain");

  // 2. Fallback field names (e.g. name, desc, severity)
  const item2 = {
    attributes: {
      name: "Coast Guard Patrol",
      desc: "Interception in international waters",
      severity: "9.5",
      type: "Enforcement"
    }
  };
  const extracted2 = extractObstacleAttributes(item2, DEFAULT_CONFIG);
  assert.equal(extracted2.title, "Coast Guard Patrol");
  assert.equal(extracted2.description, "Interception in international waters");
  assert.equal(extracted2.weight, 9.5);
  assert.equal(extracted2.category, "Enforcement");
});

test("bufferRouteGeometries calls geodesicBuffer on geometryEngine", () => {
  let calledWith = null;
  const mockEngine = {
    geodesicBuffer(geoms, dist, unit, union) {
      calledWith = { geoms, dist, unit, union };
      return [{ type: "polygon", rings: [] }];
    }
  };

  const dummyGeom = { type: "polyline", paths: [[[10, 20], [11, 21]]] };
  const res = bufferRouteGeometries(dummyGeom, 35, "kilometers", mockEngine);

  assert.equal(calledWith.dist, 35);
  assert.equal(calledWith.unit, "kilometers");
  assert.equal(calledWith.union, true);
  assert.equal(res.type, "polygon");
});

test("intersectBufferWithObstacles correctly filters and sorts by weight descending", () => {
  const mockEngine = {
    intersects(buffer, geom) {
      return geom.shouldIntersect === true;
    }
  };

  const dummyBuffer = { type: "polygon" };
  const features = [
    {
      attributes: { title: "Low Risk Obstacle", description: "Minor check", weight: 3 },
      geometry: { shouldIntersect: true }
    },
    {
      attributes: { title: "Far Obstacle", description: "Out of range", weight: 10 },
      geometry: { shouldIntersect: false }
    },
    {
      attributes: { title: "Severe Risk Obstacle", description: "Sea crossing", weight: 9 },
      geometry: { shouldIntersect: true }
    }
  ];

  const results = intersectBufferWithObstacles(dummyBuffer, features, mockEngine, DEFAULT_CONFIG);
  assert.equal(results.length, 2);
  // Checked sorting by weight descending
  assert.equal(results[0].title, "Severe Risk Obstacle");
  assert.equal(results[0].weight, 9);
  assert.equal(results[1].title, "Low Risk Obstacle");
  assert.equal(results[1].weight, 3);
});

test("evaluateJourneyRisk calculates appropriate risk level and styling", () => {
  assert.equal(evaluateJourneyRisk(0).level, "Minimal Risk");
  assert.equal(evaluateJourneyRisk(10).level, "Low Risk");
  assert.equal(evaluateJourneyRisk(25).level, "Moderate Risk");
  assert.equal(evaluateJourneyRisk(50).level, "High Risk");
  assert.equal(evaluateJourneyRisk(75).level, "Critical Peril");
});

test("summarizeRouteAnalysis generates consolidated summary with refugee perspective feedback", () => {
  const obstacles = [
    {
      title: "Central Mediterranean Crossing",
      description: "Severe drowning hazard",
      weight: 10,
      category: "Maritime Hazard"
    },
    {
      title: "Border Razor Wire Fence",
      description: "Violent pushbacks",
      weight: 8,
      category: "Border Enforcement"
    }
  ];

  const summary = summarizeRouteAnalysis(obstacles, DEFAULT_CONFIG, { routeCount: 1, totalLengthKm: 420.5 });

  assert.equal(summary.obstacleCount, 2);
  assert.equal(summary.totalWeight, 18);
  assert.equal(summary.averageWeight, 9);
  assert.equal(summary.maxWeight, 10);
  assert.equal(summary.perspectiveFeedback.risk.level, "Moderate Risk");
  assert.equal(summary.perspectiveFeedback.categories.length, 2);
  assert.equal(summary.perspectiveFeedback.narratives.length > 0, true);
  assert.equal(summary.perspectiveFeedback.reflectionQuestions.length, 4);
});

test("summarizeRouteAnalysis handles empty obstacles cleanly", () => {
  const summary = summarizeRouteAnalysis([], DEFAULT_CONFIG, { routeCount: 0 });
  assert.equal(summary.obstacleCount, 0);
  assert.equal(summary.totalWeight, 0);
  assert.equal(summary.averageWeight, 0);
  assert.equal(summary.maxWeight, 0);
  assert.equal(summary.perspectiveFeedback.risk.level, "Minimal Risk");
  assert.equal(summary.perspectiveFeedback.categories.length, 0);
});

test("extractObstacleAttributes handles missing or invalid values gracefully", () => {
  const raw = {
    attributes: {
      weight: "invalid-number",
      description: null
    }
  };
  const extracted = extractObstacleAttributes(raw, DEFAULT_CONFIG);
  assert.equal(extracted.weight, 1); // Defaults to 1
  assert.equal(extracted.title, "Obstacle"); // Default title
  assert.equal(extracted.description, "No detailed description available.");
});

test("bufferRouteGeometries throws error when no geometries provided", () => {
  assert.throws(() => {
    bufferRouteGeometries([], 30, "kilometers", {});
  }, /No route geometries provided/);
});

test("bufferRouteGeometries falls back to planar buffer if geodesicBuffer fails", () => {
  let planarCalled = false;
  const mockEngine = {
    geodesicBuffer() {
      throw new Error("Geodesic failed");
    },
    buffer(geoms, dist, unit, union) {
      planarCalled = true;
      return [{ type: "polygon" }];
    }
  };

  const dummyGeom = { type: "polyline" };
  const res = bufferRouteGeometries(dummyGeom, 25, "miles", mockEngine);
  assert.equal(planarCalled, true);
  assert.equal(res.type, "polygon");
});

