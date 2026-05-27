import React, { useEffect, useRef, useState } from "react";
import { CabinetRenderer } from "../three/CabinetRenderer.js";
import PanelColorPicker from "./PanelColorPicker.jsx";

export default function ThreeDViewer({
  config,
  onSectionSelect,
  ui,
  panelColors,
  selectedPanel,
  onPanelSelect,
  onPanelColorChange,
  onPanelColorReset,
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const [viewMode, setViewMode] = useState("perspective");
  const [showDimensions, setShowDimensions] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [drawersOpen, setDrawersOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js renderer
    rendererRef.current = new CabinetRenderer(containerRef.current, config);

    // Listen for section selection events
    const handleSectionSelect = (event) => {
      if (onSectionSelect) {
        onSectionSelect(event.detail.section);
      }
    };
    containerRef.current.addEventListener(
      "sectionselected",
      handleSectionSelect,
    );

    // Listen for panel selection events
    const handlePanelSelect = (event) => {
      if (onPanelSelect) {
        onPanelSelect(event.detail);
      }
    };
    containerRef.current.addEventListener(
      "panelselected",
      handlePanelSelect,
    );

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener(
          "sectionselected",
          handleSectionSelect,
        );
        containerRef.current.removeEventListener(
          "panelselected",
          handlePanelSelect,
        );
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  // Update config when it changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateConfig(config);
      // buildCabinet resets all animation state — sync React state
      setDoorsOpen(false);
      setDrawersOpen(false);
      setExploded(false);
    }
  }, [config]);

  // NEW: Update exploded state in the renderer
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setExploded(exploded);
    }
  }, [exploded]);

  // NEW: Apply panel colors when they change
  useEffect(() => {
    if (rendererRef.current && panelColors) {
      rendererRef.current.applyPanelColors(panelColors);
    }
  }, [panelColors]);

  const handleViewChange = (mode) => {
    setViewMode(mode);
    if (!rendererRef.current) return;

    const { length: L, height: H, depth: D } = config.overall;
    const camera = rendererRef.current.camera;
    const controls = rendererRef.current.controls;
    const maxDim = Math.max(L, H, D);
    const distance = maxDim * 1.8;

    switch (mode) {
      case "front":
        camera.position.set(0, config.overall.height / 2, maxDim * 1.5);
        controls.target.set(0, H / 2, 0);
        break;
      case "side":
        camera.position.set(maxDim * 1.5, config.overall.height / 2, 0);
        controls.target.set(0, H / 2, 0);
        break;
      case "top":
        camera.position.set(0, maxDim * 2, 0);
        controls.target.set(0, 0, 0);
        break;
      case "perspective":
      default:
        camera.position.set(-distance * 0.4, H * 0.8, distance * 0.8);
        controls.target.set(0, H / 2, 0);
        break;
    }
    controls.update();
  };

  const handleScreenshot = () => {
    if (!rendererRef.current) return;
    const dataURL =
      rendererRef.current.renderer.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `cabinet-3d-${Date.now()}.png`;
    a.click();
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "600px",
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${ui.border}`,
        }}
      />

      {/* Control Panel Overlay */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: ui.bg,
          padding: 12,
          borderRadius: 10,
          border: `1px solid ${ui.border}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {/* View Mode Buttons */}
        <div
          style={{
            fontSize: 9,
            color: ui.muted,
            fontWeight: 600,
            marginBottom: 4,
            letterSpacing: 0.5,
          }}
        >
          CAMERA VIEW
        </div>
        {[
          ["Perspective", "perspective", "🔷"],
          ["Front", "front", "⬜"],
          ["Side", "side", "⬛"],
          ["Top", "top", "🔳"],
        ].map(([label, mode, icon]) => (
          <button
            key={mode}
            onClick={() => handleViewChange(mode)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              border: `1.5px solid ${viewMode === mode ? ui.accent : ui.border}`,
              background: viewMode === mode ? ui.accent : ui.inputBg,
              color: viewMode === mode ? "#fff" : ui.text,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}

        <div style={{ height: 1, background: ui.border, margin: "8px 0" }} />

        {/* Actions */}
        {/* Split Controls Container */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "8px",
            marginTop: "8px",
          }}
        >
          {/* 1. Toggle Doors Button */}
          <button
            onClick={() => {
              if (rendererRef.current) {
                rendererRef.current.toggleDoors();
                setDoorsOpen(rendererRef.current.isDoorsOpen);
              }
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              border: `1.5px solid ${ui.border}`,
              background: ui.inputBg,
              color: ui.text,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {doorsOpen ? "🚪 Close Doors" : "🚪 Open Doors"}
          </button>

          {/* 2. Toggle Drawers Button */}
          <button
            onClick={() => {
              if (rendererRef.current) {
                rendererRef.current.toggleDrawers();
                setDrawersOpen(rendererRef.current.isDrawersOpen);
              }
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              border: `1.5px solid ${ui.border}`,
              background: ui.inputBg,
              color: ui.text,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {drawersOpen ? "🗄️ Close Drawers" : "🗄️ Open Drawers"}
          </button>
        </div>

        <button
          onClick={() => {
            if (rendererRef.current) {
              rendererRef.current.printView();
            }
          }}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            border: `1.5px solid ${ui.border}`,
            background: ui.inputBg,
            color: ui.text,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🖨️ Print View
        </button>

        <button
          onClick={() => setExploded(!exploded)}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            border: `1.5px solid ${exploded ? ui.accent : ui.border}`,
            background: exploded ? ui.accent : ui.inputBg,
            color: exploded ? "#fff" : ui.text,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          💥 {exploded ? "Assembled" : "Exploded"}
        </button>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          background: ui.bg,
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid ${ui.border}`,
          fontSize: 9,
          color: ui.muted,
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, color: ui.text }}>
          Keyboard Shortcuts
        </div>
        <div>🖱️ Left drag: Rotate · Right drag: Pan · Scroll: Zoom</div>
        <div>
          <kbd>R</kbd> Reset view · <kbd>F</kbd> Front · <kbd>S</kbd> Side ·{" "}
          <kbd>T</kbd> Top · <kbd>A</kbd> Axes
        </div>
      </div>

      {/* Dimension Display */}
      {showDimensions && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: ui.bg,
            padding: 10,
            borderRadius: 8,
            border: `1px solid ${ui.border}`,
            fontSize: 10,
            color: ui.text,
            fontWeight: 600,
          }}
        >
          <div>
            {config.overall.length} × {config.overall.height} ×{" "}
            {config.overall.depth} mm
          </div>
          <div style={{ fontSize: 9, color: ui.muted, marginTop: 2 }}>
            {config.sections.length} sections · {config.hardware.joinery}{" "}
            joinery
          </div>
        </div>
      )}

      {/* Panel Color Picker Overlay */}
      {selectedPanel && (
        <PanelColorPicker
          panelInfo={selectedPanel}
          currentColor={panelColors?.[selectedPanel.panelId] || null}
          onColorChange={onPanelColorChange}
          onReset={onPanelColorReset}
          onClose={() => onPanelSelect(null)}
          ui={ui}
        />
      )}
    </div>
  );
}
