import React, { useState } from "react";

export default function AnalysisPanel({
  analysis,
  analyzing,
  config,
  onClose,
  onOpenGuide
}) {
  const [activeTab, setActiveTab] = useState("perspective");
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    if (!analysis) return;
    const text = JSON.stringify(analysis, null, 2);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const handleDownloadReport = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `migration-route-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <calcite-panel
      heading="Route Analysis & Feedback"
      description={
        analysis
          ? `Analyzed ${analysis.obstacleCount} obstacle${analysis.obstacleCount === 1 ? "" : "s"} (${config.bufferDistance} ${config.bufferUnit} corridor)`
          : "Perspective on Refugee Journeys"
      }
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div slot="header-actions-end">
        {analysis && (
          <>
            <calcite-action
              text={copied ? "Copied!" : "Copy Report"}
              icon={copied ? "check" : "copy-to-clipboard"}
              onClick={handleCopySummary}
              title="Copy analysis summary to clipboard"
            />
            <calcite-action
              text="Download JSON"
              icon="download"
              onClick={handleDownloadReport}
              title="Download analysis report as JSON"
            />
          </>
        )}
        {onClose && (
          <calcite-action
            text="Close Panel"
            icon="x"
            onClick={onClose}
            title="Collapse Analysis Panel"
          />
        )}
      </div>

      <div style={{ padding: "1rem", overflowY: "auto", flex: "1 1 auto" }}>
        {analyzing && (
          <calcite-scrim
            loading
            text="Analyzing corridor and intersecting unseen route obstacles..."
          />
        )}

        {!analysis && !analyzing && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <calcite-notice open icon="compass" kind="brand">
              <div slot="title">How to Analyze a Migration Route</div>
              <div slot="message">
                <ol style={{ paddingLeft: "1.2rem", margin: "0.5rem 0 0 0" }}>
                  <li style={{ marginBottom: "0.4rem" }}>
                    <strong>Sketch a Route:</strong> Click the <em>Draw Route Polyline</em> button on the map to trace a route from an origin (e.g., Syria, Afghanistan, Libya) toward a European destination.
                  </li>
                  <li style={{ marginBottom: "0.4rem" }}>
                    <strong>Run Analysis:</strong> Click the <em>Analyze Route</em> button in the header.
                  </li>
                  <li>
                    <strong>Take the Perspective of Refugees:</strong> Review the hidden perils, cumulative difficulty weights, and reflective questions to consider the extreme challenges of forced displacement.
                  </li>
                </ol>
              </div>
            </calcite-notice>

            <calcite-card style={{ marginTop: "0.5rem" }}>
              <div slot="title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <calcite-icon icon="lightbulb" scale="s" />
                <span>Pedagogical Purpose</span>
              </div>
              <p style={{ color: "var(--calcite-color-text-2)", fontSize: "0.9rem", lineHeight: "1.5" }}>
                Refugees fleeing persecution and war face information asymmetry: militarized border fences, pushbacks, maritime perils, and deportation camps are not clearly marked on ordinary maps. By simulating routes against unseen obstacles, students experience the daunting uncertainty faced by displaced persons.
              </p>
              <div slot="footer-end">
                <calcite-button appearance="transparent" scale="s" onClick={onOpenGuide}>
                  Read Educational Guide
                </calcite-button>
              </div>
            </calcite-card>
          </div>
        )}

        {analysis && !analyzing && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Risk Overview Banner */}
            {(() => {
              const risk = analysis.perspectiveFeedback?.risk;
              const kind =
                analysis.totalWeight > config.riskThresholds.high
                  ? "danger"
                  : analysis.totalWeight > config.riskThresholds.moderate
                  ? "warning"
                  : analysis.totalWeight > config.riskThresholds.low
                  ? "brand"
                  : "info";

              return (
                <calcite-notice open kind={kind} icon="exclamation-mark-triangle">
                  <div slot="title" style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                    {risk?.level || "Analysis Complete"} — Total Difficulty Weight: {analysis.totalWeight}
                  </div>
                  <div slot="message" style={{ marginTop: "0.4rem", lineHeight: "1.4" }}>
                    {risk?.description}
                  </div>
                </calcite-notice>
              );
            })()}

            {/* Quick Metrics Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.5rem",
                textAlign: "center"
              }}
            >
              <div
                style={{
                  backgroundColor: "var(--calcite-color-foreground-2, #f3f3f3)",
                  padding: "0.75rem",
                  borderRadius: "6px"
                }}
              >
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--calcite-color-brand, #007ac2)" }}>
                  {analysis.obstacleCount}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--calcite-color-text-2)" }}>
                  Obstacles
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--calcite-color-foreground-2, #f3f3f3)",
                  padding: "0.75rem",
                  borderRadius: "6px"
                }}
              >
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#e53e3e" }}>
                  {analysis.totalWeight}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--calcite-color-text-2)" }}>
                  Cumulative Weight
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--calcite-color-foreground-2, #f3f3f3)",
                  padding: "0.75rem",
                  borderRadius: "6px"
                }}
              >
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#dd6b20" }}>
                  {analysis.routeMetrics?.totalLengthKm
                    ? `${analysis.routeMetrics.totalLengthKm} km`
                    : `${config.bufferDistance} ${config.bufferUnit}`}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--calcite-color-text-2)" }}>
                  {analysis.routeMetrics?.totalLengthKm ? "Route Length" : "Corridor Width"}
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--calcite-color-border-2, #e0e0e0)", paddingBottom: "0.5rem" }}>
              <calcite-button
                appearance={activeTab === "perspective" ? "solid" : "outline"}
                kind={activeTab === "perspective" ? "brand" : "neutral"}
                scale="s"
                onClick={() => setActiveTab("perspective")}
              >
                Refugee Perspective
              </calcite-button>
              <calcite-button
                appearance={activeTab === "obstacles" ? "solid" : "outline"}
                kind={activeTab === "obstacles" ? "brand" : "neutral"}
                scale="s"
                onClick={() => setActiveTab("obstacles")}
              >
                Obstacles ({analysis.obstacleCount})
              </calcite-button>
              <calcite-button
                appearance={activeTab === "categories" ? "solid" : "outline"}
                kind={activeTab === "categories" ? "brand" : "neutral"}
                scale="s"
                onClick={() => setActiveTab("categories")}
              >
                Categories
              </calcite-button>
            </div>

            {/* Tab 1: Refugee Perspective & Reflection */}
            {activeTab === "perspective" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
                    The Realities of the Journey
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {analysis.perspectiveFeedback?.narratives?.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "var(--calcite-color-foreground-2, #f8f9fa)",
                          padding: "0.75rem",
                          borderRadius: "6px",
                          borderLeft: "4px solid #dd6b20",
                          fontSize: "0.85rem",
                          lineHeight: "1.45"
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
                    Reflection Questions for Students
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {analysis.perspectiveFeedback?.reflectionQuestions?.map((q, idx) => (
                      <calcite-card key={idx} style={{ width: "100%" }}>
                        <div slot="title" style={{ fontSize: "0.85rem", fontWeight: "normal", lineHeight: "1.4" }}>
                          <strong>Q{idx + 1}:</strong> {q}
                        </div>
                      </calcite-card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Obstacles List */}
            {activeTab === "obstacles" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {analysis.obstacles.length === 0 ? (
                  <p style={{ color: "var(--calcite-color-text-2)", fontStyle: "italic" }}>
                    No obstacles intersected within the {config.bufferDistance} {config.bufferUnit} corridor.
                  </p>
                ) : (
                  analysis.obstacles.map((obs, idx) => (
                    <calcite-card key={obs.id || idx} style={{ width: "100%" }}>
                      <div
                        slot="title"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.9rem",
                          fontWeight: "600"
                        }}
                      >
                        <span>{obs.title}</span>
                      </div>
                      <div slot="subtitle" style={{ display: "flex", gap: "0.3rem", marginTop: "0.2rem" }}>
                        <calcite-chip scale="s" kind="brand">
                          {obs.category}
                        </calcite-chip>
                        <calcite-chip scale="s" kind="danger">
                          Weight: {obs.weight}
                        </calcite-chip>
                      </div>
                      <p style={{ fontSize: "0.85rem", margin: "0.5rem 0 0.25rem 0", lineHeight: "1.4" }}>
                        {obs.description}
                      </p>
                      {obs.perspectiveNote && (
                        <div
                          style={{
                            marginTop: "0.4rem",
                            fontSize: "0.8rem",
                            fontStyle: "italic",
                            color: "var(--calcite-color-text-2)",
                            backgroundColor: "var(--calcite-color-foreground-2, #f5f5f5)",
                            padding: "0.4rem",
                            borderRadius: "4px"
                          }}
                        >
                          <strong>Perspective:</strong> {obs.perspectiveNote}
                        </div>
                      )}
                    </calcite-card>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Categories Summary */}
            {activeTab === "categories" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {analysis.perspectiveFeedback?.categories?.map((cat, idx) => (
                  <calcite-card key={idx} style={{ width: "100%" }}>
                    <div slot="title" style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                      {cat.name}
                    </div>
                    <div slot="subtitle">
                      {cat.count} obstacle{cat.count === 1 ? "" : "s"} &bull; Total Weight: {cat.totalWeight}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.5rem" }}>
                      {cat.obstacles.map((o, oIdx) => (
                        <div
                          key={oIdx}
                          style={{
                            fontSize: "0.8rem",
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "0.2rem 0",
                            borderBottom: "1px solid #f0f0f0"
                          }}
                        >
                          <span>{o.title}</span>
                          <span style={{ fontWeight: "bold", color: "#e53e3e" }}>+{o.weight}</span>
                        </div>
                      ))}
                    </div>
                  </calcite-card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </calcite-panel>
  );
}
