import React, { useState, useRef, useEffect } from "react";
import { PANEL_COLOR_PALETTE } from "../data/constants.js";

/**
 * PanelColorPicker
 *
 * Floating color picker overlay that appears when a panel is selected in the 3D view.
 * Shows a curated palette of wood/laminate colors, a custom hex input, and a reset button.
 */

const PALETTE = PANEL_COLOR_PALETTE;

function isLightColor(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

export default function PanelColorPicker({
  panelInfo,       // { panelId, panelType, panelLabel }
  currentColor,    // current hex color or null
  onColorChange,   // (panelId, hexColor) => void
  onReset,         // (panelId) => void
  onClose,         // () => void
  ui,              // theme ui object
}) {
  const [customHex, setCustomHex] = useState(currentColor || "#FFFFFF");
  const pickerRef = useRef(null);

  // Update custom hex when the currentColor prop changes
  useEffect(() => {
    if (currentColor) setCustomHex(currentColor);
  }, [currentColor]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    // Delay to avoid catching the click that opened the picker
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handlePaletteClick = (hex) => {
    setCustomHex(hex);
    onColorChange(panelInfo.panelId, hex);
  };

  const handleCustomChange = (hex) => {
    setCustomHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onColorChange(panelInfo.panelId, hex);
    }
  };

  const handleReset = () => {
    setCustomHex("#FFFFFF");
    onReset(panelInfo.panelId);
  };

  // Panel type icon
  const typeIcons = {
    carcass: "🪵",
    door: "🚪",
    shelf: "📐",
    drawerFace: "🗄️",
    back: "🔲",
  };

  return (
    <div
      ref={pickerRef}
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        width: 260,
        background: ui.bg + "ee",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1.5px solid ${ui.border}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08)",
        zIndex: 100,
        fontFamily: "inherit",
        animation: "panelPickerFadeIn 0.2s ease-out",
      }}
    >
      {/* Inline keyframes */}
      <style>{`
        @keyframes panelPickerFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 8,
              fontWeight: 600,
              color: ui.accent,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            {typeIcons[panelInfo.panelType] || "🎨"} PANEL COLOR
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: ui.text,
              lineHeight: 1.2,
            }}
          >
            {panelInfo.panelLabel}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: ui.muted,
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            padding: "2px 4px",
            borderRadius: 4,
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Color preview */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          padding: "8px 10px",
          borderRadius: 8,
          background: ui.inputBg,
          border: `1px solid ${ui.border}`,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: currentColor || "#FFFFFF",
            border: `2px solid ${ui.border}`,
            flexShrink: 0,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: ui.text }}>
            {currentColor
              ? PALETTE.find((p) => p.hex.toUpperCase() === currentColor.toUpperCase())?.name || "Custom"
              : "Default"}
          </div>
          <div style={{ fontSize: 9, color: ui.muted }}>
            {currentColor || "No custom color"}
          </div>
        </div>
      </div>

      {/* Palette grid */}
      <div
        style={{
          fontSize: 8,
          fontWeight: 600,
          color: ui.muted,
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        PALETTE
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {PALETTE.map((color) => {
          const isActive =
            currentColor &&
            currentColor.toUpperCase() === color.hex.toUpperCase();
          return (
            <button
              key={color.hex}
              onClick={() => handlePaletteClick(color.hex)}
              title={color.name}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 6,
                border: isActive
                  ? `2.5px solid ${ui.accent}`
                  : `1.5px solid ${ui.border}`,
                background: color.hex,
                cursor: "pointer",
                position: "relative",
                transition: "transform 0.12s, border-color 0.12s",
                transform: isActive ? "scale(1.1)" : "scale(1)",
                boxShadow: isActive
                  ? `0 0 0 2px ${ui.accent}40`
                  : "0 1px 3px rgba(0,0,0,0.08)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.target.style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.target.style.transform = "scale(1)";
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    fontSize: 12,
                    color: isLightColor(color.hex) ? "#333" : "#fff",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom color input */}
      <div
        style={{
          fontSize: 8,
          fontWeight: 600,
          color: ui.muted,
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        CUSTOM COLOR
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
        }}
      >
        <input
          type="color"
          value={customHex}
          onChange={(e) => handleCustomChange(e.target.value)}
          style={{
            width: 36,
            height: 30,
            padding: 0,
            border: `1.5px solid ${ui.border}`,
            borderRadius: 6,
            cursor: "pointer",
            background: "transparent",
          }}
        />
        <input
          type="text"
          value={customHex}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="#FFFFFF"
          maxLength={7}
          style={{
            flex: 1,
            padding: "5px 8px",
            borderRadius: 6,
            border: `1px solid ${ui.border}`,
            background: ui.inputBg,
            color: ui.text,
            fontFamily: "inherit",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        />
      </div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        style={{
          width: "100%",
          padding: "7px 12px",
          borderRadius: 8,
          fontSize: 10,
          cursor: "pointer",
          fontFamily: "inherit",
          fontWeight: 600,
          border: `1.5px solid ${ui.border}`,
          background: ui.inputBg,
          color: ui.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = "#ef4444";
          e.target.style.color = "#ef4444";
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = ui.border;
          e.target.style.color = ui.muted;
        }}
      >
        ↺ Reset to Default
      </button>
    </div>
  );
}
