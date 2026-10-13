/**
 * Configuration module for Refugee Migration Routes Analyzer
 * All non-static values are configurable here and can be overridden via:
 * 1. URL query parameters (e.g., ?webmap=ID&buffer=50&unit=kilometers&layer=route-obstacles)
 * 2. User Settings dialog in the UI (stored in localStorage)
 */

export const DEFAULT_CONFIG = {
  // ArcGIS Online WebMap Item ID
  // Can be configured to any webmap containing the route-obstacles layer
  webmapId: "5688732d6f59462c842d450b5c9bb584",

  // Portal URL for ArcGIS Online or ArcGIS Enterprise
  portalUrl: "https://www.arcgis.com",

  // Optional ArcGIS API Key (if required by your organization)
  apiKey: "",

  // Layer title in the WebMap that contains the invisible route obstacles
  obstacleLayerTitle: "Routenschwierigkeiten",

  // Buffer distance around the user's sketched migration route
  bufferDistance: 30,

  // Buffer distance unit (supports: 'kilometers', 'miles', 'meters', 'nautical-miles')
  bufferUnit: "kilometers",

  // Attribute field names for obstacle data with fallback search
  weightField: "Weight",
  descriptionField: "Description",
  titleField: "Title",
  categoryField: "ObstacleType",

  // Initial map center [longitude, latitude] focusing on Mediterranean, Middle East, North Africa, Europe
  defaultCenter: [18.0, 34.0],

  // Initial map zoom level
  defaultZoom: 5,

  // UI and branding text
  appTitle: "Refugee Migration Routes Analyzer",
  appSubtitle: "Analyzing the unseen obstacles and perils faced on journeys into Europe",

  // Journey risk classification thresholds (sum of intersected obstacle weights)
  riskThresholds: {
    low: 15,
    moderate: 35,
    high: 60
    // Above high is categorized as 'Critical / Extreme'
  },

  // Color schemes for visualization
  colors: {
    route: "#ff8c00", // Warm orange for sketched migration route
    routeWidth: 3,
    bufferFill: "rgba(255, 140, 0, 0.18)", // Semi-transparent buffer zone
    bufferOutline: "rgba(255, 140, 0, 0.65)",
    obstacleHighlight: "#e53e3e", // Red highlight for triggered obstacles
    obstacleHighlightFill: "rgba(229, 62, 62, 0.4)"
  }
};

const STORAGE_KEY = "migration_routes_analyzer_config";

/**
 * Parses configuration overrides from URL query parameters.
 * Supported query params:
 * - webmap / webmapId
 * - buffer / bufferDist / bufferDistance
 * - unit / bufferUnit
 * - layer / obstacleLayer / obstacleLayerTitle
 * - weightField
 * - descField / descriptionField
 * - titleField
 * - categoryField
 * - portalUrl
 * - apiKey
 */
export function parseUrlParams(searchString = "") {
  const overrides = {};
  const query = searchString.startsWith("?") ? searchString.slice(1) : searchString;
  if (!query) return overrides;

  const params = new URLSearchParams(query);

  if (params.has("webmap") || params.has("webmapId")) {
    overrides.webmapId = params.get("webmap") || params.get("webmapId");
  }

  if (params.has("buffer") || params.has("bufferDist") || params.has("bufferDistance")) {
    const val = parseFloat(params.get("buffer") || params.get("bufferDist") || params.get("bufferDistance"));
    if (!isNaN(val) && val > 0) {
      overrides.bufferDistance = val;
    }
  }

  if (params.has("unit") || params.has("bufferUnit")) {
    const unit = (params.get("unit") || params.get("bufferUnit")).toLowerCase();
    const validUnits = ["kilometers", "miles", "meters", "nautical-miles"];
    if (validUnits.includes(unit)) {
      overrides.bufferUnit = unit;
    }
  }

  if (params.has("layer") || params.has("obstacleLayer") || params.has("obstacleLayerTitle")) {
    overrides.obstacleLayerTitle = params.get("layer") || params.get("obstacleLayer") || params.get("obstacleLayerTitle");
  }

  if (params.has("weightField")) overrides.weightField = params.get("weightField");
  if (params.has("descField") || params.has("descriptionField")) {
    overrides.descriptionField = params.get("descField") || params.get("descriptionField");
  }
  if (params.has("titleField")) overrides.titleField = params.get("titleField");
  if (params.has("categoryField")) overrides.categoryField = params.get("categoryField");
  if (params.has("portalUrl")) overrides.portalUrl = params.get("portalUrl");
  if (params.has("apiKey")) overrides.apiKey = params.get("apiKey");

  return overrides;
}

/**
 * Retrieves saved configuration from localStorage if available.
 */
export function getSavedConfig() {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.warn("Could not read config from localStorage:", e);
    return {};
  }
}

/**
 * Saves configuration to localStorage.
 */
export function saveConfig(newConfig) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    return true;
  } catch (e) {
    console.error("Could not save config to localStorage:", e);
    return false;
  }
}

/**
 * Clears saved configuration from localStorage.
 */
export function clearSavedConfig() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Could not clear saved config:", e);
  }
}

export const resetConfig = clearSavedConfig;

/**
 * Returns the effective consolidated configuration by merging:
 * 1. DEFAULT_CONFIG
 * 2. Saved localStorage settings
 * 3. URL query parameters (highest precedence)
 */
export function getConfig(searchString = "") {
  const urlOverrides = parseUrlParams(
    searchString || (typeof window !== "undefined" && window.location ? window.location.search : "")
  );
  const savedOverrides = getSavedConfig();

  return {
    ...DEFAULT_CONFIG,
    ...savedOverrides,
    ...urlOverrides,
    // Ensure nested objects remain safely merged
    riskThresholds: {
      ...DEFAULT_CONFIG.riskThresholds,
      ...(savedOverrides.riskThresholds || {}),
      ...(urlOverrides.riskThresholds || {})
    },
    colors: {
      ...DEFAULT_CONFIG.colors,
      ...(savedOverrides.colors || {}),
      ...(urlOverrides.colors || {})
    }
  };
}

// Global browser window attachment for compatibility with non-module scripts
if (typeof window !== "undefined") {
  window.AppConfig = {
    DEFAULT_CONFIG,
    parseUrlParams,
    getSavedConfig,
    saveConfig,
    clearSavedConfig,
    getConfig
  };
}
