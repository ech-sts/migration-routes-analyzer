import React, { useEffect, useRef } from "react";

export default function GuideModal({ open, onClose }) {
  const modalRef = useRef(null);

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

  if (!open) return null;

  return (
    <calcite-dialog
      ref={modalRef}
      open
      heading="Refugee Migration Routes — Educational Guide"
      width-scale="l"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", lineHeight: "1.5" }}>
        <div>
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>
            Taking the Perspective of Refugees
          </h3>
          <p style={{ margin: 0, color: "var(--calcite-color-text-2)", fontSize: "0.9rem" }}>
            The purpose of this educational simulation is to allow students to step into the perspective of refugees and displaced persons escaping war, violence, human rights violations, or climate catastrophe in the Middle East, North Africa, Sub-Saharan Africa, and Central Asia.
          </p>
        </div>

        <calcite-notice open icon="view-hide" kind="brand">
          <div slot="title">Why Are Obstacles Invisible on the Map?</div>
          <div slot="message">
            In the real world, refugees do not possess perfect information. Militarized border fences, thermal surveillance cameras, violent pushback zones, and maritime interdiction zones are intentionally obscured or constantly shifting. Keeping the <code>route-obstacles</code> layer hidden in the map requires students to chart routes based on geography and assumption, just as displaced individuals must rely on informal networks, word-of-mouth, or human smugglers.
          </div>
        </calcite-notice>

        <div>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>
            Major Migration Corridors into Europe
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <calcite-card>
              <div slot="title" style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                Central Mediterranean Route
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
                Departs from Libya or Tunisia toward Lampedusa, Sicily, or Malta. Documented by the UN IOM as the deadliest maritime migration corridor in the world, with thousands of drownings, engine failures, and interceptions by Libyan coast guard forces leading to arbitrary detention.
              </p>
            </calcite-card>

            <calcite-card>
              <div slot="title" style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                Eastern Mediterranean Route
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
                Passes through Turkey into Greece via the Aegean Sea islands (Lesvos, Samos, Chios) or across the Evros river border. Characterized by overloaded dinghies, dangerous currents, and pushbacks at sea.
              </p>
            </calcite-card>

            <calcite-card>
              <div slot="title" style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                Western Balkan Route
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
                Traverses North Macedonia, Serbia, Bosnia & Herzegovina, Hungary, and Croatia. Features double razor-wire border fences, police dog patrols, biometric surveillance, and extreme winter exposure in abandoned buildings.
              </p>
            </calcite-card>

            <calcite-card>
              <div slot="title" style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                Western Mediterranean & Atlantic Route
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
                From Morocco or Algeria to mainland Spain, or from West Africa (Senegal, Mauritania) across open ocean to the Canary Islands. The Atlantic route involves open wooden pirogues facing weeks of treacherous currents.
              </p>
            </calcite-card>
          </div>
        </div>

        <div>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>
            Classroom Discussion Ideas
          </h4>
          <ul style={{ margin: "0", paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--calcite-color-text-2)" }}>
            <li>Why do refugees choose dangerous irregular routes instead of boarding a plane or taking a ferry? (Lack of legal visas and airline carrier sanctions).</li>
            <li>When European nations fortify one border (e.g. Hungarian border fence in 2015), how does the migratory flow shift toward more hazardous mountain or maritime passages?</li>
            <li>What responsibilities do states have under the 1951 Geneva Refugee Convention regarding non-refoulement (the principle of not forcing refugees to return to a country where they face persecution)?</li>
          </ul>
        </div>
      </div>

      <div slot="footer-end">
        <calcite-button kind="brand" onClick={onClose}>
          Close Guide
        </calcite-button>
      </div>
    </calcite-dialog>
  );
}
