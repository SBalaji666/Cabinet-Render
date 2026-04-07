// src/components/SaveDesignModal.jsx
// Ported from the Next.js project's SaveDesignModal.tsx.
// Shown when the user clicks "Save" or "Update" in the header.

import { useState, useEffect } from "react";

const FONT = "'IBM Plex Mono', 'Courier New', monospace";

export default function SaveDesignModal({
  initialName,
  initialDescription = "",
  error,
  isPending,
  onSave,
  onClose,
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  // Re-sync if the parent changes initialName (e.g. loading a different design)
  useEffect(() => setName(initialName), [initialName]);
  useEffect(() => setDescription(initialDescription), [initialDescription]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "8px 10px",
    borderRadius: 7,
    border: "1px solid #d1d9e6",
    fontFamily: FONT,
    fontSize: 12,
    marginTop: 4,
    boxSizing: "border-box",
    color: "#1c2b3a",
    background: "#f8fafc",
    outline: "none",
  };

  return (
    // Backdrop — click outside to close
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      {/* Panel — stop click propagating to backdrop */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 28,
          width: 420,
          maxWidth: "90vw",
          fontFamily: FONT,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h2
          style={{
            margin: "0 0 20px",
            fontSize: 16,
            fontWeight: 600,
            color: "#1c2b3a",
          }}
        >
          Save design
        </h2>

        <label
          style={{
            fontSize: 11,
            color: "#6b7a99",
            display: "block",
            marginBottom: 14,
          }}
        >
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoFocus
            style={inputStyle}
            placeholder="e.g. Kitchen island unit"
          />
        </label>

        <label
          style={{
            fontSize: 11,
            color: "#6b7a99",
            display: "block",
            marginBottom: 20,
          }}
        >
          Description <span style={{ opacity: 0.6 }}>(optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Notes about this design…"
          />
        </label>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "8px 12px",
              background: "#fee2e2",
              borderRadius: 6,
              fontSize: 11,
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: 7,
              border: "1px solid #d1d9e6",
              background: "transparent",
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 11,
              color: "#6b7a99",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave(name.trim() || "Untitled design", description.trim())
            }
            disabled={isPending || !name.trim()}
            style={{
              padding: "9px 20px",
              borderRadius: 7,
              border: "none",
              background: isPending || !name.trim() ? "#93c5fd" : "#2563eb",
              color: "#fff",
              cursor: isPending ? "wait" : "pointer",
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
