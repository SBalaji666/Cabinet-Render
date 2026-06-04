import React from "react";

/**
 * SheetMaterialEditor
 *
 * A compact inline editor rendered inside the Nesting tab.
 * Maps over the dynamic sheetMaterials state and lets the user
 * change width / height per material. Changes propagate up via
 * onUpdate, which re-triggers the nesting useMemo chain.
 */
export default function SheetMaterialEditor({
  sheetMaterials,
  onUpdate,
  onReset,
  ui,
}) {
  const materials = Object.entries(sheetMaterials);

  const cellStyle = {
    padding: "8px 10px",
    fontSize: 11,
    fontFamily: "inherit",
    borderBottom: `1px solid ${ui.border}`,
  };

  const inputStyle = {
    width: 72,
    padding: "5px 7px",
    borderRadius: 5,
    border: `1px solid ${ui.border}`,
    background: ui.inputBg,
    color: ui.text,
    fontFamily: "inherit",
    fontSize: 11,
    textAlign: "right",
    transition: "border-color 0.15s",
  };

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${ui.border}`,
        background: ui.panel,
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: `1px solid ${ui.border}`,
          background: ui.bg,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: ui.accent,
              letterSpacing: 1,
            }}
          >
            SHEET DIMENSIONS
          </div>
          <div style={{ fontSize: 9, color: ui.muted, marginTop: 2 }}>
            Edit width & height to recalculate nesting
          </div>
        </div>
        <button
          onClick={onReset}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 600,
            border: `1.5px solid ${ui.border}`,
            background: ui.inputBg,
            color: ui.muted,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = ui.accent;
            e.currentTarget.style.color = ui.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = ui.border;
            e.currentTarget.style.color = ui.muted;
          }}
        >
          ↺ Reset Defaults
        </button>
      </div>

      {/* Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 11,
          fontFamily: "inherit",
        }}
      >
        <thead>
          <tr style={{ background: ui.bg }}>
            <th
              style={{
                ...cellStyle,
                textAlign: "left",
                fontSize: 9,
                color: ui.muted,
                fontWeight: 600,
              }}
            >
              Material
            </th>
            <th
              style={{
                ...cellStyle,
                textAlign: "right",
                fontSize: 9,
                color: ui.muted,
                fontWeight: 600,
              }}
            >
              Width (mm)
            </th>
            <th
              style={{
                ...cellStyle,
                textAlign: "right",
                fontSize: 9,
                color: ui.muted,
                fontWeight: 600,
              }}
            >
              Height (mm)
            </th>
            <th
              style={{
                ...cellStyle,
                textAlign: "right",
                fontSize: 9,
                color: ui.muted,
                fontWeight: 600,
              }}
            >
              Thick
            </th>
            <th
              style={{
                ...cellStyle,
                textAlign: "right",
                fontSize: 9,
                color: ui.muted,
                fontWeight: 600,
              }}
            >
              Area (m²)
            </th>
          </tr>
        </thead>
        <tbody>
          {materials.map(([name, spec], i) => {
            const area = ((spec.width * spec.height) / 1e6).toFixed(2);
            return (
              <tr
                key={name}
                style={{ background: i % 2 === 0 ? ui.bg : ui.panel }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = ui.inputBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    i % 2 === 0 ? ui.bg : ui.panel)
                }
              >
                {/* Material name */}
                <td style={{ ...cellStyle, fontWeight: 600, color: ui.text }}>
                  <div>{name}</div>
                  <div style={{ fontSize: 9, color: ui.muted, fontWeight: 400 }}>
                    {spec.material}
                  </div>
                </td>

                {/* Width input */}
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  <input
                    id={`sheet-width-${name.replace(/\s+/g, "-").toLowerCase()}`}
                    type="number"
                    min={100}
                    max={6000}
                    step={10}
                    value={spec.width}
                    onChange={(e) =>
                      onUpdate(name, { width: Number(e.target.value) })
                    }
                    style={inputStyle}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = ui.accent)
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = ui.border)
                    }
                  />
                </td>

                {/* Height input */}
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  <input
                    id={`sheet-height-${name.replace(/\s+/g, "-").toLowerCase()}`}
                    type="number"
                    min={100}
                    max={6000}
                    step={10}
                    value={spec.height}
                    onChange={(e) =>
                      onUpdate(name, { height: Number(e.target.value) })
                    }
                    style={inputStyle}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = ui.accent)
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = ui.border)
                    }
                  />
                </td>

                {/* Thickness (read-only) */}
                <td
                  style={{
                    ...cellStyle,
                    textAlign: "right",
                    color: ui.muted,
                  }}
                >
                  {spec.thickness}mm
                </td>

                {/* Computed area (read-only) */}
                <td
                  style={{
                    ...cellStyle,
                    textAlign: "right",
                    color: ui.muted,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {area}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
