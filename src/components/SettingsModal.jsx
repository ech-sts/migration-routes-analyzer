import React, { useState, useEffect, useRef } from "react";
import { DEFAULT_CONFIG, saveConfig, clearSavedConfig } from "../config.js";

export default function SettingsModal({ open, config, onSave, onReset, onClose }) {
  const modalRef = useRef(null);

  const [webmapId, setWebmapId] = useState(config.webmapId || "");
  const [bufferDistance, setBufferDistance] = useState(config.bufferDistance || 30);
  const [bufferUnit, setBufferUnit] = useState(config.bufferUnit || "kilometers");
  const [obstacleLayerTitle, setObstacleLayerTitle] = useState(config.obstacleLayerTitle || "route-obstacles");
  const [weightField, setWeightField] = useState(config.weightField || "weight");
  const [descriptionField, setDescriptionField] = useState(config.descriptionField || "description");

  // Keep state in sync with prop changes
  useEffect(() => {
    if (open) {
      setWebmapId(config.webmapId || "");
      setBufferDistance(config.bufferDistance || 30);
      setBufferUnit(config.bufferUnit || "kilometers");
      setObstacleLayerTitle(config.obstacleLayerTitle || "route-obstacles");
      setWeightField(config.weightField || "weight");
      setDescriptionField(config.descriptionField || "description");
    }
  }, [open, config]);

  // Handle Calcite dialog close event
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    const handleClose = () => {
      if (onClose) onClose();
    };

    el.addEventListener("calciteDialogClose", handleClose);
    return () => {
      el.removeEventListener("calciteDialogClose", handleClose);
    };
  }, [onClose]);

  const handleSave = () => {
    const updated = {
      ...config,
      webmapId: webmapId.trim(),
      bufferDistance: parseFloat(bufferDistance) || 30,
      bufferUnit: bufferUnit,
      obstacleLayerTitle: obstacleLayerTitle.trim() || "route-obstacles",
      weightField: weightField.trim() || "weight",
      descriptionField: descriptionField.trim() || "description"
    };

    saveConfig(updated);
    if (onSave) onSave(updated);
    if (onClose) onClose();
  };

  const handleReset = () => {
    clearSavedConfig();
    setWebmapId(DEFAULT_CONFIG.webmapId);
    setBufferDistance(DEFAULT_CONFIG.bufferDistance);
    setBufferUnit(DEFAULT_CONFIG.bufferUnit);
    setObstacleLayerTitle(DEFAULT_CONFIG.obstacleLayerTitle);
    setWeightField(DEFAULT_CONFIG.weightField);
    setDescriptionField(DEFAULT_CONFIG.descriptionField);

    if (onReset) onReset(DEFAULT_CONFIG);
    if (onClose) onClose();
  };

  if (!open) return null;

  return (
    <calcite-dialog
      ref={modalRef}
      open
      heading="Simulation & Analysis Settings"
      width-scale="m"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ margin: "0 0 0.5rem 0", color: "var(--calcite-color-text-2)", fontSize: "0.9rem" }}>
          Configure non-static values including the ArcGIS Online WebMap ID, route corridor buffer distance, units, and obstacle layer attributes.
        </p>

        <calcite-label>
          ArcGIS Online WebMap Item ID
          <calcite-input-text
            value={webmapId}
            onInput={(e) => setWebmapId(e.target.value)}
            placeholder="e.g. 433c2a6b28f84737a4d538e14674724b"
          />
        </calcite-label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <calcite-label>
            Corridor Buffer Distance
            <calcite-input-number
              value={bufferDistance}
              min={1}
              max={500}
              step={5}
              onInput={(e) => setBufferDistance(e.target.value)}
            />
          </calcite-label>

          <calcite-label>
            Buffer Unit
            <calcite-select
              value={bufferUnit}
              onCalciteSelectChange={(e) => setBufferUnit(e.target.value)}
            >
              <calcite-option value="kilometers" selected={bufferUnit === "kilometers" ? true : undefined}>
                Kilometers (km)
              </calcite-option>
              <calcite-option value="miles" selected={bufferUnit === "miles" ? true : undefined}>
                Miles (mi)
              </calcite-option>
              <calcite-option value="meters" selected={bufferUnit === "meters" ? true : undefined}>
                Meters (m)
              </calcite-option>
              <calcite-option value="nautical-miles" selected={bufferUnit === "nautical-miles" ? true : undefined}>
                Nautical Miles (NM)
              </calcite-option>
            </calcite-select>
          </calcite-label>
        </div>

        <calcite-label>
          Route Obstacles Layer Title (in WebMap)
          <calcite-input-text
            value={obstacleLayerTitle}
            onInput={(e) => setObstacleLayerTitle(e.target.value)}
            placeholder="route-obstacles"
          />
          <span style={{ fontSize: "0.8rem", color: "var(--calcite-color-text-3)" }}>
            * Note: As required, this layer is kept invisible on the map so users cannot see obstacles while sketching.
          </span>
        </calcite-label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <calcite-label>
            Weight Field Name
            <calcite-input-text
              value={weightField}
              onInput={(e) => setWeightField(e.target.value)}
              placeholder="weight"
            />
          </calcite-label>

          <calcite-label>
            Description Field Name
            <calcite-input-text
              value={descriptionField}
              onInput={(e) => setDescriptionField(e.target.value)}
              placeholder="description"
            />
          </calcite-label>
        </div>
      </div>

      <div slot="footer-end" style={{ display: "flex", gap: "0.5rem" }}>
        <calcite-button appearance="outline" kind="danger" onClick={handleReset}>
          Reset to Defaults
        </calcite-button>
        <calcite-button appearance="outline" kind="neutral" onClick={onClose}>
          Cancel
        </calcite-button>
        <calcite-button kind="brand" onClick={handleSave}>
          Save Changes
        </calcite-button>
      </div>
    </calcite-dialog>
  );
}
