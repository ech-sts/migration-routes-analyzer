/**
 * Analyzer module for Refugee Migration Routes
 * Handles buffering of sketched route polylines, spatial intersection
 * with invisible obstacle layer, difficulty weight aggregation,
 * and educational perspective feedback generation.
 */

import { DEFAULT_CONFIG } from "./config.js";

/**
 * Searches for the route obstacles layer in a WebMap or layer list.
 * Looks for exact or case-insensitive match on layer title or id.
 */
export function findObstacleLayer(layers, targetTitle = "route-obstacles") {
  if (!layers) return null;

  // Handle ArcGIS Collection, Array, or Map object
  const layerList = Array.isArray(layers)
    ? layers
    : layers.toArray
    ? layers.toArray()
    : layers.allLayers?.toArray
    ? layers.allLayers.toArray()
    : layers.layers?.toArray
    ? layers.layers.toArray()
    : [];

  const targetLower = (targetTitle || "route-obstacles").trim().toLowerCase();

  // 1. Direct match on title or id
  let matched = layerList.find((l) => {
    const title = (l.title || l.id || "").trim().toLowerCase();
    return title === targetLower;
  });

  // 2. Partial match if no exact match (e.g. "Route Obstacles (2026)")
  if (!matched) {
    matched = layerList.find((l) => {
      const title = (l.title || l.id || "").trim().toLowerCase();
      return title.includes(targetLower) || targetLower.includes(title);
    });
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
 * Spatial intersection between route buffer polygon and obstacle features.
 * Works with ArcGIS geometryEngine.
 */
export function intersectBufferWithObstacles(bufferGeometry, obstacleFeatures, geometryEngine, config = DEFAULT_CONFIG) {
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

    if (geometryEngine && typeof geometryEngine.intersects === "function") {
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

  // Sort by weight descending so most severe obstacles are highlighted first
  results.sort((a, b) => b.weight - a.weight);

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
      levelClass: "risk-minimal",
      color: "#38a169",
      description: "No significant documented obstacles were encountered within the route corridor. Note that unexpected checkpoints or shifting border controls may still occur."
    };
  } else if (totalWeight <= lowThresh) {
    return {
      level: "Low Risk",
      levelClass: "risk-low",
      color: "#2b6cb0",
      description: "Relatively low concentration of major documented obstacles, though refugees still face physical exhaustion, precarious legal status, and unexpected border changes."
    };
  } else if (totalWeight <= modThresh) {
    return {
      level: "Moderate Risk",
      levelClass: "risk-moderate",
      color: "#dd6b20",
      description: "Significant barriers encountered. Journeys along this corridor present hazardous terrain, active border interdictions, or risky transit conditions requiring dangerous detours."
    };
  } else if (totalWeight <= highThresh) {
    return {
      level: "High Risk",
      levelClass: "risk-high",
      color: "#e53e3e",
      description: "Severe perils present. Multiple life-threatening hazards (open sea, militarized borders, or desert corridors) with documented humanitarian crises and human rights violations."
    };
  } else {
    return {
      level: "Critical Peril",
      levelClass: "risk-critical",
      color: "#805ad5",
      description: "Extreme, multi-tiered danger. This corridor traverses several of the deadliest checkpoints and crossing points on migration journeys into Europe, with very high risks of fatality, violence, or prolonged detention."
    };
  }
}

/**
 * Generates educational perspective reflection prompts based on the specific obstacles encountered.
 * Encourages students to take the perspective of refugees and reflect on the reality of forced displacement.
 */
export function generateRefugeePerspectiveFeedback(intersectedObstacles, totalWeight, config = DEFAULT_CONFIG) {
  const risk = evaluateJourneyRisk(totalWeight, config?.riskThresholds);

  // Group obstacles by category
  const categories = {};
  for (const obs of intersectedObstacles) {
    const cat = obs.category || "Transit Difficulty";
    if (!categories[cat]) {
      categories[cat] = {
        name: cat,
        count: 0,
        totalWeight: 0,
        obstacles: []
      };
    }
    categories[cat].count += 1;
    categories[cat].totalWeight += obs.weight;
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

  if (hasMaritime) {
    narratives.push(
      "Maritime Crossing Reality: Sea crossings involve unseaworthy vessels, no life vests, hypothermia, and fear of capsizing in darkness. Refugees often pay their life savings for a spot on a dinghy without knowing if rescue ships are allowed to dock."
    );
  }
  if (hasBorder) {
    narratives.push(
      "Border Wall & Pushback Reality: Militarized border fences with razor wire, thermal cameras, and armed patrols mean refugees must repeatedly attempt crossings ('The Game'), facing violent pushbacks, confiscated phones, and physical injuries."
    );
  }
  if (hasTerrain) {
    narratives.push(
      "Harsh Environmental Reality: Crossing freezing mountain passes or blistering deserts on foot without adequate shoes, water, or shelter leads to frostbite, trench foot, severe dehydration, and exhaustion."
    );
  }
  if (hasDetention) {
    narratives.push(
      "Human Rights & Vulnerability Reality: Without safe, legal escape routes, refugees are vulnerable to human trafficking, arbitrary detention in squalid camps, and extortion by organized criminal networks."
    );
  }

  if (narratives.length === 0) {
    narratives.push(
      "Every journey across borders without legal documentation carries psychological stress, fear of apprehension, separation from family members, and reliance on unpredictable conditions."
    );
  }

  // Reflection questions for students
  const reflectionQuestions = [
    "Why might a family fleeing conflict feel they have no choice but to take this dangerous route?",
    "How does the lack of safe and legal asylum pathways affect the decisions refugees must make?",
    "If one border or maritime corridor is heavily blocked, where do you think refugee flows divert?",
    "What psychological and physical toll would encountering these obstacles take on a person or child?"
  ];

  return {
    risk,
    categories: Object.values(categories),
    narratives,
    reflectionQuestions
  };
}

/**
 * Creates the complete consolidated analysis report.
 */
export function summarizeRouteAnalysis(intersectedObstacles, config = DEFAULT_CONFIG, routeMetrics = {}) {
  const obstacles = Array.isArray(intersectedObstacles) ? intersectedObstacles : [];
  const obstacleCount = obstacles.length;
  const totalWeight = obstacles.reduce((sum, obs) => sum + (obs.weight || 0), 0);
  const roundedTotalWeight = Math.round(totalWeight * 10) / 10;
  const averageWeight = obstacleCount > 0 ? Math.round((totalWeight / obstacleCount) * 10) / 10 : 0;
  const maxWeight = obstacles.reduce((max, obs) => Math.max(max, obs.weight || 0), 0);

  const perspectiveFeedback = generateRefugeePerspectiveFeedback(obstacles, roundedTotalWeight, config);

  return {
    timestamp: new Date().toISOString(),
    routeMetrics: {
      routeCount: routeMetrics.routeCount || 1,
      totalLengthKm: routeMetrics.totalLengthKm ? Math.round(routeMetrics.totalLengthKm * 10) / 10 : null
    },
    buffer: {
      distance: config.bufferDistance,
      unit: config.bufferUnit
    },
    obstacleCount,
    totalWeight: roundedTotalWeight,
    averageWeight,
    maxWeight,
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
