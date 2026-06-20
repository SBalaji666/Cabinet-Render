---
phase: 01-per-material-pdf-export
plan: 01
subsystem: ui
tags: [react, jspdf, svg2pdf, pdf-export, sheet-nesting, vector]

# Dependency graph
requires:
  - phase: none
    provides: existing generateNestingSVG optimizer output + per-material SVG export
provides:
  - Client-side SVG→PDF conversion path (jspdf + svg2pdf.js)
  - downloadNestingPDF(material) async handler in App.jsx
  - onDownloadNestingPDF prop wired into SheetOptimizationView
  - "PDF" export button beside the existing "SVG" button on each material row
  - SKELETON.md recording the architectural decisions for downstream slices
affects: [combined-bulk-pdf-export, sheet-nesting-export]

# Tech tracking
tech-stack:
  added: [jspdf@^4.2.1, svg2pdf.js@^2.7.0]
  patterns: [reuse generateNestingSVG as PDF source, A4 fit-to-page uniform-scale, auto orientation from SVG aspect ratio, additive-only export wiring]

key-files:
  created:
    - .planning/phases/01-per-material-pdf-export/SKELETON.md
    - .planning/phases/01-per-material-pdf-export/01-01-SUMMARY.md
  modified:
    - package.json
    - src/App.jsx
    - src/components/SheetOptimizationView.jsx

key-decisions:
  - "Used jspdf + svg2pdf.js (both MIT, browser/ESM) for vector SVG→PDF — no raster/canvas, no file-saver"
  - "A4 fit-to-page via single uniform scale = min(pageW/svgW, pageH/svgH), centered; orientation derived from SVG width vs height"
  - "Reused existing generateNestingSVG as the conversion source so SVG and PDF share one geometry path"
  - "Adopted exportConfigJSON's URL.revokeObjectURL(a.href) lifecycle for the PDF download"

patterns-established:
  - "Pattern 1: downloadNestingPDF mirrors downloadNestingSVG (same guard, same Blob→anchor→click download), differing only in the SVG→PDF conversion step"
  - "Pattern 2: PDF button cloned verbatim from the SVG button — identical ui-token styling, only onClick + label change; both wrapped in a 6px-gap flex row"

requirements-completed: [EXP-01, EXP-02, EXP-05]

# Metrics
duration: 4min
completed: 2026-06-20
status: complete
---

# Phase 01: Per-Material PDF Export Summary

**Client-side SVG→PDF export: each material's nesting layout downloads as an A4 fit-to-page vector PDF (jspdf + svg2pdf.js) via a new "PDF" button, with the existing SVG export untouched**

## Performance

- **Duration:** ~4 min (automated tasks)
- **Started:** 2026-06-20T15:27:56+05:30
- **Completed:** 2026-06-20T15:29:29+05:30 (code); human-verify approved post-checkpoint
- **Tasks:** 4 (3 automated + 1 human-verify checkpoint)
- **Files modified:** 4 (package.json, package-lock.json, src/App.jsx, src/components/SheetOptimizationView.jsx)

## Accomplishments
- Added `jspdf@^4.2.1` + `svg2pdf.js@^2.7.0` as runtime dependencies (overrides block untouched, no peer-dep errors)
- `downloadNestingPDF(material)` async handler converts `generateNestingSVG` output to an A4, fit-to-page, auto-orientation vector PDF entirely client-side
- New "PDF" button beside the "SVG" button on each material row, styled identically (ui tokens, 6px flex-row gap)
- Existing SVG export verified behaviorally unchanged (EXP-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install jspdf + svg2pdf.js** - `764f053` (chore)
2. **Task 2: Add downloadNestingPDF handler + wire onDownloadNestingPDF prop** - `2ca91ad` (feat)
3. **Task 3: Add PDF button beside SVG button** - `ab856c6` (feat)

**Task 4:** Human-verify checkpoint — approved by user (PDF parity, A4 fit-to-page vector fidelity, correct filename, SVG unregressed).

## Files Created/Modified
- `package.json` / `package-lock.json` - jspdf + svg2pdf.js under dependencies
- `src/App.jsx` - `downloadNestingPDF` handler, jsPDF/svg2pdf imports, `onDownloadNestingPDF` prop wiring
- `src/components/SheetOptimizationView.jsx` - `onDownloadNestingPDF` prop destructure + "PDF" button in a flex row beside "SVG"
- `.planning/phases/01-per-material-pdf-export/SKELETON.md` - architectural decisions for downstream slices

## Decisions Made
- jspdf + svg2pdf.js chosen for vector conversion (MIT, browser/ESM); no raster/canvas/file-saver.
- A4 fit-to-page via single uniform scale, centered; orientation auto-derived (landscape when width > height).
- Reused `generateNestingSVG` as the single PDF source so SVG and PDF stay in geometric lockstep.

## Deviations from Plan
None - plan executed exactly as written. The only diff to the existing SVG button was re-indentation when wrapping it (with the new PDF button) in a flex row; behavior is byte-identical (`git diff -w` clean), satisfying EXP-05.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. PDF generation is fully client-side / offline.

## Next Phase Readiness
- The SVG→PDF conversion core (`downloadNestingPDF`) is ready for Phase 2 to reuse for combined bulk export.
- No blockers.

---
*Phase: 01-per-material-pdf-export*
*Completed: 2026-06-20*
