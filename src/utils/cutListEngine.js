import {
  JOINERY_TYPES,
  DRAWER_SLIDES,
  HINGES,
  SHELF_SYSTEMS,
  SKIRT_SYSTEMS,
  CONSTRUCTION_TYPES,
  DOOR_OVERLAY_TYPES,
} from "../data/constants.js";
import {
  computeMergedSections,
  countVisibleDividers,
  resolveDoorWidths,
} from "./mergedSections.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hingeLayout(doorHeight, hingeFn) {
  const count = hingeFn(doorHeight);
  const positions = [];
  if (count === 1) {
    positions.push(doorHeight / 2);
  } else {
    positions.push(100);
    positions.push(doorHeight - 100);
    for (let i = 1; i < count - 1; i++) {
      positions.push(Math.round(100 + (i * (doorHeight - 200)) / (count - 1)));
    }
    positions.sort((a, b) => a - b);
  }
  return { count, positions };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export function validateConfig(config) {
  const { overall, materials, sections: rawSections, hardware } = config;
  const warnings = [];

  // Validate against the MERGED view — that is what gets built
  const sections = computeMergedSections(rawSections);

  const slide = DRAWER_SLIDES[hardware.drawerSlide];
  const skirt = SKIRT_SYSTEMS[hardware.skirt || hardware.plinth] || SKIRT_SYSTEMS.none;
  const ct = materials.carcass;

  // Box height is exactly the configured height (skirt is extra, not subtracted)
  const boxHeight = overall.height;

  if (overall.depth < 200)
    warnings.push("Cabinet depth < 200 mm — too shallow for any drawer slide.");
  if (boxHeight < ct * 4)
    warnings.push("Cabinet height is too small for carcass panels.");
  if (overall.length < ct * 2 + 50)
    warnings.push("Cabinet length is too narrow.");

  const seen = new Set();
  sections.forEach((s) => {
    if (seen.has(s.label))
      warnings.push(
        `Duplicate section label "${s.label}" — labels must be unique.`,
      );
    seen.add(s.label);
  });

  sections.forEach((s) => {
    if (s.width < 50) warnings.push(`Section ${s.label}: width < 50 mm.`);

    if (s.drawers.count > 0 && slide) {
      const bt = materials.back;
      const carcassDepth = overall.depth - bt - materials.door - 1;
      const drawerBoxDepth = clamp(
        carcassDepth - 10,
        slide.minDepth,
        slide.maxDepth,
      );
      if (drawerBoxDepth < slide.minDepth)
        warnings.push(
          `Section ${s.label}: Cabinet depth too small for ${slide.brand} ${slide.model}.`,
        );

      const minH = slide.heights[0];
      const maxH = slide.heights[slide.heights.length - 1];
      const heights = s.drawers.heights || [];

      let totalStack = 0;
      heights.slice(0, s.drawers.count).forEach((h, i) => {
        totalStack += h;
        if (h < minH || h > maxH) {
          warnings.push(
            `Section ${s.label}: Drawer ${i + 1} height ${h} mm outside compatible range (${minH}–${maxH} mm).`,
          );
        }
      });

      const internalHeight = boxHeight - ct * 2;
      let requiredStructuralHeight = totalStack;
      if (s.drawers.placement === "custom") requiredStructuralHeight += ct * 2;
      else if (
        s.drawers.placement === "top" ||
        s.drawers.placement === "bottom"
      )
        requiredStructuralHeight += ct;

      if (requiredStructuralHeight > internalHeight)
        warnings.push(
          `Section ${s.label}: Total drawer stack + dividers (${requiredStructuralHeight} mm) exceeds internal height (${internalHeight} mm).`,
        );
    }
  });

  return warnings;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CUT LIST GENERATOR (Top-Capped, Plant-On Back, Skirt Separated)
// ─────────────────────────────────────────────────────────────────────────────

export function generateCutList(config) {
  const {
    overall,
    materials,
    tolerances,
    sections: rawSections,
    hardware,
    panelColors,
  } = config;
  const { length: L, height: H, depth: D } = overall;
  const {
    carcass: ct,
    back: bt,
    shelf: sht,
    door: dt,
    drawerSide: dst,
    drawerBottom: dbt,
  } = materials;
  const { edgeBanding: ebt, doorGap: dg, sawKerf: sk, offset } = tolerances;

  const joinery =
    JOINERY_TYPES[hardware.joinery?.toUpperCase()] || JOINERY_TYPES.BUTT;
  const skirt = SKIRT_SYSTEMS[hardware.skirt || hardware.plinth] || SKIRT_SYSTEMS.none;
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem] || SHELF_SYSTEMS.fixed;
  const doorOverlay =
    DOOR_OVERLAY_TYPES[hardware.doorOverlay] || DOOR_OVERLAY_TYPES.full;
  const construction =
    CONSTRUCTION_TYPES[hardware.construction] || CONSTRUCTION_TYPES.assembled;

  const parts = [];
  let partNum = 1;
  const pc = panelColors || {};
  const add = (part) => {
    const entry = { ...part, id: partNum++ };
    // Auto-inject panel color if a panelId is provided and a color is set
    if (entry.panelId && pc[entry.panelId]) {
      entry.color = pc[entry.panelId];
    }
    parts.push(entry);
  };

  // ── Merge adjacent sections that share a hidden divider ───────────────────
  // All part dimensions, counts, and spacing are calculated from the MERGED
  // layout so the cut list always matches exactly what gets built.
  const sections = computeMergedSections(rawSections);
  const dividerCount = sections.length - 1; // only real (visible) dividers

  // ── HEIGHT & DEPTH CALCULATIONS ──
  // Skirt is extra. The cabinet box itself is exactly H.
  const skirtHeight = skirt.height;
  const boxHeight = H;
  const internalHeight = boxHeight - ct * 2;

  // Carcass Depth (Overall Depth minus back, door, and a 1mm bumper gap)
  const bumperGap = 1;
  const carcassDepth =
    doorOverlay.id !== "inset" ? D - bt - dt - bumperGap : D - bt;

  // ── 1. SKIRT ──
  if (skirtHeight > 0) {
    add({
      part: "Skirt Front Rail",
      section: "Base",
      material: `Carcass ${ct}mm`,
      qty: 1,
      length: L - ct * 2, // fits between the two full-height side panels
      width: skirtHeight,
      thickness: ct,
      grain: "length",
      edgeBand: "top edge",
      note: `${skirtHeight} mm toe-kick rail, ${skirt.setback} mm setback. Sits between side panels.`,
      panelId: "skirt-front",
    });

    // Skirt side rails intentionally omitted.
    // The full-height side panels (below) enclose the skirt zone completely.
  }

  // ── 2. CARCASS ──

  // Top Panel — full width, caps both side panels
  add({
    part: "Top Panel",
    section: "Carcass",
    material: `Carcass ${ct}mm`,
    qty: 1,
    length: L,
    width: carcassDepth,
    thickness: ct,
    grain: "length",
    edgeBand: "front edge, left & right ends",
    note: "Full-width top panel — caps both side panels",
    machining: joinery.requiresBoring
      ? "Dowel/cam holes on underside at joint positions"
      : "None",
    panelId: "top-panel",
  });

  add({
    part: "Bottom Panel",
    section: "Carcass",
    material: `Carcass ${ct}mm`,
    qty: 1,
    length: L - ct * 2,
    width: carcassDepth,
    thickness: ct,
    grain: "length",
    edgeBand: "front edge",
    note: "Sits between side panels, at top of skirt zone",
    machining: joinery.requiresBoring
      ? "Dowel/cam holes on topside at joint positions"
      : "None",
    panelId: "bottom-panel",
  });

  const fullSideHeight = skirtHeight + boxHeight - ct;
  ["Left Side Panel", "Right Side Panel"].forEach((side) => {
    add({
      part: side,
      section: "Carcass",
      material: `Carcass ${ct}mm`,
      qty: 1,
      length: fullSideHeight, // FIX: was `boxHeight - ct`, now includes skirt
      width: carcassDepth,
      thickness: ct,
      grain: "height",
      edgeBand: "front edge",
      note: `${side} — full height including skirt zone (${skirtHeight} mm skirt + ${boxHeight - ct} mm box). Sits under top panel.`,
      machining:
        joinery.id === "dado"
          ? "Dado grooves for dividers & fixed shelves"
          : joinery.requiresBoring
            ? `Boring for ${joinery.name}`
            : "None",
      panelId: side === "Left Side Panel" ? "left-side" : "right-side",
    });
  });

  add({
    part: "Back Panel",
    section: "Carcass",
    material: `Back Panel ${bt}mm`,
    qty: 1,
    length: boxHeight,
    width: L,
    thickness: bt,
    grain: "height",
    edgeBand: "none",
    note: "Plant-on back — fits flush over entire outside rear of carcass box",
    panelId: "back-panel",
  });

  // ── 3. VERTICAL DIVIDERS ──
  if (dividerCount > 0) {
    add({
      part: "Vertical Divider",
      section: "Carcass",
      material: `Carcass ${ct}mm`,
      qty: dividerCount,
      length: internalHeight, // Sits on bottom panel, under top panel
      width: carcassDepth,
      thickness: ct,
      grain: "height",
      edgeBand: "front edge",
      note: `${dividerCount} physical divider${dividerCount !== 1 ? "s" : ""} — hidden dividers are merged; only structural walls listed`,
      machining: joinery.requiresBoring
        ? `Boring for ${joinery.name}`
        : joinery.id === "dado"
          ? "Sits in dado groove"
          : "Butt joint — glue & screw",
      // Note: divider panelIds are section-specific, handled below in section parts
    });
  }

  // ── 4. SECTION PARTS ──
  const totalInternalWidth = L - ct * 2 - dividerCount * ct;
  const totalW = sections.reduce((a, s) => a + s.width, 0) || 1;

  // Distribute exact dimensions properly
  const normSections = sections.map((s) => {
    const ratio = s.width / totalW;
    return {
      ...s,
      _interiorWidth: Math.round(ratio * totalInternalWidth),
      _exteriorWidth: Math.round(ratio * L),
    };
  });

  // Fix rounding errors so parts match total width perfectly
  const sumInt = normSections.reduce((sum, s) => sum + s._interiorWidth, 0);
  const sumExt = normSections.reduce((sum, s) => sum + s._exteriorWidth, 0);
  if (normSections.length > 0) {
    normSections[normSections.length - 1]._interiorWidth +=
      totalInternalWidth - sumInt;
    normSections[normSections.length - 1]._exteriorWidth += L - sumExt;
  }

  const gapPerSide = doorOverlay.gapPerSide || 1;

  normSections.forEach((section) => {
    const sw = section._exteriorWidth;
    const interiorWidth = section._interiorWidth;
    const interiorDepth = carcassDepth;

    // ── DOORS & FIXED DIVIDERS ──
    if (section.type === "closed") {
      const hinge = HINGES[hardware.hinge] || HINGES["blum-clip-top-110"];
      const drawerCount = section.drawers?.count || 0;
      const placement = section.drawers?.placement || "bottom";
      const isInternal = section.drawers?.isInternal || false;

      // Resolve individual door leaves — handles single door, double-door pair,
      // and any multi-section merge with independent door widths.
      const doorLeaves = resolveDoorWidths(
        section,
        interiorWidth,
        sw,
        doorOverlay,
        gapPerSide,
      );

      // ── Helper: add one door leaf at a given height ──────────────────────
      const addDoorLeaf = (leaf, doorHeight, label) => {
        const leafDoorW = leaf._resolvedDoorW;
        if (leafDoorW < 10 || doorHeight < 50) return;

        const { count: hingeCount } = hingeLayout(
          doorHeight,
          hinge.hingesPerDoor,
        );
        const pairNote = leaf.isDouble
          ? ` | Double-door pair — ${leaf.label} leaf (${leaf.swing}-swing)`
          : leaf.isSingleOverride
            ? ` | Single shared door`
            : "";

        add({
          part: "Door Panel",
          section: section.label,
          material: `Door ${dt}mm`,
          qty: 1,
          length: Math.round(doorHeight),
          width: Math.round(leafDoorW),
          thickness: dt,
          grain: "height",
          edgeBand: "all 4 edges",
          note: `${leaf.label} — ${label}.${pairNote} Pre-band: ${Math.round(doorHeight)}×${Math.round(leafDoorW)} mm. Post-band: ${Math.round(doorHeight + ebt * 2)}×${Math.round(leafDoorW + ebt * 2)} mm`,
          machining: `Hinge cup: ⌀${hinge.cupDiameter} mm × ${hinge.cupDepth} mm deep, ${hinge.boringDistance} mm from hinge edge. 100 mm from top/bottom (Blum std).`,
          hardware: `${hinge.brand} ${hinge.model} × ${hingeCount} pcs`,
        });
      };

      // addDoor emits all leaves for a given span height
      const addDoor = (doorHeight, label) => {
        doorLeaves.forEach((leaf) => addDoorLeaf(leaf, doorHeight, label));
      };

      // ── CASE 1: Internal drawers → full-height door always ───────────────
      if (isInternal && drawerCount > 0) {
        const doorHeight =
          doorOverlay.id === "inset"
            ? internalHeight - gapPerSide * 2
            : boxHeight;
        addDoor(
          doorHeight,
          `${doorOverlay.name} door (internal drawers behind)`,
        );
      }

      // ── CASE 2: External drawers — placement determines split ────────────
      else if (!isInternal && drawerCount > 0) {
        const drawerHeights = section.drawers?.heights || [];
        const totalDrawerStack = drawerHeights
          .slice(0, drawerCount)
          .reduce((sum, h) => sum + (h || 120), 0);

        if (placement === "full") {
          // No door — drawers fill entire section front
        } else if (placement === "bottom") {
          const doorHeight =
            doorOverlay.id === "inset"
              ? internalHeight - totalDrawerStack - gapPerSide * 2
              : boxHeight - totalDrawerStack;
          if (doorHeight > 50) {
            addDoor(doorHeight, `${doorOverlay.name} door above drawer bank`);
          }
        } else if (placement === "top") {
          const doorHeight =
            doorOverlay.id === "inset"
              ? internalHeight - totalDrawerStack - gapPerSide * 2
              : boxHeight - totalDrawerStack;
          if (doorHeight > 50) {
            addDoor(doorHeight, `${doorOverlay.name} door below drawer bank`);
          }
        } else if (placement === "custom") {
          const isFromTop = section.drawers?.customFrom === "top";
          const percentage = (section.drawers?.customPercentage ?? 20) / 100;
          const availableH = internalHeight - totalDrawerStack - ct * 2;
          let offsetMm = Math.round(availableH * percentage);
          offsetMm = Math.max(0, Math.min(offsetMm, availableH));

          let topCavityH, bottomCavityH;
          if (isFromTop) {
            topCavityH = offsetMm;
            bottomCavityH = availableH - topCavityH;
          } else {
            bottomCavityH = offsetMm;
            topCavityH = availableH - bottomCavityH;
          }

          const calcCustomDoorHeight = (cavityH, coversTop, coversBot) => {
            let h = cavityH;
            if (doorOverlay.id !== "inset") {
              if (coversTop) h += ct;
              if (coversBot) h += ct;
            }
            return h - gapPerSide * 2;
          };

          const topDoorH = calcCustomDoorHeight(topCavityH, true, false);
          addDoor(topDoorH, `${doorOverlay.name} top door (above drawer bank)`);

          const bottomDoorH = calcCustomDoorHeight(bottomCavityH, false, true);
          addDoor(
            bottomDoorH,
            `${doorOverlay.name} bottom door (below drawer bank)`,
          );
        }
      }

      // ── CASE 3: No drawers → standard full-height door ───────────────────
      else {
        const doorHeight =
          doorOverlay.id === "inset"
            ? internalHeight - gapPerSide * 2
            : boxHeight;
        addDoor(doorHeight, `${doorOverlay.name} door`);
      }
    }

    // ── SHELVES ──
    if (section.shelves > 0) {
      // const shelfWidth =
      //   interiorWidth - (shelfSys.clearance || 0) * 2 - ebt * 2;
      // const shelfDepth = interiorDepth - 10 - ebt; // 10mm setback
      const shelfWidth = interiorWidth;
      const shelfDepth = interiorDepth - offset;

      add({
        part: "Shelf",
        section: section.label,
        material: `Shelf ${sht}mm`,
        qty: section.shelves,
        length: shelfWidth,
        width: shelfDepth,
        thickness: sht,
        grain: "width",
        edgeBand: "front edge",
        note: `${section.label} — ${shelfSys.adjustable ? "adjustable" : "fixed"} shelf × ${section.shelves}`,
        machining:
          shelfSys.id === "fixed"
            ? "Dado into sides or screwed from outside"
            : "None",
        hardware: shelfSys.adjustable
          ? `${shelfSys.name} × ${shelfSys.pinsPerShelf} per shelf`
          : "None",
      });
    }

    // ── DRAWERS ──
    const drawerCount = section.drawers?.count || 0;
    if (drawerCount > 0) {
      const slide =
        DRAWER_SLIDES[hardware.drawerSlide] || DRAWER_SLIDES["blum-tandem-550"];
      const placement = section.drawers.placement || "bottom";
      const isInternal = section.drawers.isInternal || false;
      const drawerHeights = section.drawers.heights || [];

      // Loop through EACH drawer to generate precise cut sizes based on its individual height
      for (let i = 0; i < drawerCount; i++) {
        const drawerHeight = drawerHeights[i] || 120;

        const drawerBoxOuterWidth = interiorWidth - slide.clearancePerSide * 2;
        const drawerBoxDepth = isInternal
          ? interiorDepth - dt - dst - 10
          : interiorDepth - 10;

        const drawerBoxSideHeight = drawerHeight - 10;

        // ── Drawer Box Sides (2 per drawer) ──
        add({
          part: `Drawer Box Side (D${i + 1})`,
          section: section.label,
          material: `Drawer Side ${dst}mm`,
          qty: 2, // FIX: was `drawerCount * 2`
          length: drawerBoxDepth,
          width: drawerBoxSideHeight,
          thickness: dst,
          grain: "length",
          edgeBand: "top edge",
          note: `${section.label} — drawer ${i + 1} sides (10mm setback from back panel)`,
          machining: construction.requiresCamLocks
            ? "Cam lock boring on front/back ends"
            : "Groove for bottom panel",
        });

        const drawerFrontBackLength = drawerBoxOuterWidth - dst * 2;

        // ── Drawer Box Front & Back (2 per drawer) ──
        add({
          part: `Drawer Box Front/Back (D${i + 1})`,
          section: section.label,
          material: `Drawer Side ${dst}mm`,
          qty: 2, // FIX: was `drawerCount * 2`
          length: drawerFrontBackLength,
          width: drawerBoxSideHeight,
          thickness: dst,
          grain: "length",
          edgeBand: "top edge",
          note: `${section.label} — drawer ${i + 1} F/B`,
          machining: construction.requiresCamLocks
            ? "Cam lock boring"
            : "Groove for bottom panel",
        });

        // ── Drawer Bottom (1 per drawer) ──
        add({
          part: `Drawer Bottom (D${i + 1})`,
          section: section.label,
          material: `Drawer Bottom ${dbt}mm`,
          qty: 1, // FIX: was `drawerCount`
          length: drawerBoxDepth - 10,
          width: drawerBoxOuterWidth - dst * 2,
          thickness: dbt,
          grain: "length",
          edgeBand: "none",
          note: `${section.label} — drawer ${i + 1} base`,
        });

        const drawerFaceWidth = isInternal
          ? interiorWidth
          : doorOverlay.id === "inset"
            ? interiorWidth
            : sw;

        const drawerFaceHeight = drawerHeight;

        // ── Drawer Face (1 per drawer) ──
        add({
          part: `Drawer Face (D${i + 1})`,
          section: section.label,
          material: `Drawer Face ${dt}mm`,
          qty: 1, // FIX: was `drawerCount`
          length: drawerFaceHeight,
          width: drawerFaceWidth,
          thickness: dt,
          grain: "height",
          edgeBand: "all 4 edges",
          note: `${section.label} — drawer ${i + 1} front face`,
          machining: "Handle drilling per template",
          hardware: `${slide.brand} ${slide.model} × 1 set`,
        });
      }
    }
  });

  return parts;
}

// ─────────────────────────────────────────────────────────────────────────────
// HARDWARE SCHEDULE (Unchanged - Reinstated)
// ─────────────────────────────────────────────────────────────────────────────

export function generateHardwareSchedule(config, cutList = []) {
  const { sections: rawSections, hardware, construction } = config;
  // Use merged view so hardware counts match the actual structure
  const sections = computeMergedSections(rawSections);
  const schedule = [];

  const hinge = HINGES[hardware.hinge];
  const slide = DRAWER_SLIDES[hardware.drawerSlide];
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem];

  // Hinges (Reads dynamically from the actual generated cutList!)
  const doors = cutList.filter((p) => p.part.includes("Door Panel"));
  if (doors.length > 0 && hinge) {
    let totalHinges = 0;
    doors.forEach((door) => {
      const { count } = hingeLayout(door.length, hinge.hingesPerDoor);
      totalHinges += count;
    });

    schedule.push({
      category: "Hinges",
      item: `${hinge.brand} ${hinge.model}`,
      qty: totalHinges,
      unitCost: hinge.cost,
      totalCost: totalHinges * hinge.cost,
      note: `${totalHinges} total hinges across ${doors.length} door panels.`,
    });
  }

  // Drawer slides
  const totalDrawers = sections.reduce(
    (sum, s) => sum + (s.drawers?.count || 0),
    0,
  );
  if (totalDrawers > 0 && slide) {
    schedule.push({
      category: "Drawer Slides",
      item: `${slide.brand} ${slide.model}`,
      qty: totalDrawers,
      unitCost: slide.cost,
      totalCost: totalDrawers * slide.cost,
      note: `${slide.type} slides, max load ${slide.maxLoad} kg`,
    });
  }

  // Shelf pins
  const totalShelves = sections.reduce((sum, s) => sum + (s.shelves || 0), 0);
  if (totalShelves > 0 && shelfSys.adjustable) {
    const pins = totalShelves * shelfSys.pinsPerShelf;
    schedule.push({
      category: "Shelf Hardware",
      item: shelfSys.name,
      qty: pins,
      unitCost: shelfSys.cost,
      totalCost: pins * shelfSys.cost,
      note: `${shelfSys.pinsPerShelf} pins/shelf × ${totalShelves} shelves`,
    });
  }

  // Handles / pulls
  const handleQty = doors.length + totalDrawers;
  if (handleQty > 0) {
    schedule.push({
      category: "Handles / Pulls",
      item: "Bar handle (specify model & finish)",
      qty: handleQty,
      unitCost: 0,
      totalCost: 0,
      note: `${doors.length} door + ${totalDrawers} drawer handles. Unit cost TBC.`,
    });
  }

  // Cam locks
  if (construction?.requiresCamLocks) {
    const visibleDividerCount = sections.length - 1; // merged sections only have real dividers
    const camQty = (4 + visibleDividerCount * 2) * 2;
    schedule.push({
      category: "Cam Locks (RTA)",
      item: "Minifix / Rafix 15 mm cam lock",
      qty: camQty,
      unitCost: 0.45,
      totalCost: camQty * 0.45,
      note: `Flat-pack assembly. Approx ${camQty} sets.`,
    });
  }

  return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// MACHINING SCHEDULE (Unchanged - Reinstated)
// ─────────────────────────────────────────────────────────────────────────────

export function generateMachiningSchedule(cutList, config) {
  const { hardware } = config;
  const hinge = HINGES[hardware.hinge];
  const shelfSys = SHELF_SYSTEMS[hardware.shelfSystem];
  const joinery = JOINERY_TYPES[hardware.joinery?.toUpperCase()];

  const machining = [];

  // 1. Hinge cup boring
  const doors = cutList.filter((p) => p.part.includes("Door Panel"));
  doors.forEach((door) => {
    if (!hinge) return;
    const { count: hingeCount, positions } = hingeLayout(
      door.length,
      hinge.hingesPerDoor,
    );

    positions.forEach((yPos, i) => {
      machining.push({
        part: door.part,
        section: door.section,
        operation: "Hinge Cup Boring",
        tool: `${hinge.cupDiameter} mm Forstner`,
        diameter: hinge.cupDiameter,
        depth: hinge.cupDepth,
        xPos: hinge.boringDistance,
        yPos: Math.round(yPos),
        face: "Inside face (hinge side)",
        note: `Hinge ${i + 1}/${hingeCount}`,
      });
    });
  });

  // 2. Shelf pin holes
  if (shelfSys?.adjustable) {
    const sidePanels = cutList.filter(
      (p) =>
        p.part === "Left Side Panel" ||
        p.part === "Right Side Panel" ||
        p.part === "Vertical Divider" ||
        p.part === "Center Divider",
    );
    sidePanels.forEach((panel) => {
      const rowCount = Math.floor(panel.length / shelfSys.rowSpacing);
      for (let i = 1; i <= rowCount; i++) {
        ["front", "rear"].forEach((col) => {
          machining.push({
            part: panel.part,
            section: panel.section,
            operation: "Shelf Pin Hole",
            tool: `${shelfSys.pinDiameter} mm drill`,
            diameter: shelfSys.pinDiameter,
            depth: shelfSys.pinDepth,
            xPos:
              col === "front"
                ? shelfSys.edgeSetback
                : panel.width - shelfSys.edgeSetback,
            yPos: i * shelfSys.rowSpacing,
            face: "Interior face",
            note: `${col} column, row ${i}`,
          });
        });
      }
    });
  }

  // 3. Dowel / cam lock boring
  if (joinery?.requiresBoring) {
    const panels = cutList.filter(
      (p) => p.machining && p.machining.toLowerCase().includes("boring"),
    );
    panels.forEach((panel) => {
      machining.push({
        part: panel.part,
        section: panel.section,
        operation: joinery.id === "dowel" ? "Dowel Boring" : "Cam Lock Boring",
        tool:
          joinery.id === "dowel"
            ? `${joinery.dowelSize} mm drill`
            : `${joinery.camSize} mm Forstner`,
        diameter: joinery.id === "dowel" ? joinery.dowelSize : joinery.camSize,
        depth: joinery.id === "dowel" ? joinery.dowelDepth : joinery.camDepth,
        xPos: null,
        yPos: null,
        face: "Joint face",
        note: "Position per assembly drawing",
      });
    });
  }

  return machining;
}
