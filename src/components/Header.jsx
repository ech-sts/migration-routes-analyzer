import React from "react";

export default function Header({
  appTitle,
  appSubtitle,
  routeCount,
  analyzing,
  onAnalyze,
  onClear,
  onOpenSettings,
  onOpenGuide,
  panelOpen,
  onTogglePanel
}) {
  return (
    <calcite-navigation slot="header">
      <calcite-navigation-logo
        slot="logo"
        heading={appTitle || "Refugee Migration Routes Analyzer"}
        description={appSubtitle || "Analyzing perils on migration routes into Europe"}
        icon="compass"
      />

      <div
        slot="content-end"
        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <calcite-button
          appearance="solid"
          kind="brand"
          icon-start="analysis"
          loading={analyzing ? true : undefined}
          disabled={routeCount === 0 || analyzing ? true : undefined}
          onClick={onAnalyze}
          title={
            routeCount === 0
              ? "Sketch a migration route on the map first"
              : "Analyze route buffer against obstacles"
          }
        >
          {analyzing ? "Analyzing..." : "Analyze Route"}
        </calcite-button>

        <calcite-button
          appearance="outline"
          kind="neutral"
          icon-start="trash"
          disabled={routeCount === 0 || analyzing ? true : undefined}
          onClick={onClear}
          title="Clear all sketched routes and analysis"
        >
          Clear
        </calcite-button>

        <calcite-action
          text="Settings"
          icon="gear"
          text-enabled={false}
          onClick={onOpenSettings}
          title="Configure WebMap ID, Buffer, and Fields"
        />

        <calcite-action
          text="Educational Guide"
          icon="information"
          text-enabled={false}
          onClick={onOpenGuide}
          title="About this Educational Simulation"
        />

        <calcite-action
          text={panelOpen ? "Collapse Analysis Panel" : "Expand Analysis Panel"}
          icon={panelOpen ? "chevrons-right" : "chevrons-left"}
          text-enabled={false}
          onClick={onTogglePanel}
          title="Toggle Analysis Panel"
        />
      </div>
    </calcite-navigation>
  );
}
