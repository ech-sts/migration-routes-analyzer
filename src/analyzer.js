/**
 * Analyzer module for Refugee Migration Routes
 * Handles buffering of sketched route polylines, spatial intersection
 * with invisible obstacle layer
 * and educational perspective feedback generation.
 */

import { DEFAULT_CONFIG } from "./config.js";

/**
 * Searches for the route obstacles layer in a WebMap or layer list.
 * Looks for exact or case-insensitive match on layer title or id.
 */
export function findObstacleLayer(layers, targetTitle = "route-obstacles") {
  if (!layers) return null;

  // Prefer the flattened collection so layers inside WebMap groups are discoverable.
  const layerCollection = layers.allLayers || layers.layers || layers;
  const layerList = Array.isArray(layerCollection)
    ? layerCollection
    : typeof layerCollection.toArray === "function"
    ? layerCollection.toArray()
    : [];

  const targetLower = (targetTitle || "route-obstacles").trim().toLowerCase();

  // 1. Direct match on title or id
  const findBestMatch = (predicate) => {
    const matches = layerList.filter(predicate);
    return matches.find((layer) => layer.type === "feature") || matches[0] || null;
  };

  let matched = findBestMatch((layer) =>
    [layer.title, layer.id]
      .filter(Boolean)
      .some((identifier) => identifier.trim().toLowerCase() === targetLower)
  );

  // 2. Partial match if no exact match (e.g. "Route Obstacles (2026)")
  if (!matched) {
    matched = findBestMatch((layer) =>
      [layer.title, layer.id]
        .filter(Boolean)
        .some((identifier) => {
          const normalizedIdentifier = identifier.trim().toLowerCase();
          return normalizedIdentifier.includes(targetLower) || targetLower.includes(normalizedIdentifier);
        })
    );
  }

  return matched || null;
}

/**
 * Ensures the obstacle layer is hidden on the map.
 * As specified in requirements: "and this layer is not visible in the map."
 */
export function ensureObstacleLayerHidden(layer) {
  if (!layer) return;
  layer.visible = false;
  if ("listMode" in layer) {
    layer.listMode = "hide"; // Keep hidden from legend/layer-list widgets if present
  }
}

/**
 * Extracts normalized obstacle attributes (title, description, weight, category)
 * with robust fallback field detection if field names vary.
 */
export function extractObstacleAttributes(featureOrAttributes, config = DEFAULT_CONFIG) {
  const attrs = featureOrAttributes?.attributes || featureOrAttributes || {};

  // Title extraction with fallbacks
  const titleField = config?.titleField || "title";
  const title =
    attrs[titleField] ||
    attrs.title ||
    attrs.Title ||
    attrs.TITLE ||
    attrs.name ||
    attrs.Name ||
    attrs.obstacle_name ||
    attrs.label ||
    "Obstacle";

  // Description extraction with fallbacks
  const descField = config?.descriptionField || "description";
  const description =
    attrs[descField] ||
    attrs.description ||
    attrs.Description ||
    attrs.DESCRIPTION ||
    attrs.desc ||
    attrs.details ||
    attrs.info ||
    attrs.notes ||
    "No detailed description available.";

  // Weight / Difficulty extraction with fallbacks
  const weightField = config?.weightField || "weight";
  let rawWeight =
    attrs[weightField] ??
    attrs.weight ??
    attrs.Weight ??
    attrs.WEIGHT ??
    attrs.severity ??
    attrs.Severity ??
    attrs.difficulty ??
    attrs.difficulty_weight ??
    attrs.score ??
    attrs.points ??
    1;

  let weight = parseFloat(rawWeight);
  if (isNaN(weight) || weight <= 0) {
    weight = 1;
  }

  // Category extraction with fallbacks
  const categoryField = config?.categoryField || "category";
  const category =
    attrs[categoryField] ||
    attrs.category ||
    attrs.Category ||
    attrs.type ||
    attrs.Type ||
    attrs.hazard_type ||
    "Transit Difficulty";

  const perspectiveNote =
    attrs.perspectiveNote ||
    attrs.perspective ||
    attrs.reflection ||
    "";

  return {
    id: attrs.id || attrs.OBJECTID || attrs.objectid || Math.random().toString(36).substring(2, 9),
    title: String(title),
    description: String(description),
    weight: Math.round(weight * 10) / 10,
    category: String(category),
    perspectiveNote: String(perspectiveNote)
  };
}

/**
 * Buffers polyline geometries using ArcGIS geometryEngine.
 * Uses geodesicBuffer for accurate real-world corridor calculation across continents,
 * falling back to planar buffer if geodesic fails.
 */
export function bufferRouteGeometries(geometries, distance, unit = "kilometers", geometryEngine) {
  if (!geometries || (Array.isArray(geometries) && geometries.length === 0)) {
    throw new Error("No route geometries provided for buffering.");
  }

  const geomArray = Array.isArray(geometries) ? geometries : [geometries];

  if (!geometryEngine) {
    throw new Error("geometryEngine is required to perform spatial buffering.");
  }

  try {
    // Geodesic buffer is preferred for global/continental scale migration routes
    if (typeof geometryEngine.geodesicBuffer === "function") {
      const buffered = geometryEngine.geodesicBuffer(geomArray, distance, unit, true);
      return Array.isArray(buffered) ? buffered[0] : buffered;
    }
  } catch (err) {
    console.warn("geodesicBuffer encountered an issue, attempting standard planar buffer:", err);
  }

  // Fallback to planar buffer
  const buffered = geometryEngine.buffer(geomArray, distance, unit, true);
  return Array.isArray(buffered) ? buffered[0] : buffered;
}

/**
 * Builds a spatial query for obstacle features intersecting the route buffer.
 */
export function buildObstacleIntersectionQuery(layer, bufferGeometry) {
  const query = typeof layer?.createQuery === "function" ? layer.createQuery() : {};
  query.where = "1=1";
  query.geometry = bufferGeometry;
  query.spatialRelationship = "intersects";
  query.returnGeometry = true;
  query.outFields = ["*"];
  query.outSpatialReference = bufferGeometry.spatialReference;
  return query;
}

/**
 * Spatial intersection between route buffer polygon and obstacle features.
 * Works with ArcGIS geometryEngine.
 */
export function intersectBufferWithObstacles(
  bufferGeometry,
  obstacleFeatures,
  geometryEngine,
  config = DEFAULT_CONFIG,
  { prefiltered = false } = {}
) {
  if (!bufferGeometry) {
    throw new Error("Buffer geometry is required for intersection.");
  }
  if (!obstacleFeatures || !Array.isArray(obstacleFeatures)) {
    return [];
  }

  const results = [];

  for (const feature of obstacleFeatures) {
    const geom = feature.geometry || feature;
    if (!geom) continue;

    let isIntersecting = false;

    if (prefiltered) {
      isIntersecting = true;
    } else if (geometryEngine && typeof geometryEngine.intersects === "function") {
      try {
        isIntersecting = geometryEngine.intersects(bufferGeometry, geom);
      } catch (err) {
        console.warn("Error testing geometry intersection:", err);
        isIntersecting = false;
      }
    } else if (feature._mockIntersects !== undefined) {
      // Mock test flag for headless unit tests
      isIntersecting = Boolean(feature._mockIntersects);
    }

    if (isIntersecting) {
      const normalizedAttrs = extractObstacleAttributes(feature, config);
      results.push({
        ...normalizedAttrs,
        feature,
        geometry: geom
      });
    }
  }

  return results;
}

/**
 * Calculates overall journey risk classification based on cumulative weight.
 */
export function evaluateJourneyRisk(totalWeight, thresholds = DEFAULT_CONFIG.riskThresholds) {
  const lowThresh = thresholds?.low ?? 15;
  const modThresh = thresholds?.moderate ?? 35;
  const highThresh = thresholds?.high ?? 60;

  if (totalWeight <= 0) {
    return {
      level: "Minimal Risk",
      levelKey: "risk.levels.minimal",
      levelClass: "risk-minimal",
      color: "#38a169",
      descriptionKey: "risk.descriptions.minimal",
      description: "No significant documented obstacles were encountered within the route corridor. Note that unexpected checkpoints or shifting border controls may still occur."
    };
  } else if (totalWeight <= lowThresh) {
    return {
      level: "Low Risk",
      levelKey: "risk.levels.low",
      levelClass: "risk-low",
      color: "#2b6cb0",
      descriptionKey: "risk.descriptions.low",
      description: "Relatively low concentration of major documented obstacles, though refugees still face physical exhaustion, precarious legal status, and unexpected border changes."
    };
  } else if (totalWeight <= modThresh) {
    return {
      level: "Moderate Risk",
      levelKey: "risk.levels.moderate",
      levelClass: "risk-moderate",
      color: "#dd6b20",
      descriptionKey: "risk.descriptions.moderate",
      description: "Significant barriers encountered. Journeys along this corridor present hazardous terrain, active border interdictions, or risky transit conditions requiring dangerous detours."
    };
  } else if (totalWeight <= highThresh) {
    return {
      level: "High Risk",
      levelKey: "risk.levels.high",
      levelClass: "risk-high",
      color: "#e53e3e",
      descriptionKey: "risk.descriptions.high",
      description: "Severe perils present. Multiple life-threatening hazards (open sea, militarized borders, or desert corridors) with documented humanitarian crises and human rights violations."
    };
  } else {
    return {
      level: "Critical Peril",
      levelKey: "risk.levels.critical",
      levelClass: "risk-critical",
      color: "#805ad5",
      descriptionKey: "risk.descriptions.critical",
      description: "Extreme, multi-tiered danger. This corridor traverses several of the deadliest checkpoints and crossing points on migration journeys into Europe, with very high risks of fatality, violence, or prolonged detention."
    };
  }
}

/**
 * Generates educational perspective reflection prompts based on the specific obstacles encountered.
 * Encourages students to take the perspective of refugees and reflect on the reality of forced displacement.
 */
export function generateRefugeePerspectiveFeedback(intersectedObstacles, totalWeight, config = DEFAULT_CONFIG) {
  // Group obstacles by category
  const categories = {};
  for (const obs of intersectedObstacles) {
    const cat = obs.category || "Transit Difficulty";
    if (!categories[cat]) {
      categories[cat] = {
        name: cat,
        count: 0,
        obstacles: []
      };
    }
    categories[cat].count += 1;
    categories[cat].obstacles.push(obs);
  }

  // Identify specific hazard types for tailored reflection narratives
  const hasMaritime = Object.keys(categories).some((k) =>
    k.toLowerCase().includes("maritime") || k.toLowerCase().includes("sea") || k.toLowerCase().includes("water")
  );
  const hasBorder = Object.keys(categories).some((k) =>
    k.toLowerCase().includes("border") || k.toLowerCase().includes("fence") || k.toLowerCase().includes("enforce")
  );
  const hasDetention = Object.keys(categories).some((k) =>
    k.toLowerCase().includes("detention") || k.toLowerCase().includes("camp") || k.toLowerCase().includes("smuggler")
  );
  const hasTerrain = Object.keys(categories).some((k) =>
    k.toLowerCase().includes("terrain") || k.toLowerCase().includes("mountain") || k.toLowerCase().includes("desert")
  );

  const narratives = [];
  const narrativeKeys = [];

  if (hasMaritime) {
    narrativeKeys.push("narratives.maritime");
    narratives.push("Maritime Crossing Reality: Sea crossings involve unseaworthy vessels, no life vests, hypothermia, and fear of capsizing in darkness. Refugees often pay their life savings for a spot on a dinghy without knowing if rescue ships are allowed to dock.");
  }
  if (hasBorder) {
    narrativeKeys.push("narratives.border");
    narratives.push("Border Wall & Pushback Reality: Militarized border fences with razor wire, thermal cameras, and armed patrols mean refugees must repeatedly attempt crossings ('The Game'), facing violent pushbacks, confiscated phones, and physical injuries.");
  }
  if (hasTerrain) {
    narrativeKeys.push("narratives.terrain");
    narratives.push("Harsh Environmental Reality: Crossing freezing mountain passes or blistering deserts on foot without adequate shoes, water, or shelter leads to frostbite, trench foot, severe dehydration, and exhaustion.");
  }
  if (hasDetention) {
    narrativeKeys.push("narratives.detention");
    narratives.push("Human Rights & Vulnerability Reality: Without safe, legal escape routes, refugees are vulnerable to human trafficking, arbitrary detention in squalid camps, and extortion by organized criminal networks.");
  }

  if (narrativeKeys.length === 0) {
    narrativeKeys.push("narratives.general");
    narratives.push("Every journey across borders without legal documentation carries psychological stress, fear of apprehension, separation from family members, and reliance on unpredictable conditions.");
  }

  const reflectionQuestions = [
    "Why might a family fleeing conflict feel they have no choice but to take this dangerous route?",
    "How does the lack of safe and legal asylum pathways affect the decisions refugees must make?",
    "If one border or maritime corridor is heavily blocked, where do you think refugee flows divert?",
    "What psychological and physical toll would encountering these obstacles take on a person or child?"
  ];
  const reflectionQuestionKeys = [
    "reflectionQuestions.1",
    "reflectionQuestions.2",
    "reflectionQuestions.3",
    "reflectionQuestions.4"
  ];

  return {
    categories: Object.values(categories),
    narratives,
    narrativeKeys,
    reflectionQuestions,
    reflectionQuestionKeys
  };
}

/**
 * Creates the complete consolidated analysis report.
 */
export function summarizeRouteAnalysis(intersectedObstacles, config = DEFAULT_CONFIG, routeMetrics = {}) {
  const obstacles = Array.isArray(intersectedObstacles) ? intersectedObstacles : [];
  const obstacleCount = obstacles.length;

  const perspectiveFeedback = generateRefugeePerspectiveFeedback(obstacles, undefined, config);

  return {
    timestamp: new Date().toISOString(),
    routeMetrics: {
      routeCount: routeMetrics.routeCount || 1,
      totalLengthKm: routeMetrics.totalLengthKm != null ? Math.round(routeMetrics.totalLengthKm * 10) / 10 : null
    },
    buffer: {
      distance: config.bufferDistance,
      unit: config.bufferUnit
    },
    obstacleCount,
    obstacles,
    perspectiveFeedback
  };
}

// Global browser window attachment
if (typeof window !== "undefined") {
  window.RouteAnalyzer = {
    findObstacleLayer,
    ensureObstacleLayerHidden,
    extractObstacleAttributes,
    bufferRouteGeometries,
    intersectBufferWithObstacles,
    evaluateJourneyRisk,
    generateRefugeePerspectiveFeedback,
    summarizeRouteAnalysis
  };
}
