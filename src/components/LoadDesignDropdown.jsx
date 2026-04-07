// src/components/LoadDesignDropdown.jsx
// Renders a "Load saved…" select in the header.
// On selection, navigates to /designer/:id via React Router.

import { useNavigate } from "react-router-dom";

const FONT = "'IBM Plex Mono', 'Courier New', monospace";

export default function LoadDesignDropdown({ designs = [], ui }) {
  const navigate = useNavigate();

  if (designs.length === 0) return null;

  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) navigate(`/designer/${e.target.value}`);
      }}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        fontFamily: FONT,
        fontSize: 11,
        background: ui.inputBg,
        color: ui.text,
        border: `1px solid ${ui.border}`,
        cursor: "pointer",
      }}
    >
      <option value="" disabled>
        Load saved…
      </option>
      {designs.map((d) => (
        <option key={d._id} value={d._id}>
          {d.name}
          {d.updatedAt
            ? ` — ${new Date(d.updatedAt).toLocaleDateString()}`
            : ""}
        </option>
      ))}
    </select>
  );
}
