/**
 * mergedSections.js
 *
 * Handles two independent concerns when sections share a hidden divider:
 *
 *  1. STRUCTURAL MERGING
 *     Adjacent sections whose boundary divider is hidden are collapsed into one
 *     logical compartment. Width, shelves, drawers, and all structural parts
 *     are calculated from this unified merged width.
 *
 *  2. DOOR CONFIGURATION  (independent of structural width)
 *     The merged section carries a `_doorConfig` array describing each door
 *     opening individually. Downstream consumers (3-D renderer, cut list) read
 *     `_doorConfig` instead of deriving door width from the section width.
 *
 *     Double-door detection rule
 *     --------------------------
 *     When exactly TWO adjacent members are merged AND one swings "right" and
 *     the other swings "left", they form a symmetric double-door pair:
 *       * Each door keeps its own original sub-section width.
 *       * The two doors meet at the (now-invisible) centre seam.
 *       * Neither door is stretched to the full merged width.
 *
 *     For any other combination (same-swing pair, or 3+ merged sections) each
 *     member still gets its own door at its own original width — unless the
 *     merged section is explicitly configured as a single shared door via
 *     doorMode: "single".
 *
 * _doorConfig entry shape:
 *   swing             "right" | "left"
 *   widthRatio        0..1  fraction of merged intW / extW this door occupies
 *   originalWidth     mm    raw section width (proportional, pre-scale)
 *   label             string source section label
 *   isDouble          bool  true when this door is one half of a double pair
 *   isSingleOverride  bool  true when doorMode === "single"
 */

// ---------------------------------------------------------------------------
// Drawer merging
// ---------------------------------------------------------------------------
function mergeDrawers(members) {
  const allDrawers = members.map((m) => m.drawers || { count: 0 });
  const totalCount = allDrawers.reduce((s, d) => s + (d.count || 0), 0);
  if (totalCount === 0) return { count: 0, heights: [], placement: "bottom" };

  const heights = allDrawers.flatMap((d) => {
    const cnt = d.count || 0;
    const hs = d.heights || [];
    return Array.from({ length: cnt }, (_, i) => hs[i] || 120);
  });

  const placements = allDrawers
    .filter((d) => (d.count || 0) > 0)
    .map((d) => d.placement || "bottom");
  const placement =
    placements.length > 0 && placements.every((p) => p === placements[0])
      ? placements[0]
      : "bottom";

  const isInternal = allDrawers.some((d) => d.isInternal);
  return { count: totalCount, heights, placement, isInternal };
}

// ---------------------------------------------------------------------------
// Door-pair detection
// ---------------------------------------------------------------------------

function isDoubleDoorPair(members) {
  if (members.length !== 2) return false;
  const swingA = members[0].doorSwing || "right";
  const swingB = members[1].doorSwing || "right";
  return swingA === "right" && swingB === "left";
}

function buildDoorConfig(members, doorMode) {
  const totalW = members.reduce((s, m) => s + (m.width || 0), 0) || 1;

  // Explicit single-door override
  if (doorMode === "single") {
    return [
      {
        swing: members[0].doorSwing || "right",
        widthRatio: 1,
        originalWidth: totalW,
        label: members.map((m) => m.label).join("+"),
        isDouble: false,
        isSingleOverride: true,
      },
    ];
  }

  const isDouble = isDoubleDoorPair(members);
  return members.map((m) => ({
    swing: m.doorSwing || "right",
    widthRatio: (m.width || 0) / totalW,
    originalWidth: m.width || 0,
    label: m.label,
    isDouble,
    isSingleOverride: false,
  }));
}

// ---------------------------------------------------------------------------
// computeMergedSections — main export
// ---------------------------------------------------------------------------
export function computeMergedSections(sections) {
  if (!sections || sections.length === 0) return [];

  const merged = [];
  let group = [sections[0]];

  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i];
    if (sec.showDivider === false) {
      group.push(sec);
    } else {
      merged.push(buildMergedSection(group));
      group = [sec];
    }
  }
  merged.push(buildMergedSection(group));
  return merged;
}

function buildMergedSection(members) {
  if (members.length === 1) {
    const m = members[0];
    return {
      ...m,
      showDivider: m.showDivider !== false,
      _mergedFrom: [m.id],
      _isMerged: false,
      _isDoubleDoor: false,
      _doorConfig: [
        {
          swing: m.doorSwing || "right",
          widthRatio: 1,
          originalWidth: m.width || 0,
          label: m.label,
          isDouble: false,
          isSingleOverride: false,
        },
      ],
    };
  }

  const totalWidth = members.reduce((s, m) => s + (m.width || 0), 0);
  const anyClosedType = members.some((m) => m.type === "closed")
    ? "closed"
    : "open";
  const maxShelves = Math.max(...members.map((m) => m.shelves || 0));
  const mergedDrawers = mergeDrawers(members);
  const doorMode = members[0].doorMode || "auto";
  const doorConfig = buildDoorConfig(members, doorMode);
  const isDouble = isDoubleDoorPair(members);

  return {
    id: members[0].id,
    label: members.map((m) => m.label).join("+"),
    width: totalWidth,
    type: anyClosedType,
    shelves: maxShelves,
    drawers: mergedDrawers,
    doorSwing: members[0].doorSwing || "right",
    showDivider: true,
    _doorConfig: doorConfig,
    _isDoubleDoor: isDouble,
    _mergedFrom: members.map((m) => m.id),
    _isMerged: true,
    _memberCount: members.length,
  };
}

// ---------------------------------------------------------------------------
// resolveDoorWidths — called by renderer AND cut-list engine
// ---------------------------------------------------------------------------
/**
 * Given a (possibly merged) section and its already-scaled interior/exterior
 * widths, returns one descriptor per door leaf:
 *
 *   _resolvedDoorW     actual door panel width (mm, after gap)
 *   _resolvedIntW      interior width claimed by this door's sub-span
 *   _resolvedExtW      exterior width claimed by this door's sub-span
 *   _resolvedIntOffset left offset from the section's interior left edge
 *   _resolvedExtOffset left offset from the section's exterior left edge
 *   swing              "right" | "left"
 *   isDouble           true when part of a double-door pair
 *   label              source section label for cut-list notes
 *
 * Falls back to a single full-width door for legacy sections without _doorConfig.
 */
export function resolveDoorWidths(
  section,
  scaledIntW,
  scaledExtW,
  doorOverlay,
  doorGap,
) {
  const cfg = section._doorConfig;

  if (!cfg || cfg.length === 0) {
    const w =
      doorOverlay.id === "inset"
        ? scaledIntW - doorGap * 2
        : scaledExtW - doorGap * 2;
    return [
      {
        swing: section.doorSwing || "right",
        isDouble: false,
        isSingleOverride: false,
        label: section.label,
        _resolvedDoorW: w,
        _resolvedIntW: scaledIntW,
        _resolvedExtW: scaledExtW,
        _resolvedIntOffset: 0,
        _resolvedExtOffset: 0,
      },
    ];
  }

  let intOffsetAcc = 0;
  let extOffsetAcc = 0;

  return cfg.map((entry) => {
    const entryIntW = Math.round(entry.widthRatio * scaledIntW);
    const entryExtW = Math.round(entry.widthRatio * scaledExtW);
    const doorW =
      doorOverlay.id === "inset"
        ? entryIntW - doorGap * 2
        : entryExtW - doorGap * 2;

    const result = {
      swing: entry.swing,
      isDouble: entry.isDouble,
      isSingleOverride: entry.isSingleOverride,
      label: entry.label,
      _resolvedDoorW: doorW,
      _resolvedIntW: entryIntW,
      _resolvedExtW: entryExtW,
      _resolvedIntOffset: intOffsetAcc,
      _resolvedExtOffset: extOffsetAcc,
    };

    intOffsetAcc += entryIntW;
    extOffsetAcc += entryExtW;
    return result;
  });
}

export function countVisibleDividers(sections) {
  if (!sections || sections.length < 2) return 0;
  return sections.slice(1).filter((s) => s.showDivider !== false).length;
}
