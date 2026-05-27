import React, { useState, useMemo } from "react";
import { MATERIAL_COLORS, hexToColorName } from "../data/constants.js";

export default function CutListTable({ parts, onExportCSV, ui }) {
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const materials = useMemo(
    () => ["All", ...Array.from(new Set(parts.map((p) => p.material)))],
    [parts],
  );

  const filtered = useMemo(() => {
    return parts
      .filter((p) => {
        const matchesFilter = filter === "All" || p.material === filter;
        const matchesSearch =
          !searchTerm ||
          p.part.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.section.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        const va = a[sortBy],
          vb = b[sortBy];
        if (typeof va === "number") return (va - vb) * sortDir;
        return String(va).localeCompare(String(vb)) * sortDir;
      });
  }, [parts, filter, sortBy, sortDir, searchTerm]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => -d);
    } else {
      setSortBy(key);
      setSortDir(1);
    }
  };

  const matDot = (mat) => (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 2,
        background: MATERIAL_COLORS[mat] || "#aaa",
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );

  const col = (label, key, w = "auto") => (
    <th
      onClick={() => handleSort(key)}
      style={{
        padding: "10px 12px",
        textAlign: "left",
        fontSize: 10,
        color: ui.muted,
        cursor: "pointer",
        whiteSpace: "nowrap",
        userSelect: "none",
        width: w,
        borderBottom: `2px solid ${ui.border}`,
        background: ui.panel,
      }}
    >
      {label} {sortBy === key ? (sortDir === 1 ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Material filters */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
          {materials.map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit",
                border: `1.5px solid ${filter === m ? ui.accent : ui.border}`,
                background: filter === m ? ui.accent : ui.inputBg,
                color: filter === m ? "#fff" : ui.text,
                display: "flex",
                alignItems: "center",
                gap: 4,
                transition: "all 0.15s",
              }}
            >
              {m !== "All" && matDot(m)}
              {m === "All" ? "All Parts" : m.replace(/ \d+mm/g, "")}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search parts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${ui.border}`,
            background: ui.inputBg,
            color: ui.text,
            fontSize: 11,
            fontFamily: "inherit",
            minWidth: 180,
          }}
        />

        {/* Stats */}
        <div
          style={{
            fontSize: 11,
            color: ui.muted,
            padding: "6px 12px",
            background: ui.inputBg,
            borderRadius: 6,
            border: `1px solid ${ui.border}`,
          }}
        >
          {filtered.reduce((a, p) => a + p.qty, 0)} parts
        </div>

        {/* Export button */}
        <button
          onClick={() => onExportCSV(filter, searchTerm)}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            border: `1.5px solid ${ui.accent}`,
            background: ui.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontWeight: 600,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2v9M4 7l4 4 4-4M2 13h12"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          overflowY: "auto",
          flex: 1,
          borderRadius: 10,
          border: `1px solid ${ui.border}`,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11,
            fontFamily: "inherit",
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              background: ui.panel,
              zIndex: 2,
            }}
          >
            <tr>
              {col("#", "id", 40)}
              {col("Part Name", "part", 180)}
              {col("Section", "section", 70)}
              {col("Material", "material", 160)}
              {col("Qty", "qty", 50)}
              {col("Length", "length", 80)}
              {col("Width", "width", 80)}
              {col("Thick", "thickness", 60)}
              {col("Grain", "grain", 70)}
              {col("Edge Band", "edgeBand", 120)}
              {col("Color", "color", 100)}
              <th
                style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  fontSize: 10,
                  color: ui.muted,
                  borderBottom: `2px solid ${ui.border}`,
                  background: ui.panel,
                }}
              >
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={`${p.id}-${i}`}
                style={{
                  background: i % 2 === 0 ? ui.bg : ui.panel,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = ui.inputBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    i % 2 === 0 ? ui.bg : ui.panel)
                }
              >
                <td
                  style={{ padding: "8px 12px", color: ui.muted, fontSize: 10 }}
                >
                  {p.id}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    fontWeight: 600,
                    color: ui.text,
                  }}
                >
                  {p.part}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 4,
                      fontSize: 9,
                      background: ui.inputBg,
                      color: ui.accent,
                      border: `1px solid ${ui.border}`,
                      fontWeight: 600,
                    }}
                  >
                    {p.section}
                  </span>
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {matDot(p.material)}
                    <span style={{ color: ui.text, fontSize: 10 }}>
                      {p.material}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: ui.accent,
                      fontSize: 14,
                    }}
                  >
                    {p.qty}
                  </span>
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    color: ui.text,
                    fontWeight: 600,
                  }}
                >
                  {Math.round(p.length)}{" "}
                  <span style={{ color: ui.muted, fontSize: 9 }}>mm</span>
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    color: ui.text,
                    fontWeight: 600,
                  }}
                >
                  {Math.round(p.width)}{" "}
                  <span style={{ color: ui.muted, fontSize: 9 }}>mm</span>
                </td>
                <td
                  style={{ padding: "8px 12px", color: ui.muted, fontSize: 10 }}
                >
                  {p.thickness}mm
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <span
                    style={{
                      padding: "3px 7px",
                      borderRadius: 4,
                      fontSize: 9,
                      background:
                        p.grain === "length"
                          ? "#dbeafe"
                          : p.grain === "width"
                            ? "#dcfce7"
                            : "#fef3c7",
                      color:
                        p.grain === "length"
                          ? "#1d4ed8"
                          : p.grain === "width"
                            ? "#15803d"
                            : "#b45309",
                      fontWeight: 600,
                    }}
                  >
                    {p.grain || "none"}
                  </span>
                </td>
                <td
                  style={{ padding: "8px 12px", color: ui.muted, fontSize: 10 }}
                >
                  {p.edgeBand}
                </td>
                <td
                  style={{ padding: "8px 12px", fontSize: 10 }}
                >
                  {p.color ? (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: p.color,
                          border: `1px solid ${ui.border}`,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: ui.text, fontWeight: 600 }}>
                        {hexToColorName(p.color)}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: ui.muted }}>—</span>
                  )}
                </td>
                <td
                  style={{ padding: "8px 12px", color: ui.muted, fontSize: 10 }}
                >
                  {p.note}
                  {p.machining && (
                    <div
                      style={{ marginTop: 3, fontSize: 9, color: ui.accent }}
                    >
                      ⚙ {p.machining}
                    </div>
                  )}
                  {p.hardware && (
                    <div
                      style={{ marginTop: 3, fontSize: 9, color: "#16a34a" }}
                    >
                      🔧 {p.hardware}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
