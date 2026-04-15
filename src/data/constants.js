// ─── JOINERY METHODS ──────────────────────────────────────────────────────────
export const JOINERY_TYPES = {
  BUTT: {
    id: "butt",
    name: "Butt Joint",
    description: "Simple butt joint with screws/nails",
    dividerReduction: 0, // No reduction needed
    shelfReduction: 3, // 3mm clearance for easy fit
    requiresBoring: false,
  },
  DADO: {
    id: "dado",
    name: "Dado/Housing Joint",
    description: "Groove cut into side panels",
    dividerReduction: 0, // Divider sits in groove
    shelfReduction: 3,
    requiresBoring: false,
  },
  DOWEL: {
    id: "dowel",
    name: "Dowel Joint",
    description: "Dowels for alignment & strength",
    dividerReduction: 0,
    shelfReduction: 3,
    requiresBoring: true,
    dowelSize: 8, // 8mm dowels
    dowelDepth: 40, // 40mm deep
    dowelsPerJoint: 2,
  },
  CAM_LOCK: {
    id: "cam",
    name: "Cam Lock (Flat-Pack)",
    description: "RTA furniture hardware",
    dividerReduction: 0,
    shelfReduction: 3,
    requiresBoring: true,
    camSize: 15, // 15mm cam
    camDepth: 12.5,
  },
};

// ─── HARDWARE DATABASE ────────────────────────────────────────────────────────
export const DRAWER_SLIDES = {
  "blum-tandem-550": {
    id: "blum-tandem-550",
    brand: "Blum",
    model: "Tandem 550H",
    type: "undermount",
    maxLoad: 30, // kg
    clearancePerSide: 12.5, // mm per side
    minDepth: 270,
    maxDepth: 550,
    // NOTE: These are Blum NL (Nominal Length) runner height values from spec sheet,
    // NOT arbitrary drawer box heights. Used for slide-compatibility validation.
    heights: [83, 120, 150, 193],
    cost: 18.5,
  },
  "blum-tandem-650": {
    id: "blum-tandem-650",
    brand: "Blum",
    model: "Tandem 650H",
    type: "undermount",
    maxLoad: 30,
    clearancePerSide: 12.5,
    minDepth: 270,
    maxDepth: 650,
    // NOTE: Blum NL runner height values — see spec sheet art. 550H/650H
    heights: [83, 120, 150, 193],
    cost: 22.0,
  },
  "hettich-quadro": {
    id: "hettich-quadro",
    brand: "Hettich",
    model: "Quadro V6",
    type: "undermount",
    maxLoad: 40,
    clearancePerSide: 13, // conservative; spec sheet range is 12.5–13 mm
    minDepth: 270,
    maxDepth: 600,
    heights: [70, 92, 121, 186],
    cost: 16.8,
  },
  "accuride-3832": {
    id: "accuride-3832",
    brand: "Accuride",
    model: "3832 Easy-Close",
    type: "side-mount",
    maxLoad: 45,
    clearancePerSide: 12.7,
    minDepth: 250,
    maxDepth: 650,
    heights: [50, 300], // side-mount: works with wide range of heights
    cost: 12.4,
  },
};

export const HINGES = {
  "blum-clip-top-110": {
    id: "blum-clip-top-110",
    brand: "Blum",
    model: "CLIP top BLUMOTION 110°",
    type: "soft-close",
    openingAngle: 110,
    overlay: 0, // Full overlay (no offset)
    inset: -19, // Half overlay
    cupDiameter: 35,
    cupDepth: 11.5,
    boringDistance: 37, // distance from edge
    verticalSpacing: 100, // mm between hinges
    minDoorHeight: 300,
    hingesPerDoor: (height) => (height > 1500 ? 3 : 2),
    cost: 6.2,
  },
  "blum-clip-top-95": {
    id: "blum-clip-top-95",
    brand: "Blum",
    model: "CLIP top 95° Inset",
    type: "standard",
    openingAngle: 95,
    overlay: -3, // Inset (3mm gap)
    cupDiameter: 35,
    cupDepth: 11.5,
    boringDistance: 37,
    verticalSpacing: 100,
    minDoorHeight: 300,
    hingesPerDoor: (height) => (height > 1500 ? 3 : 2),
    cost: 4.8,
  },
  "grass-tiomos": {
    id: "grass-tiomos",
    brand: "Grass",
    model: "Tiomos 110° Self-Close",
    type: "self-close",
    openingAngle: 110,
    overlay: 0,
    cupDiameter: 35,
    cupDepth: 12,
    boringDistance: 37,
    verticalSpacing: 100,
    minDoorHeight: 300,
    hingesPerDoor: (height) => (height > 1500 ? 3 : 2),
    cost: 5.5,
  },
};

export const SHELF_SYSTEMS = {
  fixed: {
    id: "fixed",
    name: "Fixed Shelf",
    adjustable: false,
    clearance: 2, // mm reduction per side
    supportType: "dado/screws",
    cost: 0,
  },
  "pin-5mm": {
    id: "pin-5mm",
    name: "5mm Shelf Pins",
    adjustable: true,
    clearance: 4, // 4mm reduction to allow easy insertion
    pinDiameter: 5,
    pinDepth: 10,
    rowSpacing: 32, // 32mm system spacing
    edgeSetback: 37, // distance from front edge
    pinsPerShelf: 4,
    cost: 0.15, // per pin
  },
  "pin-7mm": {
    id: "pin-7mm",
    name: "7mm Shelf Pins (Heavy Duty)",
    adjustable: true,
    clearance: 4,
    pinDiameter: 7,
    pinDepth: 12,
    rowSpacing: 32,
    edgeSetback: 37,
    pinsPerShelf: 4,
    cost: 0.25,
  },
};

// ─── MATERIAL SHEETS ──────────────────────────────────────────────────────────
export const SHEET_MATERIALS = {
  "Carcass 18mm": {
    width: 2440,
    height: 1220,
    thickness: 18,
    cost: 85,
    material: "Melamine-faced Chipboard",
    color: "White",
    grainRequired: true,
  },
  "Back Panel 9mm": {
    width: 2440,
    height: 1220,
    thickness: 9,
    cost: 52,
    material: "MDF",
    color: "White",
    grainRequired: false,
  },
  "Door 18mm": {
    width: 2440,
    height: 1220,
    thickness: 18,
    cost: 95,
    material: "Melamine-faced MDF",
    color: "White",
    grainRequired: true,
  },
  "Shelf 18mm": {
    width: 2440,
    height: 1220,
    thickness: 18,
    cost: 85,
    material: "Melamine-faced Chipboard",
    color: "White",
    grainRequired: true,
  },
  "Drawer Side 12mm": {
    width: 2440,
    height: 1220,
    thickness: 12,
    cost: 62,
    material: "Birch Plywood",
    color: "Natural",
    grainRequired: true,
  },
  "Drawer Bottom 6mm": {
    width: 2440,
    height: 1220,
    thickness: 6,
    cost: 38,
    material: "MDF",
    color: "Natural",
    grainRequired: false,
  },
  "Drawer Face 18mm": {
    width: 2440,
    height: 1220,
    thickness: 18,
    cost: 95,
    material: "Melamine-faced MDF",
    color: "White",
    grainRequired: true,
  },
};

// ─── EDGE BANDING ─────────────────────────────────────────────────────────────
export const EDGE_BANDING = {
  "pvc-1mm": {
    id: "pvc-1mm",
    name: "1mm PVC",
    thickness: 1,
    costPerMeter: 0.35,
  },
  "pvc-2mm": {
    id: "pvc-2mm",
    name: "2mm PVC",
    thickness: 2,
    costPerMeter: 0.55,
  },
  "abs-1mm": {
    id: "abs-1mm",
    name: "1mm ABS (Premium)",
    thickness: 1,
    costPerMeter: 0.65,
  },
};

// ─── PLINTH/TOE-KICK ──────────────────────────────────────────────────────────
export const PLINTH_SYSTEMS = {
  none: { id: "none", name: "No Plinth", height: 0 },
  "std-100": { id: "std-100", name: "100mm Plinth", height: 100, setback: 50 },
  "std-150": { id: "std-150", name: "150mm Plinth", height: 150, setback: 50 },
  "rec-120": {
    id: "rec-120",
    name: "120mm Recessed",
    height: 120,
    setback: 75,
  },
};

// ─── CONSTRUCTION METHODS ─────────────────────────────────────────────────────
export const CONSTRUCTION_TYPES = {
  assembled: {
    id: "assembled",
    name: "Fully Assembled",
    description: "Built in workshop, delivered complete",
  },
  "flat-pack": {
    id: "flat-pack",
    name: "Flat-Pack (RTA)",
    description: "Ready-to-assemble with cam locks",
    requiresCamLocks: true,
  },
};

// ─── DOOR STYLES ──────────────────────────────────────────────────────────────
export const DOOR_OVERLAY_TYPES = {
  full: { id: "full", name: "Full Overlay", gapPerSide: 1 },
  half: {
    id: "half",
    name: "Half Overlay",
    gapPerSide: 1,
    dividerVisible: true,
  },
  inset: { id: "inset", name: "Inset", gapPerSide: 3 },
};

// ─── DEFAULT VALUES ───────────────────────────────────────────────────────────
export const DEFAULTS = {
  overall: { length: 1000, height: 2000, depth: 300, unit: "mm" },
  materials: {
    carcass: 20,
    back: 6,
    shelf: 18,
    door: 18,
    drawerSide: 12,
    drawerBottom: 6,
  },
  tolerances: {
    doorGap: 2,
    edgeBanding: 2,
    sawKerf: 10,
  },
  joinery: "butt",
  drawerSlide: "blum-tandem-550",
  hinge: "blum-clip-top-110",
  shelfSystem: "pin-5mm",
  plinth: "std-100",
  construction: "assembled",
  doorOverlay: "full",
  edgeBanding: "pvc-2mm",
};

// ─── MATERIAL COLORS (for UI) ─────────────────────────────────────────────────
export const MATERIAL_COLORS = {
  "Carcass 18mm": "#6b7fa3",
  "Back Panel 9mm": "#9b7fa3",
  "Drawer Bottom 6mm": "#7fa39b",
  "Door 18mm": "#a38f7f",
  "Shelf 18mm": "#7fa36b",
  "Drawer Side 12mm": "#a37f6b",
  "Drawer Face 18mm": "#a36b7f",
};
