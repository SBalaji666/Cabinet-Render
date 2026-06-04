import React, { useState } from 'react';
import { MATERIAL_COLORS } from '../data/constants.js';
import SheetMaterialEditor from './SheetMaterialEditor.jsx';

export default function SheetOptimizationView({ sheetLayout, materialCost, onDownloadNesting, ui, sheetMaterials, onUpdateSheetMaterial, onResetSheetMaterials }) {
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  const materials = Object.keys(sheetLayout);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, color: ui.accent, fontWeight: 600, letterSpacing: 1 }}>
            SHEET NESTING OPTIMIZATION
          </h3>
          <div style={{ fontSize: 10, color: ui.muted, marginTop: 3 }}>
            2D bin-packing with grain constraints · Guillotine algorithm
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: ui.muted, padding: '6px 12px', background: ui.inputBg, borderRadius: 6, border: `1px solid ${ui.border}` }}>
            Total: {materialCost.breakdown.reduce((a, b) => a + b.sheets, 0)} sheets
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: ui.accent, padding: '6px 12px', background: ui.panel, borderRadius: 6, border: `1px solid ${ui.accent}` }}>
            £{Math.round(materialCost.totalCost)}
          </div>
        </div>
      </div>

      {/* Sheet dimensions editor */}
      {sheetMaterials && (
        <SheetMaterialEditor
          sheetMaterials={sheetMaterials}
          onUpdate={onUpdateSheetMaterial}
          onReset={onResetSheetMaterials}
          ui={ui}
        />
      )}

      {/* Material selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {materials.map(mat => {
          const layout = sheetLayout[mat];
          const matDot = (
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: 2,
              background: MATERIAL_COLORS[mat] || '#aaa',
              marginRight: 6,
            }} />
          );
          return (
            <button
              key={mat}
              onClick={() => setSelectedMaterial(mat)}
              style={{
                padding: '8px 14px',
                borderRadius: 7,
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: `1.5px solid ${selectedMaterial === mat ? ui.accent : ui.border}`,
                background: selectedMaterial === mat ? ui.accent : ui.inputBg,
                color: selectedMaterial === mat ? '#fff' : ui.text,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
            >
              {matDot}
              <div>
                <div style={{ fontWeight: 600 }}>{mat.replace(/ \d+mm/g, '')}</div>
                <div style={{ fontSize: 9, opacity: 0.8 }}>
                  {layout.totalSheets} sheets · {Math.round(layout.averageEfficiency)}% eff
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sheet breakdown table */}
      <div style={{ flex: 1, overflowY: 'auto', borderRadius: 10, border: `1px solid ${ui.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'inherit' }}>
          <thead style={{ position: 'sticky', top: 0, background: ui.panel, zIndex: 2 }}>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Material</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Sheet Size</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Parts</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Sheets</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Efficiency</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Cost/Sheet</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Total Cost</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Export</th>
            </tr>
          </thead>
          <tbody>
            {materialCost.breakdown.map((item, i) => {
              const layout = sheetLayout[item.material];
              const matDot = (
                <span style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: MATERIAL_COLORS[item.material] || '#aaa',
                  marginRight: 6,
                }} />
              );
              return (
                <tr
                  key={item.material}
                  style={{ background: i % 2 === 0 ? ui.bg : ui.panel }}
                  onMouseEnter={e => e.currentTarget.style.background = ui.inputBg}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? ui.bg : ui.panel}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {matDot}
                      <span style={{ fontWeight: 600, color: ui.text }}>{item.material}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: ui.muted }}>
                    {layout.sheetSpec.width}×{layout.sheetSpec.height}mm
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: ui.text, fontWeight: 600 }}>
                    {layout.totalParts}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: ui.accent }}>
                      {item.sheets}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <div style={{ width: 60, height: 6, background: ui.inputBg, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${item.efficiency}%`,
                          height: '100%',
                          background: item.efficiency > 80 ? '#16a34a' : item.efficiency > 65 ? '#d97706' : '#ef4444',
                          borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: ui.text }}>{item.efficiency}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: ui.muted }}>
                    £{item.costPerSheet}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: ui.accent }}>
                    £{item.cost}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => onDownloadNesting(item.material)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 5,
                        fontSize: 10,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        border: `1px solid ${ui.border}`,
                        background: ui.inputBg,
                        color: ui.text,
                        fontWeight: 600,
                      }}
                    >
                      SVG
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected material details */}
      {selectedMaterial && (
        <div style={{ padding: 16, background: ui.panel, borderRadius: 10, border: `1px solid ${ui.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: ui.accent, marginBottom: 10 }}>
            {selectedMaterial} — Sheet Details
          </div>
          {sheetLayout[selectedMaterial].sheets.map((sheet, idx) => (
            <div key={idx} style={{ marginBottom: 8, padding: 8, background: ui.bg, borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: ui.text }}>
                  Sheet {idx + 1}
                </span>
                <span style={{ fontSize: 10, color: ui.muted }}>
                  {sheet.placedParts.length} parts · {Math.round(sheet.efficiency)}% efficient · {Math.round(sheet.wasteArea / 1e6 * 100) / 100}m² waste
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
