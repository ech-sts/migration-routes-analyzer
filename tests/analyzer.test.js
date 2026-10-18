import test from "node:test";
import assert from "node:assert/strict";
import {
  findObstacleLayer,
  ensureObstacleLayerHidden,
  extractObstacleAttributes,
  bufferRouteGeometries,
  buildObstacleIntersectionQuery,
  intersectBufferWithObstacles,
  evaluateJourneyRisk,
  generateRefugeePerspectiveFeedback,
  summarizeRouteAnalysis
} from "../src/analyzer.js";
import { DEFAULT_CONFIG } from "../src/config.js";

test("findObstacleLayer finds layer by exact or case-insensitive title", () => {
  const layers = [
    { id: "", title: "" },
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

test("findObstacleLayer finds a child layer in a WebMap group", () => {
  const groupLayer = { id: "migration-routes", title: "MigrationRoutes" };
  const obstacleLayer = { id: "obstacles", title: "Routenschwierigkeiten" };
  const webMap = {
    layers: { toArray: () => [groupLayer] },
    allLayers: { toArray: () => [groupLayer, obstacleLayer] }
  };

  assert.equal(findObstacleLayer(webMap, "Routenschwierigkeiten"), obstacleLayer);
});

  test("findObstacleLayer prefers the WebMap feature layer over a same-title fallback", () => {
    const fallbackLayer = { id: "route-obstacles-fallback", title: "Routenschwierigkeiten", type: "geojson" };
    const featureLayer = { id: "webmap-obstacles", title: "Routenschwierigkeiten", type: "feature" };

    assert.equal(findObstacleLayer([fallbackLayer, featureLayer], "Routenschwierigkeiten"), featureLayer);
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

test("buildObstacleIntersectionQuery requests intersecting features in buffer spatial reference", () => {
  const bufferGeometry = { type: "polygon", spatialReference: { wkid: 3857 } };
  const layer = {
    createQuery() {
      return { where: "existing filter" };
    }
  };

  const query = buildObstacleIntersectionQuery(layer, bufferGeometry);

  assert.equal(query.where, "1=1");
  assert.equal(query.geometry, bufferGeometry);
  assert.equal(query.spatialRelationship, "intersects");
  assert.equal(query.returnGeometry, true);
  assert.deepEqual(query.outFields, ["*"]);
  assert.equal(query.outSpatialReference, bufferGeometry.spatialReference);
});

test("intersectBufferWithObstacles filters without ranking obstacles by weight", () => {
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
  assert.equal(results[0].title, "Low Risk Obstacle");
  assert.equal(results[0].weight, 3);
  assert.equal(results[1].title, "Severe Risk Obstacle");
  assert.equal(results[1].weight, 9);
});

test("evaluateJourneyRisk calculates appropriate risk level and styling", () => {
  assert.equal(evaluateJourneyRisk(0).levelKey, "risk.levels.minimal");
  assert.equal(evaluateJourneyRisk(10).levelKey, "risk.levels.low");
  assert.equal(evaluateJourneyRisk(25).levelKey, "risk.levels.moderate");
  assert.equal(evaluateJourneyRisk(50).levelKey, "risk.levels.high");
  assert.equal(evaluateJourneyRisk(75).levelKey, "risk.levels.critical");
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
  assert.equal("totalWeight" in summary, false);
  assert.equal("averageWeight" in summary, false);
  assert.equal("maxWeight" in summary, false);
  assert.equal("risk" in summary.perspectiveFeedback, false);
  assert.equal(summary.perspectiveFeedback.categories.some((category) => "totalWeight" in category), false);
  assert.equal(summary.perspectiveFeedback.categories.length, 2);
  assert.equal(summary.perspectiveFeedback.narrativeKeys.length > 0, true);
  assert.equal(summary.perspectiveFeedback.reflectionQuestionKeys.length, 4);
});

test("summarizeRouteAnalysis handles empty obstacles cleanly", () => {
  const summary = summarizeRouteAnalysis([], DEFAULT_CONFIG, { routeCount: 0 });
  assert.equal(summary.obstacleCount, 0);
  assert.equal("risk" in summary.perspectiveFeedback, false);
  assert.equal(summary.perspectiveFeedback.categories.length, 0);
});

test("route feedback does not depend on obstacle weights or risk thresholds", () => {
  const obstacles = [{ title: "Crossing", category: "Maritime", weight: 1 }];
  const feedback = generateRefugeePerspectiveFeedback(obstacles, 1);
  const changedFeedback = generateRefugeePerspectiveFeedback(
    [{ ...obstacles[0], weight: 1000 }],
    1000,
    { riskThresholds: { low: 0, moderate: 0, high: 0 } }
  );

  assert.deepEqual(changedFeedback.narrativeKeys, feedback.narrativeKeys);
  assert.deepEqual(changedFeedback.reflectionQuestionKeys, feedback.reflectionQuestionKeys);
  assert.equal("risk" in changedFeedback, false);
  assert.equal("totalWeight" in changedFeedback.categories[0], false);
});

test("extractObstacleAttributes uses the configured titleField before fallback titles", () => {
  const obstacle = extractObstacleAttributes(
    { attributes: { ObstacleTitle: "Grenzuebergang", title: "Fallback", Description: "Beschreibung" } },
    { ...DEFAULT_CONFIG, titleField: "ObstacleTitle" }
  );

  assert.equal(obstacle.title, "Grenzuebergang");
  assert.equal(obstacle.description, "Beschreibung");
});

test("summarizeRouteAnalysis preserves a zero route length", () => {
  const summary = summarizeRouteAnalysis([], DEFAULT_CONFIG, { totalLengthKm: 0 });
  assert.equal(summary.routeMetrics.totalLengthKm, 0);
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

