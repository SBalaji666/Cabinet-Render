import React, { useState } from "react";
import {
  JOINERY_TYPES,
  DRAWER_SLIDES,
  HINGES,
  SHELF_SYSTEMS,
  PLINTH_SYSTEMS,
  DOOR_OVERLAY_TYPES,
  CONSTRUCTION_TYPES,
} from "../data/constants.js";
import { THEMES } from "../data/themes.js";

export default function ConfigPanel({
  overall,
  setOverall,
  materials,
  setMaterials,
  tolerances,
  setTolerances,
  hardware,
  setHardware,
  sections,
  addSection,
  removeSection,
  updateSection,
  generateEquidistantSections,
  themeKey,
  setThemeKey,
  mainTab,
  totalMm,
  warnings,
  ui,
  selectedSection,
}) {
  // Add this state to track the user's input for auto-generation
  const [autoSectionCount, setAutoSectionCount] = useState(4);

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "6px 8px",
    borderRadius: 6,
    border: `1px solid ${ui.border}`,
    background: ui.inputBg,
    color: ui.text,
    fontFamily: "inherit",
    fontSize: 11,
    marginTop: 3,
    boxSizing: "border-box",
  };

  const sectionStyle = {
    background: ui.bg,
    border: `1px solid ${ui.border}`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  };

  const labelStyle = {
    fontSize: 10,
    color: ui.muted,
    fontWeight: 500,
    marginBottom: 6,
    display: "block",
  };
  const headerStyle = {
    fontSize: 10,
    fontWeight: 600,
    color: ui.accent,
    marginBottom: 8,
    letterSpacing: 1,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxHeight: "90vh",
        overflowY: "auto",
        paddingRight: 4,
      }}
    >
      {/* Dimensions */}
      <div style={sectionStyle}>
        <div style={headerStyle}>DIMENSIONS</div>
        {[
          ["Length", "length", 100, 6000],
          ["Height", "height", 200, 3000],
          ["Depth", "depth", 200, 900],
        ].map(([lbl, key, mn, mx]) => (
          <label key={key} style={labelStyle}>
            {lbl} (mm)
            <input
              type="number"
              min={mn}
              max={mx}
              value={overall[key]}
              onChange={(e) =>
                setOverall((o) => ({ ...o, [key]: Number(e.target.value) }))
              }
              style={inputStyle}
            />
          </label>
        ))}
      </div>

      {/* Materials */}
      <div style={sectionStyle}>
        <div style={headerStyle}>MATERIALS (mm)</div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
        >
          {[
            ["Carcass", "carcass"],
            ["Back", "back"],
            ["Shelf", "shelf"],
            ["Door", "door"],
            ["Drawer Side", "drawerSide"],
            ["Drawer Base", "drawerBottom"],
          ].map(([lbl, key]) => (
            <label key={key} style={labelStyle}>
              {lbl}
              <input
                type="number"
                min={3}
                max={36}
                value={materials[key]}
                onChange={(e) =>
                  setMaterials((m) => ({ ...m, [key]: Number(e.target.value) }))
                }
                style={inputStyle}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Tolerances */}
      <div style={sectionStyle}>
        <div style={headerStyle}>TOLERANCES (mm)</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
          }}
        >
          {[
            ["Door Gap", "doorGap"],
            ["Edge Band", "edgeBanding"],
            ["Shelf Offset", "offset"],
          ].map(([lbl, key]) => (
            <label key={key} style={labelStyle}>
              {lbl}
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={tolerances[key]}
                onChange={(e) =>
                  setTolerances((t) => ({
                    ...t,
                    [key]: Number(e.target.value),
                  }))
                }
                style={inputStyle}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Hardware */}
      <div style={sectionStyle}>
        <div style={headerStyle}>HARDWARE</div>
        {[
          [
            "Plinth",
            "plinth",
            Object.keys(PLINTH_SYSTEMS).map((k) => ({
              v: k,
              l: PLINTH_SYSTEMS[k].name,
            })),
          ],
          [
            "Construction",
            "construction",
            Object.keys(CONSTRUCTION_TYPES).map((k) => ({
              v: k,
              l: CONSTRUCTION_TYPES[k].name,
            })),
          ],
        ].map(([lbl, key, opts]) => (
          <label key={key} style={labelStyle}>
            {lbl}
            <select
              value={hardware[key]}
              onChange={(e) =>
                setHardware((h) => ({ ...h, [key]: e.target.value }))
              }
              style={inputStyle}
            >
              {opts.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Theme */}
      <div style={sectionStyle}>
        <div style={headerStyle}>APPEARANCE</div>
        <label style={labelStyle}>
          Theme
          <select
            value={themeKey}
            onChange={(e) => setThemeKey(e.target.value)}
            style={inputStyle}
          >
            {Object.keys(THEMES).map((k) => (
              <option key={k} value={k}>
                {THEMES[k].name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Sections */}
      <div style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div style={headerStyle}>SECTIONS</div>
          <button
            onClick={addSection}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 10,
              cursor: "pointer",
              border: `1.5px dashed ${ui.accent}`,
              background: "transparent",
              color: ui.accent,
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            + Add
          </button>
        </div>

        {/* --- NEW AUTO-DIVIDE UI --- */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            alignItems: "flex-end",
          }}
        >
          <label style={{ fontSize: 10, color: ui.muted, flex: 1 }}>
            Auto-divide evenly
            <input
              type="number"
              min={1}
              max={20}
              value={autoSectionCount}
              onChange={(e) => setAutoSectionCount(Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <button
            onClick={() => generateEquidistantSections(autoSectionCount)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: ui.accent,
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              height: "26px", // Aligns nicely with your input
              transition: "opacity 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.opacity = 0.8)}
            onMouseOut={(e) => (e.target.style.opacity = 1)}
          >
            Generate
          </button>
        </div>

        <div style={{ fontSize: 9, color: ui.muted, marginBottom: 10 }}>
          {sections.length} section{sections.length !== 1 ? "s" : ""} ·{" "}
          {totalMm} mm raw
          {totalMm !== overall.length && ` → scaled to ${overall.length} mm`}
        </div>

        {/* Duplicate label warning */}
        {warnings.some((w) => w.includes("Duplicate section label")) && (
          <div
            style={{
              fontSize: 9,
              color: "#92400e",
              background: "#fef3c7",
              borderRadius: 5,
              padding: "5px 8px",
              marginBottom: 8,
            }}
          >
            ⚠ Duplicate section labels detected — rename to avoid ambiguity in
            cut list.
          </div>
        )}

        <div style={{ maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
          {sections.map((s) => {
            const isAnySelected = selectedSection !== null;
            const isSelected = selectedSection?.id === s.id;
            const isDisabled = isAnySelected && !isSelected;

            // Safe defaults for drawers
            const drawerCount = s.drawers?.count || 0;
            const drawerHeights = s.drawers?.heights || [];
            const isInternal = s.drawers?.isInternal || false;

            console.log({ drawerHeights });

            return (
              <div
                key={s.id}
                id={`section-${s.id}`}
                style={{
                  background: isSelected ? `${ui.accent}15` : ui.panel,
                  border: `1px solid ${isSelected ? ui.accent : ui.border}`,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                  opacity: isDisabled ? 0.4 : 1,
                  pointerEvents: isDisabled ? "none" : "auto",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Label + remove */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <input
                    value={s.label}
                    onChange={(e) =>
                      updateSection({ ...s, label: e.target.value })
                    }
                    style={{
                      padding: "4px 8px",
                      borderRadius: 5,
                      border: `1px solid ${ui.border}`,
                      background: ui.inputBg,
                      color: ui.text,
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 700,
                      width: 60,
                    }}
                  />
                  <button
                    onClick={() => removeSection(s.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 18,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Width + Type */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <label style={{ fontSize: 10, color: ui.muted }}>
                    Width (mm)
                    <input
                      type="number"
                      min={50}
                      max={2000}
                      value={s.width}
                      onChange={(e) =>
                        updateSection({ ...s, width: Number(e.target.value) })
                      }
                      style={{
                        ...inputStyle,
                        padding: "5px 7px",
                        fontSize: 11,
                      }}
                    />
                  </label>
                  <label style={{ fontSize: 10, color: ui.muted }}>
                    Type
                    <select
                      value={s.type}
                      onChange={(e) =>
                        updateSection({ ...s, type: e.target.value })
                      }
                      style={{
                        ...inputStyle,
                        padding: "5px 7px",
                        fontSize: 11,
                      }}
                    >
                      <option value="closed">Closed</option>
                      <option value="open">Open</option>
                    </select>
                  </label>
                </div>

                {/* Door Swing + Show Divider */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {s.type === "closed" && (
                    <label style={{ fontSize: 10, color: ui.muted }}>
                      Door Swing
                      <select
                        value={s.doorSwing || "right"}
                        onChange={(e) =>
                          updateSection({ ...s, doorSwing: e.target.value })
                        }
                        style={{
                          ...inputStyle,
                          padding: "5px 7px",
                          fontSize: 11,
                        }}
                      >
                        <option value="right">⬅ Right hinge</option>
                        <option value="left">➡ Left hinge</option>
                      </select>
                    </label>
                  )}

                  {/* Show divider only makes sense from section 2 onwards */}
                  {sections.indexOf(s) > 0 && (
                    <label
                      style={{
                        fontSize: 10,
                        color: ui.muted,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      Divider
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 5,
                        }}
                      >
                        <div
                          onClick={() =>
                            updateSection({
                              ...s,
                              showDivider:
                                s.showDivider === false ? true : false,
                            })
                          }
                          style={{
                            width: 32,
                            height: 18,
                            borderRadius: 9,
                            background:
                              s.showDivider === false ? ui.border : ui.accent,
                            position: "relative",
                            cursor: "pointer",
                            transition: "background 0.2s",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              background: "#fff",
                              position: "absolute",
                              top: 2,
                              left: s.showDivider === false ? 2 : 16,
                              transition: "left 0.2s",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 9 }}>
                          {s.showDivider === false ? "Hidden" : "Visible"}
                        </span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Shelves */}
                <label
                  style={{
                    fontSize: 10,
                    color: ui.muted,
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  Shelves
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={s.shelves || 0}
                    onChange={(e) =>
                      updateSection({ ...s, shelves: Number(e.target.value) })
                    }
                    style={{ ...inputStyle, padding: "5px 7px", fontSize: 11 }}
                  />
                </label>

                {/* Drawers */}
                <div
                  style={{
                    background: ui.bg,
                    borderRadius: 6,
                    padding: 8,
                    border: `1px solid ${ui.border}`,
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: ui.accent,
                      marginBottom: 6,
                      letterSpacing: 0.5,
                    }}
                  >
                    DRAWERS
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 6,
                    }}
                  >
                    {/* NEW: Updated Count logic to generate heights array */}
                    <label style={{ fontSize: 9, color: ui.muted }}>
                      Count
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={drawerCount}
                        onChange={(e) => {
                          const newCount = Number(e.target.value);
                          const newHeights = Array(newCount)
                            .fill(120) // default height
                            .map((def, i) => drawerHeights[i] || def); // preserve existing heights

                          updateSection({
                            ...s,
                            drawers: {
                              ...(s.drawers || {}),
                              count: newCount,
                              heights: newHeights,
                            },
                          });
                        }}
                        style={{
                          ...inputStyle,
                          padding: "4px 6px",
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      />
                    </label>

                    {/* NEW: Explicit Internal vs External dropdown */}
                    <label style={{ fontSize: 9, color: ui.muted }}>
                      Style
                      <select
                        value={isInternal ? "internal" : "external"}
                        onChange={(e) =>
                          updateSection({
                            ...s,
                            drawers: {
                              ...(s.drawers || {}),
                              isInternal: e.target.value === "internal",
                            },
                          })
                        }
                        style={{
                          ...inputStyle,
                          padding: "4px 6px",
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      >
                        <option value="external">External</option>
                        <option value="internal">Internal</option>
                      </select>
                    </label>

                    <label style={{ fontSize: 9, color: ui.muted }}>
                      Placement
                      <select
                        value={s.drawers?.placement || "bottom"}
                        onChange={(e) =>
                          updateSection({
                            ...s,
                            drawers: {
                              ...(s.drawers || {}),
                              placement: e.target.value,
                            },
                          })
                        }
                        style={{
                          ...inputStyle,
                          padding: "4px 6px",
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      >
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="full">Full</option>
                        <option value="custom">Custom (Offset)</option>
                      </select>
                    </label>
                  </div>

                  {/* NEW: Individual Heights Loop */}
                  {drawerCount > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(50px, 1fr))",
                        gap: 6,
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: `1px dashed ${ui.border}`,
                      }}
                    >
                      {Array.from({ length: drawerCount }).map((_, i) => (
                        <label key={i} style={{ fontSize: 9, color: ui.muted }}>
                          H: {i + 1}
                          <input
                            type="number"
                            min={40}
                            max={1000}
                            value={drawerHeights[i] || 120}
                            // value={drawerHeights[i]}
                            onChange={(e) => {
                              const newHeights = [...drawerHeights];
                              newHeights[i] = Number(e.target.value);
                              updateSection({
                                ...s,
                                drawers: {
                                  ...(s.drawers || {}),
                                  heights: newHeights,
                                },
                              });
                            }}
                            style={{
                              ...inputStyle,
                              padding: "4px 6px",
                              fontSize: 10,
                              marginTop: 2,
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Conditional Custom Offset Inputs */}
                  {s.drawers?.placement === "custom" && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 6,
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: `1px dashed ${ui.border}`,
                      }}
                    >
                      <label style={{ fontSize: 9, color: ui.muted }}>
                        Offset From
                        <select
                          value={s.drawers?.customFrom || "bottom"}
                          onChange={(e) =>
                            updateSection({
                              ...s,
                              drawers: {
                                ...(s.drawers || {}),
                                customFrom: e.target.value,
                              },
                            })
                          }
                          style={{
                            ...inputStyle,
                            padding: "4px 6px",
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          <option value="bottom">Bottom</option>
                          <option value="top">Top</option>
                        </select>
                      </label>
                      <label style={{ fontSize: 9, color: ui.muted }}>
                        Distance (%)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={s.drawers?.customPercentage ?? 20}
                          onChange={(e) =>
                            updateSection({
                              ...s,
                              drawers: {
                                ...(s.drawers || {}),
                                customPercentage: Number(e.target.value),
                              },
                            })
                          }
                          style={{
                            ...inputStyle,
                            padding: "4px 6px",
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
