import React, { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

export default function AnalysisPanel({
  analysis,
  analyzing,
  config,
  onClose,
  onOpenGuide
}) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("perspective");
  const [copied, setCopied] = useState(false);
  const languageSelectRef = useRef(null);

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage?.startsWith("de") ? "de" : "en";
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    const languageSelect = languageSelectRef.current;
    if (!languageSelect) return;

    const handleLanguageChange = (event) => {
      i18n.changeLanguage(event.target.value);
    };

    languageSelect.addEventListener("calciteSelectChange", handleLanguageChange);
    return () => languageSelect.removeEventListener("calciteSelectChange", handleLanguageChange);
  }, [i18n]);

  const getLocalizedReport = () => {
    if (!analysis) return null;
    const feedback = analysis.perspectiveFeedback;

    return {
      ...analysis,
      perspectiveFeedback: feedback
        ? {
            ...feedback,
            narratives: feedback.narrativeKeys?.map((key) => t(key)) || feedback.narratives,
            reflectionQuestions:
              feedback.reflectionQuestionKeys?.map((key) => t(key)) || feedback.reflectionQuestions
          }
        : feedback
    };
  };

  const feedback = analysis?.perspectiveFeedback;
  const narratives = (feedback?.narrativeKeys || feedback?.narratives || []).map((item) =>
    feedback?.narrativeKeys ? t(item) : item
  );
  const reflectionQuestions = (
    feedback?.reflectionQuestionKeys || feedback?.reflectionQuestions || []
  ).map((item) => (feedback?.reflectionQuestionKeys ? t(item) : item));

  const handleCopySummary = () => {
    if (!analysis) return;
    const text = JSON.stringify(getLocalizedReport(), null, 2);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const handleDownloadReport = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(getLocalizedReport(), null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("analysis.reportFilename", { timestamp: Date.now() });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <calcite-panel
      heading={t("analysis.title")}
      description={
        analysis
          ? t("analysis.description", {
              count: analysis.obstacleCount,
              distance: config.bufferDistance,
              unit: t(`units.${config.bufferUnit}`)
            })
          : t("analysis.subtitle")
      }
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div slot="header-actions-end">
        <calcite-select
          ref={languageSelectRef}
          scale="s"
          value={i18n.resolvedLanguage?.startsWith("de") ? "de" : "en"}
          aria-label={t("analysis.language")}
          title={t("analysis.language")}
        >
          <calcite-option value="en">English</calcite-option>
          <calcite-option value="de">Deutsch</calcite-option>
        </calcite-select>
        {analysis && (
          <>
            <calcite-action
              text={copied ? t("analysis.copied") : t("analysis.copyReport")}
              icon={copied ? "check" : "copy-to-clipboard"}
              onClick={handleCopySummary}
              title={t("analysis.copyTooltip")}
            />
            <calcite-action
              text={t("analysis.downloadJson")}
              icon="download"
              onClick={handleDownloadReport}
              title={t("analysis.downloadTooltip")}
            />
          </>
        )}
        {onClose && (
          <calcite-action
            text={t("analysis.closePanel")}
            icon="x"
            onClick={onClose}
            title={t("analysis.collapsePanel")}
          />
        )}
      </div>

      <div style={{ padding: "1rem", overflowY: "auto", flex: "1 1 auto" }}>
        {analyzing && (
          <calcite-scrim
            loading
            text={t("analysis.loading")}
          />
        )}

        {!analysis && !analyzing && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <calcite-notice open icon="compass" kind="brand">
              <div slot="title">{t("guide.title")}</div>
              <div slot="message">
                <ol style={{ paddingLeft: "1.2rem", margin: "0.5rem 0 0 0" }}>
                  <li style={{ marginBottom: "0.4rem" }}>
                    <Trans i18nKey="guide.sketch" components={{ strong: <strong />, em: <em /> }} />
                  </li>
                  <li style={{ marginBottom: "0.4rem" }}>
                    <Trans i18nKey="guide.analyze" components={{ strong: <strong />, em: <em /> }} />
                  </li>
                  <li>
                    <Trans i18nKey="guide.perspective" components={{ strong: <strong /> }} />
                  </li>
                </ol>
              </div>
            </calcite-notice>

            <calcite-card style={{ marginTop: "0.5rem" }}>
              <div slot="heading" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <calcite-icon icon="lightbulb" scale="s" />
                <span>{t("guide.purposeTitle")}</span>
              </div>
              <p style={{ color: "var(--calcite-color-text-2)", fontSize: "0.9rem", lineHeight: "1.5" }}>
                {t("guide.purpose")}
              </p>
              <div slot="footer-end">
                <calcite-button appearance="transparent" scale="s" onClick={onOpenGuide}>
                  {t("guide.readGuide")}
                </calcite-button>
              </div>
            </calcite-card>
          </div>
        )}

        {analysis && !analyzing && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/*
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
                    {t("analysis.riskSummary", {
                      level: risk?.levelKey ? t(risk.levelKey) : risk?.level || t("analysis.complete"),
                      weight: analysis.totalWeight
                    })}
                  </div>
                  <div slot="message" style={{ marginTop: "0.4rem", lineHeight: "1.4" }}>
                    {risk?.descriptionKey ? t(risk.descriptionKey) : risk?.description}
                  </div>
                </calcite-notice>
              );
            })()}
            */}

            {/* Quick Metrics Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--calcite-color-text-1)" }}>
                  {analysis.obstacleCount}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--calcite-color-text-2)" }}>
                  {t("analysis.obstacles")}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--calcite-color-foreground-2, #f3f3f3)",
                  padding: "0.75rem",
                  borderRadius: "6px"
                }}
              >
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--calcite-color-text-1)" }}>
                  {analysis.routeMetrics?.totalLengthKm != null
                    ? `${analysis.routeMetrics.totalLengthKm} km`
                    : "-"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--calcite-color-text-2)" }}>
                  {t("analysis.routeLength")}
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", borderBottom: "1px solid var(--calcite-color-border-2, #e0e0e0)", paddingBottom: "0.5rem" }}>
              <calcite-button
                appearance={activeTab === "perspective" ? "solid" : "outline"}
                kind={activeTab === "perspective" ? "brand" : "neutral"}
                scale="s"
                onClick={() => setActiveTab("perspective")}
              >
                {t("analysis.perspectiveTab")}
              </calcite-button>
              <calcite-button
                appearance={activeTab === "obstacles" ? "solid" : "outline"}
                kind={activeTab === "obstacles" ? "brand" : "neutral"}
                scale="s"
                onClick={() => setActiveTab("obstacles")}
              >
                {t("analysis.obstacles")} ({analysis.obstacleCount})
              </calcite-button>
              <calcite-button
                appearance={activeTab === "categories" ? "solid" : "outline"}
                kind={activeTab === "categories" ? "brand" : "neutral"}
                scale="s"
                onClick={() => setActiveTab("categories")}
              >
                {t("analysis.categoriesTab")}
              </calcite-button>
            </div>

            {/* Tab 1: Refugee Perspective & Reflection */}
            {activeTab === "perspective" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
                    {t("analysis.realitiesHeading")}
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {narratives.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "var(--calcite-color-foreground-2, #f8f9fa)",
                          padding: "0.75rem",
                          borderRadius: "6px",
                          borderLeft: "4px solid var(--calcite-color-border-2)",
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
                    {t("analysis.reflectionHeading")}
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {reflectionQuestions.map((q, idx) => (
                      <calcite-card key={idx} style={{ width: "100%" }}>
                        <div slot="heading" style={{ fontSize: "0.85rem", fontWeight: "normal", lineHeight: "1.4" }}>
                          <strong>{t("analysis.questionNumber", { number: idx + 1 })}</strong> {q}
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
                    {t("analysis.noObstacles", {
                      distance: config.bufferDistance,
                      unit: t(`units.${config.bufferUnit}`)
                    })}
                  </p>
                ) : (
                  analysis.obstacles.map((obs, idx) => (
                    <calcite-card key={obs.id || idx} style={{ width: "100%" }}>
                      <div
                        slot="heading"
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
                      <div slot="description" style={{ display: "flex", gap: "0.3rem", marginTop: "0.2rem" }}>
                        <calcite-chip scale="s" kind="brand">
                          {obs.category}
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
                          <strong>{t("analysis.perspective")}</strong> {obs.perspectiveNote}
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
                    <div slot="heading" style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                      {cat.name}
                    </div>
                    <div slot="description">
                      {t("analysis.categorySummary", { count: cat.count })}
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
