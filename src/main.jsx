import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Stylesheets: Calcite UI, ArcGIS Map Components, and ArcGIS Core
import "@esri/calcite-components/main.css";
import "@arcgis/map-components/main.css";
import "@arcgis/core/assets/esri/themes/light/main.css";
import "../css/style.css";

// Calcite UI custom elements registration
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-navigation";
import "@esri/calcite-components/components/calcite-navigation-logo";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-action-bar";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-notice";
import "@esri/calcite-components/components/calcite-card";
import "@esri/calcite-components/components/calcite-chip";
import "@esri/calcite-components/components/calcite-meter";
import "@esri/calcite-components/components/calcite-dialog";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-input-text";
import "@esri/calcite-components/components/calcite-input-number";
import "@esri/calcite-components/components/calcite-select";
import "@esri/calcite-components/components/calcite-option";
import "@esri/calcite-components/components/calcite-switch";
import "@esri/calcite-components/components/calcite-scrim";
import "@esri/calcite-components/components/calcite-icon";
import "@esri/calcite-components/components/calcite-tooltip";

// ArcGIS Map Components custom elements registration
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-scale-bar";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
