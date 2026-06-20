// src/App.jsx
// Updated to support:
//   - Save/update via SaveDesignModal (from Next.js project)
//   - Delete with confirmation
//   - "Load saved…" dropdown (navigates to /designer/:id)
//   - Preloaded config from route pages (DesignerPage / DesignerWithDesign)
//   - All existing 3D view, cut list, nesting tabs unchanged

import React, { useState, useMemo, useRef } from "react";
import { THEMES } from "./data/themes.js";
import { DEFAULTS, hexToColorName, getDefaultSheetMaterials } from "./data/constants.js";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "svg2pdf.js";
import {
  generateCutList,
  generateHardwareSchedule,
  generateMachiningSchedule,
  validateConfig,
} from "./utils/cutListEngine.js";
import {
  optimizeSheetLayout,
  calculateMaterialCost,
  generateNestingSVG,
} from "./utils/sheetOptimizer.js";
import ThreeDViewer from "./components/ThreeDViewer.jsx";
import CutListTable from "./components/CutListTable.jsx";
import SheetOptimizationView from "./components/SheetOptimizationView.jsx";
import HardwareSchedule from "./components/HardwareSchedule.jsx";
import MachiningSchedule from "./components/MachiningSchedule.jsx";
import ConfigPanel from "./components/ConfigPanel.jsx";

// ── New components (ported from Next.js project) ──────────────────────────────
import SaveDesignModal from "./components/SaveDesignModal.jsx";
import LoadDesignDropdown from "./components/LoadDesignDropdown.jsx";
import { useDesignSync } from "./hooks/useDesignSync.js";
import { useNavigate } from "react-router-dom";

const FONT = "'IBM Plex Mono', 'Courier New', monospace";

// ── Props ─────────────────────────────────────────────────────────────────────
// savedDesigns        — array of { _id, name, updatedAt } from the API
// preloadedConfig     — config object when opening a saved design (null for new)
// preloadedDesignId   — MongoDB _id when opening a saved design (null for new)
// preloadedDesignName — display name when opening a saved design

export default function App({
  savedDesigns = [],
  preloadedConfig = null,
  preloadedDesignId = null,
  preloadedDesignName = "Untitled design",
  preloadedDesignDescription = "",
}) {
  const navigate = useNavigate();
  const nextSectionId = useRef(8);
  const fileInputRef = useRef(null);

  // ── Design sync hook ──────────────────────────────────────────────────────
  const { saveDesign, deleteDesign, isPending, saveError, setSaveError } =
    useDesignSync();

  // ── State — initialised from preloadedConfig if opening a saved design ────
  const [overall, setOverall] = useState(
    preloadedConfig?.overall ?? DEFAULTS.overall,
  );
  const [materials, setMaterials] = useState(
    preloadedConfig?.materials ?? DEFAULTS.materials,
  );
  const [tolerances, setTolerances] = useState(
    preloadedConfig?.tolerances ?? DEFAULTS.tolerances,
  );
  const [hardware, setHardware] = useState(
    preloadedConfig?.hardware ?? {
      joinery: DEFAULTS.joinery,
      drawerSlide: DEFAULTS.drawerSlide,
      hinge: DEFAULTS.hinge,
      shelfSystem: DEFAULTS.shelfSystem,
      skirt: DEFAULTS.skirt,
      construction: DEFAULTS.construction,
      doorOverlay: DEFAULTS.doorOverlay,
      edgeBanding: DEFAULTS.edgeBanding,
    },
  );
  const [sections, setSections] = useState(preloadedConfig?.sections ?? []);
  const [themeKey, setThemeKey] = useState(
    preloadedConfig?.themeKey ?? "technical",
  );
  const [mainTab, setMainTab] = useState("3d-view");
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [panelColors, setPanelColors] = useState(
    preloadedConfig?.panelColors ?? {},
  );
  const [sheetMaterials, setSheetMaterials] = useState(
    preloadedConfig?.sheetMaterials ?? getDefaultSheetMaterials(),
  );

  // ── Save modal state ──────────────────────────────────────────────────────
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState(preloadedDesignId);
  const [designName, setDesignName] = useState(preloadedDesignName);
  const [designDescription, setDesignDescription] = useState(
    preloadedDesignDescription,
  );

  const theme = THEMES[themeKey] ?? THEMES.technical;
  const ui = theme.ui;

  // ── Config + computed outputs ─────────────────────────────────────────────
  const config = useMemo(
    () => ({ overall, materials, tolerances, sections, hardware, panelColors }),
    [overall, materials, tolerances, sections, hardware, panelColors],
  );

  const warnings = useMemo(() => validateConfig(config), [config]);
  const cutList = useMemo(() => generateCutList(config), [config]);
  const hardwareSchedule = useMemo(
    () => generateHardwareSchedule(config, cutList),
    [config, cutList],
  );
  const machiningSchedule = useMemo(
    () => generateMachiningSchedule(cutList, config),
    [cutList, config],
  );
  const sheetLayout = useMemo(
    () => optimizeSheetLayout(cutList, tolerances.sawKerf, sheetMaterials),
    [cutList, tolerances.sawKerf, sheetMaterials],
  );
  const materialCost = useMemo(
    () => calculateMaterialCost(sheetLayout),
    [sheetLayout],
  );

  const stats = useMemo(() => {
    const sheetValues = Object.values(sheetLayout);
    const avgEff =
      sheetValues.length > 0
        ? sheetValues.reduce((sum, l) => sum + l.averageEfficiency, 0) /
          sheetValues.length
        : 0;
    return {
      totalParts: cutList.reduce((a, p) => a + p.qty, 0),
      uniqueParts: cutList.length,
      totalSheets: sheetValues.reduce((a, l) => a + l.totalSheets, 0),
      materialCost: materialCost.totalCost,
      hardwareCost: hardwareSchedule.reduce((a, h) => a + h.totalCost, 0),
      avgEfficiency: Math.round(avgEff),
    };
  }, [cutList, sheetLayout, materialCost, hardwareSchedule]);

  const totalMm = sections.reduce((a, s) => a + s.width, 0);

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = async (name, description) => {
    const result = await saveDesign({
      designId: currentDesignId,
      name,
      description,
      overall,
      materials,
      tolerances,
      hardware,
      sections,
      panelColors,
      sheetMaterials,
      themeKey,
    });

    if (result.success) {
      setDesignName(name);
      setDesignDescription(description);
      if (!currentDesignId) setCurrentDesignId(result.designId);
      setSaveModalOpen(false);
    }
    // saveError is set automatically in the hook on failure
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = () => deleteDesign(currentDesignId);

  // ── Export Excel ────────────────────────────────────────────────────────────
  const downloadExcel = (filter, searchTerm) => {
    const rows = cutList
      .filter((p) => {
        const matchesFilter = filter === "All" || p.material === filter;
        const matchesSearch =
          !searchTerm ||
          p.part?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.section?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
      })
      .map((p) => ({
        "#": p.id,
        "Part": p.part,
        "Section": p.section,
        "Material": p.material,
        "Qty": p.qty,
        "Length (mm)": Math.round(p.length),
        "Width (mm)": Math.round(p.width),
        "Thickness (mm)": p.thickness,
        "Grain": p.grain || "",
        "Edge Band": p.edgeBand || "",
        "Machining": p.machining || "",
        "Hardware": p.hardware || "",
        "Color": hexToColorName(p.color),
        "Notes": p.note || "",
      }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set readable column widths
    ws["!cols"] = [
      { wch: 5 },   // #
      { wch: 28 },  // Part
      { wch: 10 },  // Section
      { wch: 22 },  // Material
      { wch: 5 },   // Qty
      { wch: 12 },  // Length
      { wch: 12 },  // Width
      { wch: 12 },  // Thickness
      { wch: 8 },   // Grain
      { wch: 18 },  // Edge Band
      { wch: 30 },  // Machining
      { wch: 28 },  // Hardware
      { wch: 14 },  // Color
      { wch: 40 },  // Notes
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cut List");
    XLSX.writeFile(wb, `cutlist_${overall.length}x${overall.height}x${overall.depth}.xlsx`);
  };


  const downloadNestingSVG = (material) => {
    const svg = generateNestingSVG(sheetLayout, material);
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nesting_${material.replace(/\s+/g, "_")}.svg`;
    a.click();
  };

  /* Convert a material's nesting SVG to an A4 fit-to-page vector PDF, client-side.
     Mirrors downloadNestingSVG: reuses generateNestingSVG as the source (D-04),
     same no-op guard, same Blob-download pattern (with revokeObjectURL). The SVG
     is parsed into a DOM node and rendered to jsPDF via svg2pdf.js (vector, D-03). */
  const downloadNestingPDF = async (material) => {
    const svg = generateNestingSVG(sheetLayout, material);
    if (!svg) return;
    try {
      // Parse the standalone SVG string into a real DOM node for svg2pdf.
      const svgNode = new DOMParser().parseFromString(
        svg,
        "image/svg+xml"
      ).documentElement;
      const svgWidth = parseFloat(svgNode.getAttribute("width"));
      const svgHeight = parseFloat(svgNode.getAttribute("height"));

      // Auto orientation from the diagram aspect ratio (D-02).
      const orientation = svgWidth > svgHeight ? "landscape" : "portrait";
      const doc = new jsPDF({ unit: "pt", format: "a4", orientation });

      // Fit-to-page: single uniform scale, centered on the A4 printable area (D-01).
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const scale = Math.min(pageWidth / svgWidth, pageHeight / svgHeight);
      const drawWidth = svgWidth * scale;
      const drawHeight = svgHeight * scale;
      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      // svg2pdf.js augments doc.svg(...) onto the jsPDF prototype; it is async.
      await doc.svg(svgNode, { x, y, width: drawWidth, height: drawHeight });

      const blob = doc.output("blob");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `nesting_${material.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Nesting PDF export failed", err);
    }
  };

  // ── Export / Import JSON ───────────────────────────────────────────────────
  const exportConfigJSON = () => {
    const configData = {
      _exportedAt: new Date().toISOString(),
      _version: 1,
      overall,
      materials,
      tolerances,
      hardware,
      sections,
      panelColors,
      sheetMaterials,
      themeKey,
    };
    const json = JSON.stringify(configData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cabinet-config_${overall.length}x${overall.height}x${overall.depth}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importConfigJSON = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Hydrate every state slice that exists in the file
        if (data.overall) setOverall(data.overall);
        if (data.materials) setMaterials(data.materials);
        if (data.tolerances) setTolerances(data.tolerances);
        if (data.hardware) setHardware(data.hardware);
        if (data.sections) {
          setSections(data.sections);
          // Keep section ID counter above the highest imported id
          const maxId = Math.max(...data.sections.map((s) => s.id), 0);
          nextSectionId.current = maxId + 1;
        }
        if (data.panelColors) setPanelColors(data.panelColors);
        if (data.sheetMaterials) setSheetMaterials(data.sheetMaterials);
        if (data.themeKey && THEMES[data.themeKey]) setThemeKey(data.themeKey);
      } catch (err) {
        alert("Invalid JSON file — could not parse the configuration.\n\n" + err.message);
      }
    };
    reader.onerror = () => alert("Failed to read the file. Please try again.");
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Section management ────────────────────────────────────────────────────
  const addSection = () => {
    const newId = nextSectionId.current++;
    setSections((prev) => {
      const highestLabelNum = prev.reduce((max, s) => {
        const n = parseInt(s.label.replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      return [
        ...prev,
        {
          id: newId,
          label: `S${highestLabelNum + 1}`,
          width: 350,
          type: "closed",
          shelves: 2,
          drawers: { count: 0, height: 120, placement: "bottom" },
        },
      ];
    });
  };

  const removeSection = (id) =>
    setSections((prev) => prev.filter((s) => s.id !== id));
  const updateSection = (updated) =>
    setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  const generateEquidistantSections = (count) => {
    if (count < 1) return;
    const equalWidth = Math.floor(overall.length / count);
    const newSections = Array.from({ length: count }, (_, i) => ({
      id: nextSectionId.current++,
      label: `S${i + 1}`,
      width: i === count - 1 ? overall.length - equalWidth * i : equalWidth,
      type: "closed",
      shelves: 2,
      drawers: { count: 0, height: 120, placement: "bottom" },
    }));
    setSections(newSections);
  };

  // ── Tab button ────────────────────────────────────────────────────────────
  const tabBtn = (label, key, icon, badge = null) => (
    <button
      key={key}
      onClick={() => setMainTab(key)}
      style={{
        padding: "9px 18px",
        borderRadius: 8,
        fontFamily: FONT,
        fontSize: 11,
        cursor: "pointer",
        fontWeight: 600,
        border: `2px solid ${mainTab === key ? ui.accent : ui.border}`,
        background: mainTab === key ? ui.accent : ui.bg,
        color: mainTab === key ? "#fff" : ui.text,
        display: "flex",
        alignItems: "center",
        gap: 7,
        transition: "all 0.15s",
        position: "relative",
      }}
    >
      {icon}
      {label}
      {badge !== null && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: "#ef4444",
            color: "#fff",
            borderRadius: 10,
            padding: "2px 6px",
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  const handleSectionSelect = (section) => {
    setSelectedSection(section);
    const el = document.getElementById(`section-${section?.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ── Panel color handlers ──────────────────────────────────────────────────
  const handlePanelSelect = (panelInfo) => {
    setSelectedPanel(panelInfo);
  };

  const handlePanelColorChange = (panelId, color) => {
    setPanelColors((prev) => ({ ...prev, [panelId]: color }));
  };

  const handlePanelColorReset = (panelId) => {
    setPanelColors((prev) => {
      const next = { ...prev };
      delete next[panelId];
      return next;
    });
  };

  const containerBg =
    themeKey === "blueprint"
      ? "linear-gradient(135deg, #071525 0%, #0d2137 100%)"
      : themeKey === "workshop"
        ? "linear-gradient(135deg, #f5efe6 0%, #ece3d5 100%)"
        : "linear-gradient(135deg, #eef2f8 0%, #f5f7fb 100%)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: containerBg,
        padding: 20,
        fontFamily: FONT,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* ── Header ── */}
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              color: ui.text,
              fontFamily: FONT,
              fontWeight: 600,
              letterSpacing: "-0.5px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 32 }}>🏗️</span>
            Cabinet Designer 3D
          </h1>
          <div style={{ fontSize: 10, color: ui.muted, marginTop: 3 }}>
            {stats.totalParts} parts · {stats.totalSheets} sheets ·{" "}
            {stats.avgEfficiency}% sheet efficiency
            {currentDesignId && (
              <span style={{ marginLeft: 12, color: ui.accent }}>
                ● {designName}
              </span>
            )}
          </div>
        </div>

        {/* ── Header actions ── */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {currentDesignId && (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {/* Design name — inline editable */}
              <input
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: `1.5px solid ${ui.border}`,
                  background: ui.inputBg,
                  color: ui.text,
                  fontFamily: FONT,
                  fontSize: 11,
                  fontWeight: 600,
                  width: 160,
                }}
                placeholder="Design name…"
              />
            </div>
          )}

          {/* Save / Update button */}
          <button
            onClick={() => setSaveModalOpen(true)}
            disabled={isPending}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 600,
              cursor: isPending ? "wait" : "pointer",
              background: ui.accent,
              color: "#fff",
              border: "none",
              opacity: isPending ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {isPending ? "Saving…" : currentDesignId ? "💾 Update" : "💾 Save"}
          </button>

          {/* Delete button — only shown when a design is loaded */}
          {currentDesignId && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                background: "transparent",
                color: "#ef4444",
                border: "1.5px solid #ef4444",
              }}
            >
              Delete
            </button>
          )}

          {/* Back button — only shown when a design is loaded */}
          {currentDesignId && (
            <button
              onClick={() => {
                navigate("/designer");
              }}
              disabled={isPending}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                background: "transparent",
                color: "#7e6b6b",
                border: "1.5px solid #7e6b6b",
              }}
            >
              Back
            </button>
          )}

          {!currentDesignId && (
            <LoadDesignDropdown designs={savedDesigns} ui={ui} />
          )}

          {/* Export / Import JSON */}
          <button
            id="export-json-btn"
            onClick={exportConfigJSON}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              background: "transparent",
              color: ui.accent,
              border: `1.5px solid ${ui.accent}`,
              transition: "all 0.15s",
            }}
          >
            ↓ Export JSON
          </button>
          <button
            id="import-json-btn"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              background: "transparent",
              color: ui.accent,
              border: `1.5px solid ${ui.accent}`,
              transition: "all 0.15s",
            }}
          >
            ↑ Import JSON
          </button>

          {/* Tab buttons */}
          {/* {tabBtn(
            "3D View",
            "3d-view",
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>,
          )}
          {tabBtn(
            "Cut List",
            "cutlist",
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>,
            stats.totalParts,
          )}
          {tabBtn(
            "Nesting",
            "optimization",
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>,
            stats.totalSheets,
          )} */}
        </div>
      </div>

      {/* ── Validation warnings ── */}
      {warnings.length > 0 && (
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto 12px",
            background: "#fef3c7",
            border: "1.5px solid #f59e0b",
            borderRadius: 10,
            padding: "10px 16px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#92400e",
              marginBottom: 4,
            }}
          >
            ⚠ {warnings.length} Configuration Warning
            {warnings.length > 1 ? "s" : ""} — resolve before sending to
            production
          </div>
          {warnings.map((w, i) => (
            <div
              key={i}
              style={{ fontSize: 10, color: "#78350f", marginTop: 2 }}
            >
              • {w}
            </div>
          ))}
        </div>
      )}

      {/* ── Main layout ── */}
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <ConfigPanel
          overall={overall}
          setOverall={setOverall}
          materials={materials}
          setMaterials={setMaterials}
          tolerances={tolerances}
          setTolerances={setTolerances}
          hardware={hardware}
          setHardware={setHardware}
          sections={sections}
          addSection={addSection}
          removeSection={removeSection}
          updateSection={updateSection}
          generateEquidistantSections={generateEquidistantSections}
          themeKey={themeKey}
          setThemeKey={setThemeKey}
          mainTab={mainTab}
          totalMm={totalMm}
          warnings={warnings}
          ui={ui}
          selectedSection={selectedSection}
        />

        <div
          style={{
            background: ui.bg,
            border: `1px solid ${ui.border}`,
            borderRadius: 12,
            padding: 16,
            minHeight: 680,
          }}
        >
          {/* Tab nav */}
          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            {/* Tab buttons */}
            {tabBtn(
              "3D View",
              "3d-view",
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>,
            )}
            {tabBtn(
              "Cut List",
              "cutlist",
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>,
              stats.totalParts,
            )}
            {tabBtn(
              "Nesting",
              "optimization",
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>,
              stats.totalSheets,
            )}
          </div>

          {mainTab === "3d-view" && (
            <ThreeDViewer
              config={config}
              onSectionSelect={handleSectionSelect}
              ui={ui}
              panelColors={panelColors}
              selectedPanel={selectedPanel}
              onPanelSelect={handlePanelSelect}
              onPanelColorChange={handlePanelColorChange}
              onPanelColorReset={handlePanelColorReset}
            />
          )}
          {mainTab === "cutlist" && (
            <CutListTable parts={cutList} onExportExcel={downloadExcel} ui={ui} />
          )}
          {mainTab === "optimization" && (
            <SheetOptimizationView
              sheetLayout={sheetLayout}
              materialCost={materialCost}
              onDownloadNesting={downloadNestingSVG}
              onDownloadNestingPDF={downloadNestingPDF}
              ui={ui}
              sheetMaterials={sheetMaterials}
              onUpdateSheetMaterial={(name, patch) =>
                setSheetMaterials((prev) => ({
                  ...prev,
                  [name]: { ...prev[name], ...patch },
                }))
              }
              onResetSheetMaterials={() =>
                setSheetMaterials(getDefaultSheetMaterials())
              }
            />
          )}
          {mainTab === "hardware" && (
            <HardwareSchedule
              schedule={hardwareSchedule}
              totalCost={stats.hardwareCost}
              ui={ui}
            />
          )}
          {mainTab === "machining" && (
            <MachiningSchedule
              schedule={machiningSchedule}
              config={config}
              ui={ui}
            />
          )}
        </div>
      </div>

      {/* ── Selected section chip ── */}
      {selectedSection && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: ui.accent,
            color: "#fff",
            padding: "6px 12px",
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 1000,
          }}
        >
          Selected: {selectedSection.label} · {selectedSection.width} mm ·{" "}
          {selectedSection.type}
          <button
            onClick={() => setSelectedSection(null)}
            style={{
              marginLeft: 12,
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Save modal ── */}
      {saveModalOpen && (
        <SaveDesignModal
          initialName={designName}
          initialDescription={designDescription}
          error={saveError}
          isPending={isPending}
          onSave={handleSave}
          onClose={() => {
            setSaveModalOpen(false);
            setSaveError(null);
          }}
        />
      )}

      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={(e) => importConfigJSON(e.target.files?.[0])}
      />
    </div>
  );
}
