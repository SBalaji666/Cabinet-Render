import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DOOR_OVERLAY_TYPES } from "../data/constants.js"; // Ensure this import is available

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
    this.dimensionLines = [];

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
      door.userData.targetY = this.isDoorsOpen ? -Math.PI / 2.0 : 0;
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
    if (this.toggleButton) this.toggleButton.innerText = "Open Doors & Drawers";

    this.cabinetGroup = new THREE.Group();
    this.cabinetGroup.name = "cabinet";
    this.materials = this.createMaterials();

    const {
      overall,
      materials: matThickness,
      sections,
      hardware,
    } = this.config;
    const { length: L, height: H, depth: D } = overall;
    const ct = matThickness.carcass,
      bt = matThickness.back,
      dt = matThickness.door;
    const plinthH = hardware?.plinth
      ? parseInt(hardware.plinth.split("-")[1]) || 100
      : 100;
    const doorOverlay =
      DOOR_OVERLAY_TYPES[hardware?.doorOverlay] || DOOR_OVERLAY_TYPES.full;

    // Derived Depths mirroring cutlist logic
    const bumperGap = 1;
    const carcassDepth =
      doorOverlay.id !== "inset" ? D - bt - dt - bumperGap : D - bt;

    this.cabinetGroup.position.set(-L / 2, 0, -D / 2);

    this.buildCarcassStructure(L, H, D, ct, bt, plinthH, carcassDepth);
    this.buildSections(
      sections,
      L,
      H,
      D,
      ct,
      bt,
      dt,
      plinthH,
      carcassDepth,
      doorOverlay,
    );
    this.addDimensionAnnotations(L, H + plinthH, D);

    this.setupObjectMetadata();
    this.scene.add(this.cabinetGroup);
    this.centerCamera(L, H + plinthH, D);
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

  createPart(geo, mat, x, y, z, edgeColor, group) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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

  buildCarcassStructure(L, H, D, ct, bt, plinthH, cD) {
    const mats = this.materials;
    const cZ = bt + cD / 2; // Z-centre of carcass depth

    // ── 1. SIDE PANELS (full height: plinth + box, floor to top) ──────────
    // Height = plinthH + H - ct  (sits under the top panel, starts from floor)
    const fullSideH = plinthH + H - ct;
    const sideGeo = new THREE.BoxGeometry(ct, fullSideH, cD);
    const sideY = fullSideH / 2; // centred from y=0 up to plinthH+H-ct

    // Left side panel
    this.createPart(
      sideGeo,
      mats.carcass,
      ct / 2,
      sideY,
      cZ,
      0x333333,
      this.cabinetGroup,
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
    );

    // ── 2. TOP PANEL (full width, caps both side panels) ──────────────────
    const topGeo = new THREE.BoxGeometry(L, ct, cD);
    this.createPart(
      topGeo,
      mats.carcass,
      L / 2,
      plinthH + H - ct / 2,
      cZ,
      0x555555,
      this.cabinetGroup,
    );

    // ── 3. BOTTOM PANEL (sits between side panels, at plinth top) ─────────
    const botGeo = new THREE.BoxGeometry(L - ct * 2, ct, cD);
    this.createPart(
      botGeo,
      mats.carcass,
      L / 2,
      plinthH + ct / 2,
      cZ,
      0x333333,
      this.cabinetGroup,
    );

    // ── 4. PLINTH FRONT RAIL (toe-kick board, between the side panels) ────
    // Only rendered if plinth exists. Sits at the very front of the cabinet.
    if (plinthH > 0) {
      const pFrontGeo = new THREE.BoxGeometry(L - ct * 2, plinthH, ct);
      this.createPart(
        pFrontGeo,
        mats.carcass,
        L / 2,
        plinthH / 2,
        bt + cD - ct / 2, // flush with the front face of the carcass
        0x333333,
        this.cabinetGroup,
      );

      // NOTE: Plinth SIDE rails are intentionally omitted here.
      // The extended side panels already visually enclose the plinth zone.
      // The physical side plinth rails still appear in the CUT LIST
      // (generateCutList) as separate parts — this is correct because in
      // real construction the side panels are one tall board and the plinth
      // rails are glued/screwed behind them for rigidity. The 3D view just
      // shows the clean combined outer face.
    }

    // ── 5. BACK PANEL (plant-on, covers full height including plinth zone) ─
    const backGeo = new THREE.BoxGeometry(L, H, bt);
    this.createPart(
      backGeo,
      mats.back,
      L / 2,
      plinthH + H / 2,
      bt / 2,
      0x666666,
      this.cabinetGroup,
    );
  }

  buildSections(sections, L, H, D, ct, bt, dt, plinthH, cD, doorOverlay) {
    const dividerCount = sections.length - 1;
    const totalInternalWidth = L - ct * 2 - dividerCount * ct;
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
        const divGeo = new THREE.BoxGeometry(ct, H - ct * 2, cD);
        this.createPart(
          divGeo,
          this.materials.carcass,
          currentIntX + ct / 2,
          plinthH + H / 2,
          bt + cD / 2,
          0x333333,
          sectionGroup,
        );
        currentIntX += ct;
        // FIX BUG 1: also advance the exterior pointer past the divider
        currentExtX += ct;
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
          plinthH,
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
          plinthH,
          section,
          doorOverlay,
        );
      }

      this.cabinetGroup.add(sectionGroup);
      currentIntX += section.intW;
      currentExtX += section.extW;
    });
  }

  buildOpenSection(group, bounds, H, cD, ct, bt, plinthH, section) {
    const { intX, intW } = bounds;
    const shelfCount = section.shelves || 0;
    const internalH = H - ct * 2;

    if (shelfCount > 0) {
      const shelfSpacing = internalH / (shelfCount + 1);
      for (let i = 0; i < shelfCount; i++) {
        const shelfY = plinthH + ct + (i + 1) * shelfSpacing;
        const shelfGeo = new THREE.BoxGeometry(intW - 2, 18, cD - 10); // 10mm setback
        this.createPart(
          shelfGeo,
          this.materials.shelf,
          intX,
          shelfY,
          bt + (cD - 10) / 2,
          0x555555,
          group,
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
    plinthH,
    section,
    doorOverlay,
  ) {
    const { intX, intW, extX, extW } = bounds;
    const doorGap = 1;

    // Width logic (Inset vs Overlay)
    const doorWidth =
      doorOverlay.id === "inset" ? intW - doorGap * 2 : extW - doorGap * 2;
    const doorZ =
      doorOverlay.id === "inset" ? bt + cD - dt / 2 : bt + cD + 1 + dt / 2;

    const drawerCount = section.drawers?.count || 0;
    const drawerHeights = section.drawers?.heights || []; // NEW: Array of heights
    const placement = section.drawers?.placement || "bottom";
    const isInternal = section.drawers?.isInternal || false; // NEW: Explicit toggle

    const floorY = plinthH + ct;
    const ceilingY = plinthH + H - ct;

    let drawerAreaStart = floorY,
      drawerAreaEnd = ceilingY;
    let shelfAreaStart = floorY,
      shelfAreaEnd = ceilingY;

    // ── 1. DRAWERS ────────────────────────────
    if (drawerCount > 0) {
      // Calculate total height using the individual heights array
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

      // Track the Y position progressively as we stack drawers of varying heights
      let currentDrawerY = drawerAreaStart;

      for (let i = 0; i < drawerCount; i++) {
        // Read the specific height for this drawer
        const drawerHeight = drawerHeights[i] || 120;

        // Calculate center Y for this specific drawer
        const drawerY = currentDrawerY + drawerHeight / 2;
        currentDrawerY += drawerHeight; // Advance the pointer for the next drawer

        const drawerGroupTarget = new THREE.Group();
        drawerGroupTarget.userData = {
          targetZ: 0,
          openOffset: cD * 0.65,
          isInternal,
        };

        // Calculate proper Z depths for internal vs exposed drawer faces
        let drawerFaceZ = doorZ;
        if (isInternal) {
          const internalFrontZ =
            doorOverlay.id === "inset" ? bt + cD - dt - 2 : bt + cD - 2;
          drawerFaceZ = internalFrontZ - dt / 2;
        }

        // ─── PERFECT DRAWER BOX MATH ───
        const backPanelInsideZ = bt;
        const frontOfDrawerBoxZ = drawerFaceZ - dt / 2;
        const dBoxDepth = frontOfDrawerBoxZ - (backPanelInsideZ + 10);
        const dBoxZ = frontOfDrawerBoxZ - dBoxDepth / 2;

        const boxWidth = intW - 50;
        const boxHeight = drawerHeight - 15;
        const sideT = 12;

        // Left Side
        const leftGeo = new THREE.BoxGeometry(sideT, boxHeight, dBoxDepth);
        this.createPart(
          leftGeo,
          this.materials.drawerFace,
          intX - boxWidth / 2 + sideT / 2,
          drawerY,
          dBoxZ,
          0x444444,
          drawerGroupTarget,
        );

        // Right Side
        const rightGeo = new THREE.BoxGeometry(sideT, boxHeight, dBoxDepth);
        this.createPart(
          rightGeo,
          this.materials.drawerFace,
          intX + boxWidth / 2 - sideT / 2,
          drawerY,
          dBoxZ,
          0x444444,
          drawerGroupTarget,
        );

        // Front Side
        const frontGeo = new THREE.BoxGeometry(
          boxWidth - sideT * 2,
          boxHeight,
          sideT,
        );
        this.createPart(
          frontGeo,
          this.materials.drawerFace,
          intX,
          drawerY,
          frontOfDrawerBoxZ - sideT / 2,
          0x444444,
          drawerGroupTarget,
        );

        // Back Side
        const backGeo = new THREE.BoxGeometry(
          boxWidth - sideT * 2,
          boxHeight,
          sideT,
        );
        this.createPart(
          backGeo,
          this.materials.drawerFace,
          intX,
          drawerY,
          frontOfDrawerBoxZ - dBoxDepth + sideT / 2,
          0x444444,
          drawerGroupTarget,
        );

        // Bottom Panel
        const bottomGeo = new THREE.BoxGeometry(
          boxWidth - sideT * 2,
          6,
          dBoxDepth - sideT * 2,
        );
        this.createPart(
          bottomGeo,
          this.materials.drawerFace,
          intX,
          drawerY - boxHeight / 2 + 3,
          dBoxZ,
          0x444444,
          drawerGroupTarget,
        );

        // Drawer Face
        const currentDoorWidth = isInternal
          ? intW - doorGap * 2 - 4
          : doorWidth;
        const currentFaceX = isInternal
          ? intX
          : doorOverlay.id === "inset"
            ? intX
            : extX;

        const dFaceGeo = new THREE.BoxGeometry(
          currentDoorWidth,
          drawerHeight - doorGap * 2,
          dt,
        );
        this.createPart(
          dFaceGeo,
          this.materials.door,
          currentFaceX,
          drawerY,
          drawerFaceZ,
          0x333333,
          drawerGroupTarget,
        );

        // Handle
        const dHandleGeo = new THREE.CylinderGeometry(
          4,
          4,
          currentDoorWidth * 0.45,
          16,
        ).rotateZ(Math.PI / 2);
        const handleMesh = new THREE.Mesh(dHandleGeo, this.materials.handle);
        handleMesh.position.set(
          currentFaceX,
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

    // ── 3. DOORS ────────────────────────────────────
    const buildDoor = (startY, endY) => {
      const dHeight = endY - startY - doorGap * 2;
      if (dHeight < 50) return;

      // FIX BUG 2: pivot is always at the interior left edge for inset,
      // exterior left edge for overlay — consistently use intX vs extX
      const pivotX =
        doorOverlay.id === "inset"
          ? intX - intW / 2 // FIX: was `intX - doorWidth / 2` (same, but explicit)
          : extX - extW / 2; // FIX: was `extX - doorWidth / 2` — now uses full extW

      const doorHinge = new THREE.Group();
      doorHinge.position.set(pivotX, startY + dHeight / 2, doorZ - dt / 2);

      const doorGeo = new THREE.BoxGeometry(doorWidth, dHeight, dt);
      doorGeo.translate(doorWidth / 2, 0, dt / 2);

      const doorMat = this.materials.door.clone();
      doorMat.transparent = true;
      doorMat.opacity = 0.75;

      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      doorMesh.castShadow = true;
      doorHinge.add(doorMesh);

      const edges = new THREE.EdgesGeometry(doorGeo);
      const lines = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1.5 }),
      );
      doorHinge.add(lines);

      const handleGeo = new THREE.CylinderGeometry(
        5,
        5,
        Math.min(dHeight * 0.18, 300),
        16,
      );
      const handle = new THREE.Mesh(handleGeo, this.materials.handle);
      handle.position.set(doorWidth - 25, 0, dt + 15);
      doorHinge.add(handle);

      doorHinge.userData = { targetY: 0 };
      this.doorHinges.push(doorHinge);
      group.add(doorHinge);
    };

    const cabBottom = doorOverlay.id === "inset" ? floorY : plinthH + 2;
    const cabTop = doorOverlay.id === "inset" ? ceilingY : plinthH + H - 2;

    // FIX BUG 3: `placement === "full"` must NOT generate any door
    if (drawerCount > 0 && !isInternal) {
      if (placement === "custom") {
        buildDoor(drawerAreaEnd + ct, cabTop);
        buildDoor(cabBottom, drawerAreaStart - ct);
      } else if (placement === "bottom") {
        buildDoor(drawerAreaEnd, cabTop);
      } else if (placement === "top") {
        buildDoor(cabBottom, drawerAreaStart);
      }
      // FIX: `placement === "full"` intentionally generates NO door here
    } else if (drawerCount === 0 || isInternal) {
      // Only generate the full-height door when there are no external drawers
      buildDoor(cabBottom, cabTop);
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
          );
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
    if (this.hoveredSection) {
      this.selectedSection =
        this.selectedSection === this.hoveredSection
          ? null
          : this.hoveredSection;
      this.updateHighlighting();
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
