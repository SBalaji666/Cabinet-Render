import { SHEET_MATERIALS } from "../data/constants.js";

/**
 * 2D Bin Packing using Guillotine algorithm with grain constraint support
 * This is a production-grade implementation for optimizing material usage
 */

class Rectangle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get area() {
    return this.width * this.height;
  }

  fits(part, allowRotation = true) {
    // Check if part fits without rotation
    if (part.length <= this.width && part.width <= this.height) {
      return { fits: true, rotated: false };
    }
    // Check if part fits with 90° rotation (only if grain allows)
    if (
      allowRotation &&
      !part.grainConstrained &&
      part.width <= this.width &&
      part.length <= this.height
    ) {
      return { fits: true, rotated: true };
    }
    return { fits: false, rotated: false };
  }
}

class PlacedPart {
  constructor(part, x, y, rotated, sheetIndex) {
    this.part = part;
    this.x = x;
    this.y = y;
    this.rotated = rotated;
    this.sheetIndex = sheetIndex;
    this.width = rotated ? part.width : part.length;
    this.height = rotated ? part.length : part.width;
  }
}

class Sheet {
  constructor(material, width, height, index) {
    this.material = material;
    this.width = width;
    this.height = height;
    this.index = index;
    this.freeRectangles = [new Rectangle(0, 0, width, height)];
    this.usedRectangles = [];
    this.placedParts = [];
  }

  get efficiency() {
    const usedArea = this.placedParts.reduce(
      (sum, p) => sum + p.width * p.height,
      0,
    );
    const totalArea = this.width * this.height;
    return totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
  }

  get wasteArea() {
    const totalArea = this.width * this.height;
    const usedArea = this.placedParts.reduce(
      (sum, p) => sum + p.width * p.height,
      0,
    );
    return totalArea - usedArea;
  }

  /**
   * Try to place a part on this sheet using guillotine algorithm
   */
  place(part, sawKerf = 3) {
    // Sort free rectangles by area (smallest first for tighter packing)
    const sorted = [...this.freeRectangles].sort((a, b) => a.area - b.area);

    for (let i = 0; i < sorted.length; i++) {
      const rect = sorted[i];
      const grainAllowsRotation =
        part.grain !== "length" && part.grain !== "width";
      const fitResult = rect.fits(part, grainAllowsRotation);

      if (fitResult.fits) {
        // Place the part
        const placed = new PlacedPart(
          part,
          rect.x,
          rect.y,
          fitResult.rotated,
          this.index,
        );
        this.placedParts.push(placed);

        // Remove the used rectangle
        const rectIndex = this.freeRectangles.indexOf(rect);
        this.freeRectangles.splice(rectIndex, 1);

        // Add used rectangle
        this.usedRectangles.push(
          new Rectangle(rect.x, rect.y, placed.width, placed.height),
        );

        // Split remaining space (guillotine cut)
        // Horizontal split
        if (rect.height - placed.height - sawKerf > 0) {
          this.freeRectangles.push(
            new Rectangle(
              rect.x,
              rect.y + placed.height + sawKerf,
              rect.width,
              rect.height - placed.height - sawKerf,
            ),
          );
        }

        // Vertical split
        if (rect.width - placed.width - sawKerf > 0) {
          this.freeRectangles.push(
            new Rectangle(
              rect.x + placed.width + sawKerf,
              rect.y,
              rect.width - placed.width - sawKerf,
              placed.height,
            ),
          );
        }

        return true;
      }
    }

    return false; // Could not place part on this sheet
  }
}

/**
 * Strip the trailing thickness token (e.g. "Back Panel 9mm" -> "Back Panel")
 * so materials can be matched by their base category.
 */
function baseMaterialName(material) {
  return material.replace(/\s*\d+(?:\.\d+)?\s*mm\s*$/i, "").trim();
}

/**
 * Resolve the catalog sheet spec for a cut-list material string.
 *
 * Cut-list material keys embed the *configured* part thickness (e.g.
 * "Back Panel 6mm"), but the catalog is keyed by its own *stock* thickness
 * (e.g. "Back Panel 9mm"). Prefer an exact match, then fall back to the entry
 * whose base category matches — so changing a thickness (or the default
 * back-panel mismatch) never silently drops parts from the layout.
 */
function resolveSheetSpec(material, lookup) {
  if (lookup[material]) return lookup[material];
  const base = baseMaterialName(material);
  const matchKey = Object.keys(lookup).find(
    (k) => baseMaterialName(k) === base,
  );
  return matchKey ? lookup[matchKey] : null;
}

/**
 * Optimize part placement across multiple sheets
 */
export function optimizeSheetLayout(parts, sawKerf = 3, sheetMaterials = null) {
  const sheets_lookup = sheetMaterials || SHEET_MATERIALS;
  // Group parts by material
  const partsByMaterial = {};
  parts.forEach((part) => {
    if (!partsByMaterial[part.material]) {
      partsByMaterial[part.material] = [];
    }
    // Expand parts based on quantity
    for (let i = 0; i < part.qty; i++) {
      partsByMaterial[part.material].push({
        ...part,
        originalId: part.id,
        instanceNum: i + 1,
        grainConstrained: part.grain === "length" || part.grain === "width",
      });
    }
  });

  const results = {};

  Object.entries(partsByMaterial).forEach(([material, materialParts]) => {
    const sheetSpec = resolveSheetSpec(material, sheets_lookup);
    if (!sheetSpec) {
      console.warn(`No sheet specification found for material: ${material}`);
      return;
    }

    const sheets = [];
    let currentSheetIndex = 0;

    // Sort parts by area (largest first) for better packing
    const sortedParts = [...materialParts].sort((a, b) => {
      const areaA = a.length * a.width;
      const areaB = b.length * b.width;
      return areaB - areaA;
    });

    // Try to place each part
    sortedParts.forEach((part) => {
      let placed = false;

      // Try existing sheets first
      for (const sheet of sheets) {
        if (sheet.place(part, sawKerf)) {
          placed = true;
          break;
        }
      }

      // If not placed, create a new sheet
      if (!placed) {
        const newSheet = new Sheet(
          material,
          sheetSpec.width,
          sheetSpec.height,
          currentSheetIndex++,
        );
        sheets.push(newSheet);

        if (!newSheet.place(part, sawKerf)) {
          console.error(
            `Part ${part.part} (${part.length}×${part.width}) is too large for sheet!`,
          );
        }
      }
    });

    // Area-weighted efficiency: weight each sheet by used area so a nearly-empty
    // last sheet does not disproportionately drag down the average.
    const totalSheetArea = sheets.length * sheetSpec.width * sheetSpec.height;
    const totalUsedArea = sheets.reduce(
      (sum, s) =>
        sum + s.placedParts.reduce((a, p) => a + p.width * p.height, 0),
      0,
    );
    const weightedEfficiency =
      totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0;

    results[material] = {
      sheets,
      totalSheets: sheets.length,
      totalParts: materialParts.length,
      averageEfficiency: Math.round(weightedEfficiency * 10) / 10,
      totalCost: sheets.length * sheetSpec.cost,
      sheetSpec,
    };
  });

  return results;
}

/**
 * Generate a visual representation of the nesting for export
 */
export function generateNestingSVG(sheetLayout, material) {
  const layout = sheetLayout[material];
  if (!layout) return null;

  const scale = 0.15; // Scale down for display (1mm = 0.15px)
  const margin = 20;
  const sheetSpacing = 40;

  const svgWidth = layout.sheetSpec.width * scale + margin * 2;
  const svgHeight =
    layout.sheets.length * (layout.sheetSpec.height * scale + sheetSpacing) +
    margin * 2;

  let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs>
    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
    </pattern>
  </defs>`;

  layout.sheets.forEach((sheet, sheetIdx) => {
    const offsetY =
      margin + sheetIdx * (layout.sheetSpec.height * scale + sheetSpacing);

    // Draw sheet background
    svg += `<rect x="${margin}" y="${offsetY}" 
      width="${sheet.width * scale}" 
      height="${sheet.height * scale}" 
      fill="url(#grid)" 
      stroke="#333" 
      stroke-width="2"/>`;

    // Draw sheet label
    svg += `<text x="${margin + 10}" y="${offsetY + 20}" 
      font-family="monospace" font-size="12" fill="#333">
      Sheet ${sheetIdx + 1} — ${Math.round(sheet.efficiency)}% efficient
    </text>`;

    // Draw each placed part
    sheet.placedParts.forEach((placed, idx) => {
      const x = margin + placed.x * scale;
      const y = offsetY + placed.y * scale;
      const w = placed.width * scale;
      const h = placed.height * scale;

      // Part rectangle
      const hue = (idx * 40) % 360;
      svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
        fill="hsla(${hue}, 70%, 60%, 0.3)" 
        stroke="hsla(${hue}, 70%, 40%, 1)" 
        stroke-width="1.5"/>`;

      // Part label
      const labelX = x + w / 2;
      const labelY = y + h / 2;
      svg += `<text x="${labelX}" y="${labelY}" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        font-family="monospace" 
        font-size="10" 
        fill="#000">
        ${placed.part.part}${placed.part.instanceNum > 1 ? ` #${placed.part.instanceNum}` : ""}
      </text>`;
      svg += `<text x="${labelX}" y="${labelY + 12}" 
        text-anchor="middle" 
        font-family="monospace" 
        font-size="9" 
        fill="#555">
        ${Math.round(placed.part.length)}×${Math.round(placed.part.width)}
      </text>`;

      // Rotation indicator
      if (placed.rotated) {
        svg += `<text x="${x + 5}" y="${y + 12}" 
          font-family="monospace" 
          font-size="10" 
          fill="#d00" 
          font-weight="bold">⤾</text>`;
      }
    });
  });

  svg += "</svg>";
  return svg;
}

/**
 * Calculate total material cost with optimization
 */
export function calculateMaterialCost(sheetLayout) {
  let totalCost = 0;
  const breakdown = [];

  Object.entries(sheetLayout).forEach(([material, layout]) => {
    const cost = layout.totalCost;
    totalCost += cost;
    breakdown.push({
      material,
      sheets: layout.totalSheets,
      efficiency: Math.round(layout.averageEfficiency),
      cost,
      costPerSheet: layout.sheetSpec.cost,
    });
  });

  return { totalCost, breakdown };
}
