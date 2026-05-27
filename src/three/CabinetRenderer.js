import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DOOR_OVERLAY_TYPES } from "../data/constants.js";
import {
  computeMergedSections,
  countVisibleDividers,
  resolveDoorWidths,
} from "../utils/mergedSections.js";

/**
 * Three.js Cabinet Renderer - Infurnia-style 3D Visualization
 * * Features:
 * - Interactive 3D view with orbit controls
 * - Realistic materials (wood, metal handles)
 * - Section highlighting on hover
 * - Exploded view mode
 * - Dimension annotations in 3D space
 * - Smooth animated doors and drawers toggle
 */

export class CabinetRenderer {
  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.cabinetGroup = null;
    this.selectedSection = null;
    this.hoveredSection = null;
    this.selectedPanel = null;
    this.dimensionLines = [];
    this.panelColorMap = {};

    // Animation states
    this.isDoorsOpen = false;
    this.isDrawersOpen = false;
    this.isExploded = false;
    this.doorHinges = [];
    this.drawers = [];

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8f9fa);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
    this.camera.position.set(0, 1200, 3500);
    this.camera.lookAt(0, 1100, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.style.position = "relative";
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.controls.minDistance = 800;
    this.controls.maxDistance = 6000;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;
    this.controls.rotateSpeed = 0.6;
    this.controls.target.set(0, 1100, 0);

    this.setupLighting();
    this.setupHelpers();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
    this.buildCabinet();
    this.animate();
  }

  printView() {
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL("image/png");
    if (!dataUrl || dataUrl === "data:,") {
      console.error(
        "Failed to capture canvas. Is preserveDrawingBuffer set to true?",
      );
      return;
    }
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
    <html>
      <head>
        <title>Cabinet Shop Drawing</title>
        <style>
          body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          img { width: 100%; height: auto; display: block; }
          @media print {
            @page { size: landscape; margin: 0; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <img id="print-image" src="${dataUrl}" />
        <script>
          const img = document.getElementById('print-image');
          img.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
  }

  toggleDoors() {
    this.isDoorsOpen = !this.isDoorsOpen;
    this.doorHinges.forEach((door) => {
      if (this.isDoorsOpen) {
        // Left-swing opens at +90°, right-swing opens at -90°
        door.userData.targetY = door.userData.isLeftSwing
          ? Math.PI / 2.0
          : -Math.PI / 2.0;
      } else {
        door.userData.targetY = 0;
      }
    });
    this.updateDrawerPositions();
  }

  toggleDrawers() {
    this.isDrawersOpen = !this.isDrawersOpen;
    this.updateDrawerPositions();
  }

  // NEW: Smart Collision & Dependency Checker
  updateDrawerPositions() {
    this.drawers.forEach((drawer) => {
      if (this.isDrawersOpen) {
        // If the drawer is internal, it CANNOT open unless doors are also open
        if (drawer.userData.isInternal && !this.isDoorsOpen) {
          drawer.userData.targetZ = 0;
        } else {
          // Custom drawers, or internal drawers when doors are open, are free to move
          drawer.userData.targetZ = drawer.userData.openOffset;
        }
      } else {
        // If drawers are toggled off, close them all
        drawer.userData.targetZ = 0;
      }
    });
  }

  setExploded(isExploded) {
    this.isExploded = isExploded;
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(1500, 2500, 1500);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.left = -2500;
    mainLight.shadow.camera.right = 2500;
    mainLight.shadow.camera.top = 2500;
    mainLight.shadow.camera.bottom = -2500;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 6000;
    mainLight.shadow.bias = -0.0001;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-1500, 1200, 800);
    this.scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(0, 800, -1500);
    this.scene.add(backLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.5);
    hemiLight.position.set(0, 2500, 0);
    this.scene.add(hemiLight);
  }

  setupHelpers() {
    const groundGeometry = new THREE.PlaneGeometry(6000, 6000);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(4000, 50, 0x999999, 0xcccccc);
    gridHelper.position.y = 0;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    this.axesHelper = new THREE.AxesHelper(800);
    this.axesHelper.visible = false;
    this.scene.add(this.axesHelper);
  }

  createMaterials() {
    return {
      carcass: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.0,
      }),
      door: new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.3,
        metalness: 0.05,
      }),
      shelf: new THREE.MeshStandardMaterial({
        color: 0xe8d4b8,
        roughness: 0.6,
        metalness: 0.0,
      }),
      drawerFace: new THREE.MeshStandardMaterial({
        color: 0xf0f0f0,
        roughness: 0.4,
        metalness: 0.0,
      }),
      handle: new THREE.MeshStandardMaterial({
        color: 0x505050,
        roughness: 0.2,
        metalness: 0.9,
      }),
      back: new THREE.MeshStandardMaterial({
        color: 0xf8f8f8,
        roughness: 0.7,
        metalness: 0.0,
      }),
      highlight: new THREE.MeshStandardMaterial({
        color: 0xe6c280,
        roughness: 0.4,
        metalness: 0.1,
        emissive: 0x2563eb,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.75,
      }),
      hover: new THREE.MeshStandardMaterial({
        color: 0xf5dfaf,
        roughness: 0.4,
        metalness: 0.1,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.65,
      }),
    };
  }

  buildCabinet() {
    if (this.cabinetGroup) {
      this.scene.remove(this.cabinetGroup);
      this.cabinetGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    this.doorHinges = [];
    this.drawers = [];
    this.isDoorsOpen = false;
    this.selectedSection = null;
    this.hoveredSection = null;
    this.selectedPanel = null;
    if (this.toggleButton) this.toggleButton.innerText = "Open Doors & Drawers";

    this.cabinetGroup = new THREE.Group();
    this.cabinetGroup.name = "cabinet";
    this.materials = this.createMaterials();
    this._doorCounter = 0;

    const {
      overall,
      materials: matThickness,
      sections: rawSections,
      hardware,
    } = this.config;
    const { length: L, height: H, depth: D } = overall;
    const ct = matThickness.carcass,
      bt = matThickness.back,
      dt = matThickness.door;
    const skirtH = hardware?.skirt
      ? parseInt((hardware.skirt || hardware.plinth).split("-")[1]) || 100
      : hardware?.plinth
        ? parseInt(hardware.plinth.split("-")[1]) || 100
        : 100;
    const doorOverlay =
      DOOR_OVERLAY_TYPES[hardware?.doorOverlay] || DOOR_OVERLAY_TYPES.full;

    // Merge adjacent sections that share a hidden divider
    const sections = computeMergedSections(rawSections);

    // Derived Depths mirroring cutlist logic
    const bumperGap = 1;
    const carcassDepth =
      doorOverlay.id !== "inset" ? D - bt - dt - bumperGap : D - bt;

    this.cabinetGroup.position.set(-L / 2, 0, -D / 2);

    this.buildCarcassStructure(L, H, D, ct, bt, skirtH, carcassDepth);
    this.buildSections(
      sections,
      L,
      H,
      D,
      ct,
      bt,
      dt,
      skirtH,
      carcassDepth,
      doorOverlay,
    );
    this.addDimensionAnnotations(L, H + skirtH, D);

    this.setupObjectMetadata();
    this.scene.add(this.cabinetGroup);
    // Reapply any saved panel colors after rebuild
    if (Object.keys(this.panelColorMap).length > 0) {
      this.applyPanelColors(this.panelColorMap);
    }
    this.centerCamera(L, H + skirtH, D);
  }

  setupObjectMetadata() {
    const box = new THREE.Box3().setFromObject(this.cabinetGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this.cabinetGroup.traverse((obj) => {
      if (obj.isMesh || obj.isLineSegments) {
        if (obj.isMesh) obj.userData.originalMaterial = obj.material;
        obj.userData.originalPosition = obj.position.clone();

        const objBox = new THREE.Box3().setFromObject(obj);
        const objCenter = new THREE.Vector3();
        objBox.getCenter(objCenter);

        const dir = new THREE.Vector3()
          .subVectors(objCenter, center)
          .normalize();
        if (dir.lengthSq() === 0) dir.set(0, 0, 1);
        obj.userData.explodeDirection = dir;
      }
    });
  }

  createPart(geo, mat, x, y, z, edgeColor, group, panelMeta) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (panelMeta) {
      mesh.userData.panelId = panelMeta.panelId;
      mesh.userData.panelType = panelMeta.panelType;
      mesh.userData.panelLabel = panelMeta.panelLabel || panelMeta.panelId;
    }
    group.add(mesh);

    const edges = new THREE.EdgesGeometry(geo);
    const lines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 1 }),
    );
    lines.position.copy(mesh.position);
    group.add(lines);
    return mesh;
  }

  buildCarcassStructure(L, H, D, ct, bt, skirtH, cD) {
    const mats = this.materials;
    const cZ = bt + cD / 2; // Z-centre of carcass depth

    // ── 1. SIDE PANELS (full height: skirt + box, floor to top) ──────────
    // Height = skirtH + H - ct  (sits under the top panel, starts from floor)
    const fullSideH = skirtH + H - ct;
    const sideGeo = new THREE.BoxGeometry(ct, fullSideH, cD);
    const sideY = fullSideH / 2; // centred from y=0 up to skirtH+H-ct

    // Left side panel
    this.createPart(
      sideGeo,
      mats.carcass,
      ct / 2,
      sideY,
      cZ,
      0x333333,
      this.cabinetGroup,
      { panelId: "left-side", panelType: "carcass", panelLabel: "Left Side Panel" },
    );
    // Right side panel
    this.createPart(
      sideGeo,
      mats.carcass,
      L - ct / 2,
      sideY,
      cZ,
      0x333333,
      this.cabinetGroup,
      { panelId: "right-side", panelType: "carcass", panelLabel: "Right Side Panel" },
    );

    // ── 2. TOP PANEL (full width, caps both side panels) ──────────────────
    const topGeo = new THREE.BoxGeometry(L, ct, cD);
    this.createPart(
      topGeo,
      mats.carcass,
      L / 2,
      skirtH + H - ct / 2,
      cZ,
      0x555555,
      this.cabinetGroup,
      { panelId: "top-panel", panelType: "carcass", panelLabel: "Top Panel" },
    );

    // ── 3. BOTTOM PANEL (sits between side panels, at skirt top) ─────────
    const botGeo = new THREE.BoxGeometry(L - ct * 2, ct, cD);
    this.createPart(
      botGeo,
      mats.carcass,
      L / 2,
      skirtH + ct / 2,
      cZ,
      0x333333,
      this.cabinetGroup,
      { panelId: "bottom-panel", panelType: "carcass", panelLabel: "Bottom Panel" },
    );

    // ── 4. SKIRT FRONT RAIL (toe-kick board, between the side panels) ────
    // Only rendered if skirt exists. Sits at the very front of the cabinet.
    if (skirtH > 0) {
      const pFrontGeo = new THREE.BoxGeometry(L - ct * 2, skirtH, ct);
      this.createPart(
        pFrontGeo,
        mats.carcass,
        L / 2,
        skirtH / 2,
        bt + cD - ct / 2, // flush with the front face of the carcass
        0x333333,
        this.cabinetGroup,
        { panelId: "skirt-front", panelType: "carcass", panelLabel: "Skirt Front Rail" },
      );

      // NOTE: Skirt SIDE rails are intentionally omitted here.
      // The extended side panels already visually enclose the skirt zone.
      // The physical side skirt rails still appear in the CUT LIST
      // (generateCutList) as separate parts — this is correct because in
      // real construction the side panels are one tall board and the skirt
      // rails are glued/screwed behind them for rigidity. The 3D view just
      // shows the clean combined outer face.
    }

    // ── 5. BACK PANEL (plant-on, covers full height including skirt zone) ─
    const backGeo = new THREE.BoxGeometry(L, H, bt);
    this.createPart(
      backGeo,
      mats.back,
      L / 2,
      skirtH + H / 2,
      bt / 2,
      0x666666,
      this.cabinetGroup,
      { panelId: "back-panel", panelType: "back", panelLabel: "Back Panel" },
    );
  }

  buildSections(sections, L, H, D, ct, bt, dt, skirtH, cD, doorOverlay) {
    // After merging, every section in this array has showDivider === true
    // (except section[0] which never has a left divider).
    // Use the actual visible-divider count for interior-width maths.
    const visibleDividerCount = sections.length - 1; // all dividers are now real walls
    const totalInternalWidth = L - ct * 2 - visibleDividerCount * ct;
    const totalW = sections.reduce((a, s) => a + s.width, 0) || 1;

    const normSections = sections.map((s) => ({
      ...s,
      intW: Math.round((s.width / totalW) * totalInternalWidth),
      extW: Math.round((s.width / totalW) * L),
    }));

    const sumInt = normSections.reduce((sum, s) => sum + s.intW, 0);
    const sumExt = normSections.reduce((sum, s) => sum + s.extW, 0);
    if (normSections.length > 0) {
      normSections[normSections.length - 1].intW += totalInternalWidth - sumInt;
      normSections[normSections.length - 1].extW += L - sumExt;
    }

    let currentIntX = ct;
    let currentExtX = 0;

    normSections.forEach((section, idx) => {
      const sectionGroup = new THREE.Group();
      sectionGroup.name = `section-${section.id}`;
      sectionGroup.userData = { section, index: idx };

      if (idx > 0) {
        // Every divider at this level is a real physical wall
        const divGeo = new THREE.BoxGeometry(ct, H - ct * 2, cD);
        this.createPart(
          divGeo,
          this.materials.carcass,
          currentIntX + ct / 2,
          skirtH + H / 2,
          bt + cD / 2,
          0x333333,
          sectionGroup,
          { panelId: `section-${section.id}-divider`, panelType: "carcass", panelLabel: `${section.label} Divider` },
        );
        currentIntX += ct;
      }

      const intCenterX = currentIntX + section.intW / 2;
      const extCenterX = currentExtX + section.extW / 2;

      const bounds = {
        intX: intCenterX,
        intW: section.intW,
        extX: extCenterX,
        extW: section.extW,
      };

      if (section.type === "open") {
        this.buildOpenSection(
          sectionGroup,
          bounds,
          H,
          cD,
          ct,
          bt,
          skirtH,
          section,
        );
      } else {
        this.buildClosedSection(
          sectionGroup,
          bounds,
          H,
          cD,
          ct,
          bt,
          dt,
          skirtH,
          section,
          doorOverlay,
        );
      }

      this.cabinetGroup.add(sectionGroup);
      currentIntX += section.intW;
      currentExtX += section.extW;
    });
  }

  buildOpenSection(group, bounds, H, cD, ct, bt, skirtH, section) {
    const { intX, intW } = bounds;
    const shelfCount = section.shelves || 0;
    const internalH = H - ct * 2;

    if (shelfCount > 0) {
      const shelfSpacing = internalH / (shelfCount + 1);
      for (let i = 0; i < shelfCount; i++) {
        const shelfY = skirtH + ct + (i + 1) * shelfSpacing;
        const shelfGeo = new THREE.BoxGeometry(intW - 2, 18, cD - 10); // 10mm setback
        this.createPart(
          shelfGeo,
          this.materials.shelf,
          intX,
          shelfY,
          bt + (cD - 10) / 2,
          0x555555,
          group,
          { panelId: `section-${section.id}-shelf-${i}`, panelType: "shelf", panelLabel: `${section.label} Shelf ${i + 1}` },
        );
      }
    }
  }

  buildClosedSection(
    group,
    bounds,
    H,
    cD,
    ct,
    bt,
    dt,
    skirtH,
    section,
    doorOverlay,
  ) {
    const { intX, intW, extX, extW } = bounds;
    const doorGap = 1;

    // Z depth of the door face (same for all doors in this section)
    const doorZ =
      doorOverlay.id === "inset" ? bt + cD - dt / 2 : bt + cD + 1 + dt / 2;

    // Resolve per-door widths/offsets using the section's _doorConfig.
    // For a double-door pair this returns two descriptors; for a single door,
    // one descriptor spanning the full width.
    const doorLeaves = resolveDoorWidths(
      section,
      intW,
      extW,
      doorOverlay,
      doorGap,
    );

    const drawerCount = section.drawers?.count || 0;
    const drawerHeights = section.drawers?.heights || [];
    const placement = section.drawers?.placement || "bottom";
    const isInternal = section.drawers?.isInternal || false;

    const floorY = skirtH + ct;
    const ceilingY = skirtH + H - ct;

    let drawerAreaStart = floorY,
      drawerAreaEnd = ceilingY;
    let shelfAreaStart = floorY,
      shelfAreaEnd = ceilingY;

    // ── 1. DRAWERS ────────────────────────────
    if (drawerCount > 0) {
      const totalDrawerHeight = drawerHeights
        .slice(0, drawerCount)
        .reduce((sum, h) => sum + (h || 120), 0);

      if (placement === "bottom") {
        drawerAreaStart = floorY;
        drawerAreaEnd = floorY + totalDrawerHeight;
        shelfAreaStart = drawerAreaEnd;
      } else if (placement === "top") {
        shelfAreaEnd = ceilingY - totalDrawerHeight;
        drawerAreaStart = shelfAreaEnd;
        drawerAreaEnd = ceilingY;
      } else if (placement === "custom") {
        const isFromTop = section.drawers?.customFrom === "top";
        const offsetMm =
          (ceilingY - floorY - ct * 2) *
          ((section.drawers?.customPercentage ?? 20) / 100);
        drawerAreaStart = isFromTop
          ? ceilingY - offsetMm - totalDrawerHeight - ct
          : floorY + offsetMm + ct;
        drawerAreaEnd = drawerAreaStart + totalDrawerHeight;
      } else if (placement === "full") {
        drawerAreaStart = floorY;
        drawerAreaEnd = floorY + totalDrawerHeight;
      }

      // Use first door leaf width for drawer face — drawers always span full interior
      const drawerFaceLeaf = doorLeaves[0];
      const drawerFaceFullW =
        doorOverlay.id === "inset"
          ? intW - doorGap * 2 - (isInternal ? 4 : 0)
          : isInternal
            ? intW - doorGap * 2 - 4
            : extW - doorGap * 2;
      const drawerFaceX = isInternal
        ? intX
        : doorOverlay.id === "inset"
          ? intX
          : extX;

      let drawerFaceZ = doorZ;
      if (isInternal) {
        const internalFrontZ =
          doorOverlay.id === "inset" ? bt + cD - dt - 2 : bt + cD - 2;
        drawerFaceZ = internalFrontZ - dt / 2;
      }

      const backPanelInsideZ = bt;
      const frontOfDrawerBoxZ = drawerFaceZ - dt / 2;
      const dBoxDepth = frontOfDrawerBoxZ - (backPanelInsideZ + 10);
      const dBoxZ = frontOfDrawerBoxZ - dBoxDepth / 2;

      let currentDrawerY = drawerAreaStart;

      for (let i = 0; i < drawerCount; i++) {
        const drawerHeight = drawerHeights[i] || 120;
        const drawerY = currentDrawerY + drawerHeight / 2;
        currentDrawerY += drawerHeight;

        const drawerGroupTarget = new THREE.Group();
        drawerGroupTarget.userData = {
          targetZ: 0,
          openOffset: cD * 0.65,
          isInternal,
        };

        const boxWidth = intW - 50;
        const boxHeight = drawerHeight - 15;
        const sideT = 12;

        this.createPart(
          new THREE.BoxGeometry(sideT, boxHeight, dBoxDepth),
          this.materials.drawerFace,
          intX - boxWidth / 2 + sideT / 2,
          drawerY,
          dBoxZ,
          0x444444,
          drawerGroupTarget,
        );
        this.createPart(
          new THREE.BoxGeometry(sideT, boxHeight, dBoxDepth),
          this.materials.drawerFace,
          intX + boxWidth / 2 - sideT / 2,
          drawerY,
          dBoxZ,
          0x444444,
          drawerGroupTarget,
        );
        this.createPart(
          new THREE.BoxGeometry(boxWidth - sideT * 2, boxHeight, sideT),
          this.materials.drawerFace,
          intX,
          drawerY,
          frontOfDrawerBoxZ - sideT / 2,
          0x444444,
          drawerGroupTarget,
        );
        this.createPart(
          new THREE.BoxGeometry(boxWidth - sideT * 2, boxHeight, sideT),
          this.materials.drawerFace,
          intX,
          drawerY,
          frontOfDrawerBoxZ - dBoxDepth + sideT / 2,
          0x444444,
          drawerGroupTarget,
        );
        this.createPart(
          new THREE.BoxGeometry(boxWidth - sideT * 2, 6, dBoxDepth - sideT * 2),
          this.materials.drawerFace,
          intX,
          drawerY - boxHeight / 2 + 3,
          dBoxZ,
          0x444444,
          drawerGroupTarget,
        );

        // Drawer face — always spans the full interior opening
        const dFaceGeo = new THREE.BoxGeometry(
          drawerFaceFullW,
          drawerHeight - doorGap * 2,
          dt,
        );
        this.createPart(
          dFaceGeo,
          this.materials.door,
          drawerFaceX,
          drawerY,
          drawerFaceZ,
          0x333333,
          drawerGroupTarget,
          { panelId: `section-${section.id}-drawer-${i}-face`, panelType: "drawerFace", panelLabel: `${section.label} Drawer ${i + 1} Face` },
        );

        const dHandleGeo = new THREE.CylinderGeometry(
          4,
          4,
          drawerFaceFullW * 0.45,
          16,
        ).rotateZ(Math.PI / 2);
        const handleMesh = new THREE.Mesh(dHandleGeo, this.materials.handle);
        handleMesh.position.set(
          drawerFaceX,
          drawerY,
          drawerFaceZ + dt / 2 + 15,
        );
        drawerGroupTarget.add(handleMesh);

        this.drawers.push(drawerGroupTarget);
        group.add(drawerGroupTarget);
      }
    }

    // ── 2. FIXED DIVIDERS ────────────────────────────
    if (drawerCount > 0 && placement === "custom") {
      const divGeo = new THREE.BoxGeometry(intW - 1, ct, cD - 4);
      this.createPart(
        divGeo,
        this.materials.carcass,
        intX,
        drawerAreaEnd + ct / 2,
        bt + cD / 2,
        0x333333,
        group,
      );
      this.createPart(
        divGeo,
        this.materials.carcass,
        intX,
        drawerAreaStart - ct / 2,
        bt + cD / 2,
        0x333333,
        group,
      );
    }

    // ── 3. DOORS — per-leaf using resolveDoorWidths ────────────────────────
    // buildOneDoor renders a single door leaf at a specific X position and width.
    const buildOneDoor = (leaf, startY, endY) => {
      const dHeight = endY - startY - doorGap * 2;
      if (dHeight < 50) return;

      const leafIntLeft = intX - intW / 2 + leaf._resolvedIntOffset;
      const leafExtLeft = extX - extW / 2 + leaf._resolvedExtOffset;
      const leafIntRight = leafIntLeft + leaf._resolvedIntW;
      const leafExtRight = leafExtLeft + leaf._resolvedExtW;

      const isLeftSwing = leaf.swing === "left";

      // Pivot at the hinge edge
      const pivotX =
        doorOverlay.id === "inset"
          ? isLeftSwing
            ? leafIntRight
            : leafIntLeft
          : isLeftSwing
            ? leafExtRight
            : leafExtLeft;

      const leafDoorW = leaf._resolvedDoorW;

      const doorHinge = new THREE.Group();
      doorHinge.position.set(pivotX, startY + dHeight / 2, doorZ - dt / 2);

      const doorGeo = new THREE.BoxGeometry(leafDoorW, dHeight, dt);
      // Translate so the hinge edge sits at x=0 in hinge-local space
      doorGeo.translate(
        isLeftSwing ? -leafDoorW / 2 : leafDoorW / 2,
        0,
        dt / 2,
      );

      const doorMat = this.materials.door.clone();
      doorMat.transparent = true;
      doorMat.opacity = 0.75;

      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      doorMesh.castShadow = true;
      // Tag the door mesh with a unique panelId
      const doorIdx = this._doorCounter++;
      doorMesh.userData.panelId = `section-${section.id}-door-${doorIdx}`;
      doorMesh.userData.panelType = "door";
      doorMesh.userData.panelLabel = `${section.label} Door ${leaf.label || (doorIdx + 1)}`;
      doorHinge.add(doorMesh);

      const edges = new THREE.EdgesGeometry(doorGeo);
      doorHinge.add(
        new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1.5 }),
        ),
      );

      const handleGeo = new THREE.CylinderGeometry(
        5,
        5,
        Math.min(dHeight * 0.18, 300),
        16,
      );
      const handle = new THREE.Mesh(handleGeo, this.materials.handle);
      const handleOffsetX = isLeftSwing ? -(leafDoorW - 25) : leafDoorW - 25;
      handle.position.set(handleOffsetX, 0, dt + 15);
      doorHinge.add(handle);

      doorHinge.userData = { targetY: 0, isLeftSwing };
      this.doorHinges.push(doorHinge);
      group.add(doorHinge);
    };

    // Emit all door leaves for a given vertical span
    const buildDoorsForSpan = (startY, endY) => {
      doorLeaves.forEach((leaf) => buildOneDoor(leaf, startY, endY));
    };

    const cabBottom = doorOverlay.id === "inset" ? floorY : skirtH + 2;
    const cabTop = doorOverlay.id === "inset" ? ceilingY : skirtH + H - 2;

    if (drawerCount > 0 && !isInternal) {
      if (placement === "custom") {
        buildDoorsForSpan(drawerAreaEnd + ct, cabTop);
        buildDoorsForSpan(cabBottom, drawerAreaStart - ct);
      } else if (placement === "bottom") {
        buildDoorsForSpan(drawerAreaEnd, cabTop);
      } else if (placement === "top") {
        buildDoorsForSpan(cabBottom, drawerAreaStart);
      }
    } else if (drawerCount === 0 || isInternal) {
      buildDoorsForSpan(cabBottom, cabTop);
    }

    // ── 4. SHELVES ────────────────────────────────────
    const shelfCount = section.shelves || 0;
    if (shelfCount > 0) {
      const cavities = [];
      if (placement === "custom" && drawerCount > 0) {
        if (drawerAreaStart - ct > floorY + 50)
          cavities.push({ start: floorY, end: drawerAreaStart - ct });
        if (ceilingY - (drawerAreaEnd + ct) > 50)
          cavities.push({ start: drawerAreaEnd + ct, end: ceilingY });
      } else if (shelfAreaEnd > shelfAreaStart) {
        cavities.push({ start: shelfAreaStart, end: shelfAreaEnd });
      }

      let remainingShelves = shelfCount;
      let shelfIdx = 0;
      const totalCavityHeight = cavities.reduce(
        (sum, c) => sum + (c.end - c.start),
        0,
      );

      cavities.forEach((cavity, index) => {
        const cHeight = cavity.end - cavity.start;
        const shelvesInThisCavity =
          index === cavities.length - 1
            ? remainingShelves
            : Math.round(shelfCount * (cHeight / totalCavityHeight));
        remainingShelves -= shelvesInThisCavity;

        for (let i = 0; i < shelvesInThisCavity; i++) {
          const shelfY =
            cavity.start + (i + 1) * (cHeight / (shelvesInThisCavity + 1));
          const shelfGeo = new THREE.BoxGeometry(intW - 2, 18, cD - 10);
          this.createPart(
            shelfGeo,
            this.materials.shelf,
            intX,
            shelfY,
            bt + (cD - 10) / 2,
            0x555555,
            group,
            { panelId: `section-${section.id}-cshelf-${shelfIdx}`, panelType: "shelf", panelLabel: `${section.label} Shelf ${shelfIdx + 1}` },
          );
          shelfIdx++;
        }
      });
    }
  }

  createDimensionLabel(text, position) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    // Double the resolution for crisp, anti-aliased text
    canvas.width = 512;
    canvas.height = 128;

    // 1. Draw a white pill background with a subtle border
    const radius = 32;
    const x = 96,
      y = 24,
      w = 320,
      h = 80;

    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();

    context.fillStyle = "rgba(255, 255, 255, 0.9)";
    context.fill();
    context.strokeStyle = "#cbd5e1"; // Light grey border
    context.lineWidth = 3;
    context.stroke();

    // 2. Draw the crisp text
    context.font = '600 36px "IBM Plex Mono", system-ui, monospace';
    context.fillStyle = "#334155"; // Dark slate grey text
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 256, 64);

    // 3. Create the Sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; // Ensures text stays sharp when zooming

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Scale matches the 4:1 aspect ratio of the canvas
    sprite.scale.set(600, 150, 1);
    sprite.position.copy(position);
    sprite.renderOrder = 999; // Ensure labels always render on top of lines

    return sprite;
  }

  addDimensionAnnotations(L, H, D) {
    this.dimensionLines.forEach((line) => this.scene.remove(line));
    this.dimensionLines = [];

    const lineColor = 0x64748b; // Professional Slate Grey
    const lineMaterial = new THREE.LineBasicMaterial({
      color: lineColor,
      linewidth: 1.5,
    });

    // Helper function to draw a line and its end ticks
    const drawCADLine = (p1, p2, tickDir) => {
      // Main Line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const line = new THREE.Line(lineGeo, lineMaterial);
      this.scene.add(line);
      this.dimensionLines.push(line);

      // Ticks (perpendicular markers at the ends)
      const tickSize = 20;
      const t1Geo = new THREE.BufferGeometry().setFromPoints([
        p1.clone().addScaledVector(tickDir, tickSize),
        p1.clone().addScaledVector(tickDir, -tickSize),
      ]);
      const t1 = new THREE.Line(t1Geo, lineMaterial);
      this.scene.add(t1);
      this.dimensionLines.push(t1);

      const t2Geo = new THREE.BufferGeometry().setFromPoints([
        p2.clone().addScaledVector(tickDir, tickSize),
        p2.clone().addScaledVector(tickDir, -tickSize),
      ]);
      const t2 = new THREE.Line(t2Geo, lineMaterial);
      this.scene.add(t2);
      this.dimensionLines.push(t2);
    };

    const offset = 120; // Distance from the cabinet

    // 1. WIDTH (Bottom Front)
    const wP1 = new THREE.Vector3(-L / 2, -offset, D / 2 + offset / 2);
    const wP2 = new THREE.Vector3(L / 2, -offset, D / 2 + offset / 2);
    drawCADLine(wP1, wP2, new THREE.Vector3(0, 0, 1)); // Ticks point on Z axis

    const widthLabel = this.createDimensionLabel(
      `W: ${L} mm`,
      new THREE.Vector3(0, -offset, D / 2 + offset / 2),
    );
    this.scene.add(widthLabel);
    this.dimensionLines.push(widthLabel);

    // 2. HEIGHT (Left Front)
    const hP1 = new THREE.Vector3(-L / 2 - offset, 0, D / 2);
    const hP2 = new THREE.Vector3(-L / 2 - offset, H, D / 2);
    drawCADLine(hP1, hP2, new THREE.Vector3(1, 0, 0)); // Ticks point on X axis

    const heightLabel = this.createDimensionLabel(
      `H: ${H} mm`,
      new THREE.Vector3(-L / 2 - offset, H / 2, D / 2),
    );
    this.scene.add(heightLabel);
    this.dimensionLines.push(heightLabel);

    // 3. DEPTH (Right Bottom)
    const dP1 = new THREE.Vector3(L / 2 + offset, -offset, -D / 2);
    const dP2 = new THREE.Vector3(L / 2 + offset, -offset, D / 2);
    drawCADLine(dP1, dP2, new THREE.Vector3(1, 0, 0)); // Ticks point on X axis

    const depthLabel = this.createDimensionLabel(
      `D: ${D} mm`,
      new THREE.Vector3(L / 2 + offset, -offset, 0),
    );
    this.scene.add(depthLabel);
    this.dimensionLines.push(depthLabel);
  }

  setupEventListeners() {
    window.addEventListener("resize", () => this.onWindowResize(), false);
    this.renderer.domElement.addEventListener(
      "mousemove",
      (e) => this.onMouseMove(e),
      false,
    );
    this.renderer.domElement.addEventListener(
      "click",
      (e) => this.onClick(e),
      false,
    );
    window.addEventListener("keydown", (e) => this.onKeyDown(e), false);
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  updateHighlighting() {
    this.cabinetGroup.traverse((obj) => {
      if (obj.isMesh && obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial;
      }
    });

    if (this.selectedSection) {
      this.selectedSection.traverse((obj) => {
        if (obj.isMesh && obj.userData.originalMaterial)
          obj.material = this.materials.highlight;
      });
    }

    if (this.hoveredSection && this.hoveredSection !== this.selectedSection) {
      this.hoveredSection.traverse((obj) => {
        if (obj.isMesh && obj.userData.originalMaterial)
          obj.material = this.materials.hover;
      });
    }

    // Panel-level selection glow — overrides section highlighting for the single mesh
    if (this.selectedPanel && this.selectedPanel.isMesh) {
      const panelHighlight = this.materials.highlight.clone();
      panelHighlight.emissive.set(0x00aaff);
      panelHighlight.emissiveIntensity = 0.5;
      panelHighlight.opacity = 0.85;
      panelHighlight.transparent = true;
      this.selectedPanel.material = panelHighlight;
    }
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.cabinetGroup.children,
      true,
    );

    let activeSection = null;
    if (intersects.length > 0) {
      let parent = intersects[0].object;
      while (parent && parent !== this.cabinetGroup) {
        if (parent.userData && parent.userData.section) {
          activeSection = parent;
          break;
        }
        parent = parent.parent;
      }
    }

    if (this.hoveredSection !== activeSection) {
      this.hoveredSection = activeSection;
      this.updateHighlighting();
    }
    this.renderer.domElement.style.cursor = activeSection
      ? "pointer"
      : "default";
  }

  onClick(event) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.cabinetGroup.children,
      true,
    );

    // Find the first mesh with a panelId
    let clickedPanel = null;
    if (intersects.length > 0) {
      for (const hit of intersects) {
        if (hit.object.isMesh && hit.object.userData.panelId) {
          clickedPanel = hit.object;
          break;
        }
      }
    }

    // Toggle panel selection
    if (clickedPanel) {
      this.selectedPanel =
        this.selectedPanel === clickedPanel ? null : clickedPanel;
    } else {
      this.selectedPanel = null;
    }

    // Also maintain section-level selection for ConfigPanel sync
    if (this.hoveredSection) {
      this.selectedSection =
        this.selectedSection === this.hoveredSection
          ? null
          : this.hoveredSection;
    } else {
      this.selectedSection = null;
    }

    this.updateHighlighting();

    // Dispatch panel-level event
    this.container.dispatchEvent(
      new CustomEvent("panelselected", {
        detail: this.selectedPanel
          ? {
              panelId: this.selectedPanel.userData.panelId,
              panelType: this.selectedPanel.userData.panelType,
              panelLabel: this.selectedPanel.userData.panelLabel,
            }
          : null,
      }),
    );

    // Dispatch section-level event (existing behavior)
    this.container.dispatchEvent(
      new CustomEvent("sectionselected", {
        detail: {
          section: this.selectedSection
            ? this.selectedSection.userData.section
            : null,
        },
      }),
    );
  }

  onKeyDown(event) {
    const maxDim = Math.max(
      this.config.overall.length,
      this.config.overall.height,
      this.config.overall.depth,
    );
    switch (event.key.toLowerCase()) {
      case "a":
        this.axesHelper.visible = !this.axesHelper.visible;
        break;
      case "r":
        this.centerCamera(
          this.config.overall.length,
          this.config.overall.height + 100,
          this.config.overall.depth,
        );
        break;
      case "f":
        this.camera.position.set(
          0,
          this.config.overall.height / 2,
          maxDim * 1.5,
        );
        this.controls.target.set(0, this.config.overall.height / 2, 0);
        break;
      case "s":
        this.camera.position.set(
          maxDim * 1.5,
          this.config.overall.height / 2,
          0,
        );
        this.controls.target.set(0, this.config.overall.height / 2, 0);
        break;
      case "t":
        this.camera.position.set(0, maxDim * 2, 0);
        this.controls.target.set(0, 0, 0);
        break;
    }
  }

  centerCamera(L, H, D) {
    const maxDim = Math.max(L, H, D);
    const distance = maxDim * 1.8;
    this.camera.position.set(-distance * 0.4, H * 0.8, distance * 0.8);
    this.controls.target.set(0, H * 0.5, 0);
    this.controls.update();
  }

  updateConfig(newConfig) {
    this.config = newConfig;
    this.buildCabinet();
  }

  /**
   * Apply per-panel colors from a map of { panelId: hexColor }.
   * Clones materials so each panel can have an independent color.
   */
  applyPanelColors(colorMap) {
    this.panelColorMap = colorMap || {};
    if (!this.cabinetGroup) return;

    this.cabinetGroup.traverse((obj) => {
      if (!obj.isMesh || !obj.userData.panelId) return;

      const color = colorMap[obj.userData.panelId];
      if (color) {
        // Clone material so panels have independent colors
        if (!obj.userData.hasCustomColor) {
          obj.material = obj.material.clone();
          obj.userData.hasCustomColor = true;
        }
        obj.material.color.set(color);
        // Update originalMaterial so highlighting can restore the custom color
        obj.userData.originalMaterial = obj.material;
      } else if (obj.userData.hasCustomColor) {
        // Reset to default material type
        const defaultMat = this.materials[obj.userData.panelType] || this.materials.carcass;
        obj.material = defaultMat.clone();
        obj.userData.hasCustomColor = false;
        obj.userData.originalMaterial = obj.material;
      }
    });
  }

  animate() {
    if (this._disposed) return;
    requestAnimationFrame(() => this.animate());

    const lerpFactor = 0.1;

    if (this.doorHinges.length > 0) {
      this.doorHinges.forEach((door) => {
        door.rotation.y +=
          (door.userData.targetY - door.rotation.y) * lerpFactor;
      });
    }

    if (this.drawers.length > 0) {
      this.drawers.forEach((drawer) => {
        drawer.position.z +=
          (drawer.userData.targetZ - drawer.position.z) * lerpFactor;
      });
    }

    const explodeDistance = 350;
    if (this.cabinetGroup) {
      this.cabinetGroup.traverse((obj) => {
        if (
          (obj.isMesh || obj.isLineSegments) &&
          obj.userData.originalPosition
        ) {
          const targetPos = obj.userData.originalPosition.clone();
          if (this.isExploded) {
            targetPos.add(
              obj.userData.explodeDirection
                .clone()
                .multiplyScalar(explodeDistance),
            );
          }
          obj.position.lerp(targetPos, lerpFactor);
        }
      });
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._disposed = true;
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }

    this.dimensionLines.forEach((line) => {
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
    });

    this.controls.dispose();
    this.renderer.dispose();

    if (
      this.renderer.domElement &&
      this.container.contains(this.renderer.domElement)
    )
      this.container.removeChild(this.renderer.domElement);
    window.removeEventListener("resize", () => this.onWindowResize());
    window.removeEventListener("keydown", () => {});
  }
}
