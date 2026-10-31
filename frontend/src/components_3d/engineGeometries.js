import * as THREE from 'three';
import { baseMaterials } from './materials.js';
import { COMPONENT_METADATA } from '../utils/componentSensorMap.js';

/**
 * Procedural 3D Turbofan Jet Engine Geometry Builder
 * Generates lightweight, recognizable aerospace components aligned along Z-axis.
 * Coordinates: +Z is forward (intake), -Z is aft (exhaust).
 */

/**
 * 1. FAN & SPINNER (Low-Pressure Spool)
 * 24 wide-chord titanium blades, hub ring, and forward spinner cone.
 */
export function createFan(customMat = null) {
  const fanGroup = new THREE.Group();
  fanGroup.name = 'fan_assembly';
  fanGroup.userData = { componentId: 'fan', spool: 'N1', baseZ: COMPONENT_METADATA.fan.zOffset };

  const mat = customMat || baseMaterials.titanium;

  // Central Spinner Nose Cone
  const spinnerGeom = new THREE.ConeGeometry(0.85, 2.2, 32);
  spinnerGeom.rotateX(Math.PI / 2); // Point forward along +Z
  spinnerGeom.translate(0, 0, 1.1);
  const spinnerMesh = new THREE.Mesh(spinnerGeom, baseMaterials.spinner);
  spinnerMesh.userData = { componentId: 'fan' };
  fanGroup.add(spinnerMesh);

  // Fan Hub Drum
  const hubGeom = new THREE.CylinderGeometry(0.95, 0.95, 0.9, 32);
  hubGeom.rotateX(Math.PI / 2);
  const hubMesh = new THREE.Mesh(hubGeom, mat);
  hubMesh.userData = { componentId: 'fan' };
  fanGroup.add(hubMesh);

  // 24 Aerodynamic Wide-Chord Fan Blades
  const bladeCount = 24;
  const bladeLength = 2.4;
  const bladeGeom = new THREE.BoxGeometry(0.28, bladeLength, 0.04);
  bladeGeom.translate(0, bladeLength / 2, 0); // Origin at blade root

  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2;
    const blade = new THREE.Mesh(bladeGeom, mat);
    blade.position.set(Math.cos(angle) * 0.9, Math.sin(angle) * 0.9, -0.1);
    // Orient radially and apply 28-degree aerodynamic twist
    blade.rotation.z = angle - Math.PI / 2;
    blade.rotation.y = 0.48; // ~28 deg twist angle
    blade.userData = { componentId: 'fan' };
    fanGroup.add(blade);
  }

  fanGroup.position.z = COMPONENT_METADATA.fan.zOffset;
  return fanGroup;
}

/**
 * 2. LOW-PRESSURE COMPRESSOR (LPC / Booster)
 * 3-stage axial compressor discs diminishing in radius toward core.
 */
export function createLPC(customMat = null) {
  const lpcGroup = new THREE.Group();
  lpcGroup.name = 'lpc_assembly';
  lpcGroup.userData = { componentId: 'lpc', spool: 'N1', baseZ: COMPONENT_METADATA.lpc.zOffset };

  const mat = customMat || baseMaterials.titanium;
  const stages = [
    { radius: 1.9, length: 0.35, z: 0.45, blades: 28 },
    { radius: 1.75, length: 0.35, z: 0.0, blades: 32 },
    { radius: 1.6, length: 0.35, z: -0.45, blades: 36 }
  ];

  // Core Central Shaft
  const shaftGeom = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 24);
  shaftGeom.rotateX(Math.PI / 2);
  const shaft = new THREE.Mesh(shaftGeom, baseMaterials.shaft);
  shaft.userData = { componentId: 'lpc' };
  lpcGroup.add(shaft);

  // Rotor Discs & Radial Blade Fins
  stages.forEach((stg) => {
    const discGeom = new THREE.CylinderGeometry(stg.radius * 0.55, stg.radius * 0.55, stg.length, 24);
    discGeom.rotateX(Math.PI / 2);
    const disc = new THREE.Mesh(discGeom, mat);
    disc.position.z = stg.z;
    disc.userData = { componentId: 'lpc' };
    lpcGroup.add(disc);

    // Blade Ring Fins
    const finHeight = stg.radius * 0.48;
    const finGeom = new THREE.BoxGeometry(0.12, finHeight, 0.03);
    finGeom.translate(0, finHeight / 2, 0);

    for (let b = 0; b < stg.blades; b++) {
      const theta = (b / stg.blades) * Math.PI * 2;
      const fin = new THREE.Mesh(finGeom, mat);
      fin.position.set(Math.cos(theta) * (stg.radius * 0.55), Math.sin(theta) * (stg.radius * 0.55), stg.z);
      fin.rotation.z = theta - Math.PI / 2;
      fin.rotation.y = 0.35;
      fin.userData = { componentId: 'lpc' };
      lpcGroup.add(fin);
    }
  });

  lpcGroup.position.z = COMPONENT_METADATA.lpc.zOffset;
  return lpcGroup;
}

/**
 * 3. HIGH-PRESSURE COMPRESSOR (HPC)
 * 5 high-density titanium rotor stages tapering down toward the combustor.
 * Primary degradation focal point in NASA C-MAPSS.
 */
export function createHPC(customMat = null) {
  const hpcGroup = new THREE.Group();
  hpcGroup.name = 'hpc_assembly';
  hpcGroup.userData = { componentId: 'hpc', spool: 'N2', baseZ: COMPONENT_METADATA.hpc.zOffset };

  const mat = customMat || baseMaterials.titanium;

  // Heavy Tapered Compressor Spool Drum
  const drumGeom = new THREE.CylinderGeometry(0.65, 0.8, 2.2, 32);
  drumGeom.rotateX(Math.PI / 2);
  const drum = new THREE.Mesh(drumGeom, mat);
  drum.userData = { componentId: 'hpc' };
  hpcGroup.add(drum);

  // 5 High-Density Rotor Stages Tapering Backwards
  const hpcStages = [
    { r: 1.48, z: 0.85, count: 40 },
    { r: 1.38, z: 0.42, count: 44 },
    { r: 1.28, z: 0.0, count: 48 },
    { r: 1.18, z: -0.42, count: 52 },
    { r: 1.08, z: -0.85, count: 56 }
  ];

  hpcStages.forEach((stg) => {
    // Rotor Disc Edge
    const ringGeom = new THREE.TorusGeometry(stg.r, 0.06, 12, 32);
    const ring = new THREE.Mesh(ringGeom, mat);
    ring.position.z = stg.z;
    ring.userData = { componentId: 'hpc' };
    hpcGroup.add(ring);

    // Micro Rotor Blades
    const hpcBladeH = (stg.r - 0.75);
    const hpcBladeGeom = new THREE.BoxGeometry(0.08, hpcBladeH, 0.02);
    hpcBladeGeom.translate(0, hpcBladeH / 2, 0);

    for (let b = 0; b < stg.count; b++) {
      const a = (b / stg.count) * Math.PI * 2;
      const bMesh = new THREE.Mesh(hpcBladeGeom, mat);
      bMesh.position.set(Math.cos(a) * 0.75, Math.sin(a) * 0.75, stg.z);
      bMesh.rotation.z = a - Math.PI / 2;
      bMesh.rotation.y = 0.4;
      bMesh.userData = { componentId: 'hpc' };
      hpcGroup.add(bMesh);
    }
  });

  hpcGroup.position.z = COMPONENT_METADATA.hpc.zOffset;
  return hpcGroup;
}

/**
 * 4. ANNULAR COMBUSTOR (Combustion Chamber)
 * Annular casing, flame liner, and 16 radial fuel nozzle injectors.
 */
export function createCombustor(customMat = null) {
  const combustorGroup = new THREE.Group();
  combustorGroup.name = 'combustor_assembly';
  combustorGroup.userData = { componentId: 'combustor', spool: 'Static', baseZ: COMPONENT_METADATA.combustor.zOffset };

  const mat = customMat || baseMaterials.combustor;

  // Outer Annular Flame Casing
  const outerGeom = new THREE.CylinderGeometry(1.42, 1.42, 1.35, 32, 1, true);
  outerGeom.rotateX(Math.PI / 2);
  const outerMesh = new THREE.Mesh(outerGeom, mat);
  outerMesh.userData = { componentId: 'combustor' };
  combustorGroup.add(outerMesh);

  // Inner Core Liner
  const innerGeom = new THREE.CylinderGeometry(0.72, 0.72, 1.35, 32, 1, true);
  innerGeom.rotateX(Math.PI / 2);
  const innerMesh = new THREE.Mesh(innerGeom, mat);
  innerMesh.userData = { componentId: 'combustor' };
  combustorGroup.add(innerMesh);

  // 16 Fuel Nozzle Injectors arranged around the forward dome
  const nozzleCount = 16;
  const nozzleGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12);
  nozzleGeom.rotateX(Math.PI / 2);

  for (let i = 0; i < nozzleCount; i++) {
    const angle = (i / nozzleCount) * Math.PI * 2;
    const r = 1.05;
    const nozzle = new THREE.Mesh(nozzleGeom, baseMaterials.copperBrass);
    nozzle.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0.6);
    nozzle.userData = { componentId: 'combustor' };
    combustorGroup.add(nozzle);
  }

  // Flame Swirl Dome Ring
  const domeRingGeom = new THREE.RingGeometry(0.72, 1.42, 32);
  const domeRing = new THREE.Mesh(domeRingGeom, mat);
  domeRing.position.z = 0.65;
  domeRing.userData = { componentId: 'combustor' };
  combustorGroup.add(domeRing);

  combustorGroup.position.z = COMPONENT_METADATA.combustor.zOffset;
  return combustorGroup;
}

/**
 * 5. HIGH-PRESSURE TURBINE (HPT)
 * Two-stage high-temp nickel superalloy turbine disc.
 */
export function createHPT(customMat = null) {
  const hptGroup = new THREE.Group();
  hptGroup.name = 'hpt_assembly';
  hptGroup.userData = { componentId: 'hpt', spool: 'N2', baseZ: COMPONENT_METADATA.hpt.zOffset };

  const mat = customMat || baseMaterials.turbine;

  // Central Disc Hub
  const hubGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.75, 24);
  hubGeom.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeom, mat);
  hub.userData = { componentId: 'hpt' };
  hptGroup.add(hub);

  // 2 HPT Turbine Stages
  const hptStages = [
    { z: 0.22, r: 1.32, blades: 38 },
    { z: -0.22, r: 1.35, blades: 42 }
  ];

  hptStages.forEach((stg) => {
    const bladeH = stg.r - 0.7;
    const bladeGeom = new THREE.BoxGeometry(0.14, bladeH, 0.035);
    bladeGeom.translate(0, bladeH / 2, 0);

    for (let i = 0; i < stg.blades; i++) {
      const th = (i / stg.blades) * Math.PI * 2;
      const bMesh = new THREE.Mesh(bladeGeom, mat);
      bMesh.position.set(Math.cos(th) * 0.7, Math.sin(th) * 0.7, stg.z);
      bMesh.rotation.z = th - Math.PI / 2;
      bMesh.rotation.y = -0.45; // Curved for expansion extraction
      bMesh.userData = { componentId: 'hpt' };
      hptGroup.add(bMesh);
    }
  });

  hptGroup.position.z = COMPONENT_METADATA.hpt.zOffset;
  return hptGroup;
}

/**
 * 6. LOW-PRESSURE TURBINE (LPT)
 * 4-stage larger-diameter turbine driving the low-pressure fan spool.
 */
export function createLPT(customMat = null) {
  const lptGroup = new THREE.Group();
  lptGroup.name = 'lpt_assembly';
  lptGroup.userData = { componentId: 'lpt', spool: 'N1', baseZ: COMPONENT_METADATA.lpt.zOffset };

  const mat = customMat || baseMaterials.turbine;

  // Expanding Exhaust Shaft Cone
  const shaftGeom = new THREE.CylinderGeometry(0.65, 0.45, 1.8, 24);
  shaftGeom.rotateX(Math.PI / 2);
  const shaft = new THREE.Mesh(shaftGeom, baseMaterials.shaft);
  shaft.userData = { componentId: 'lpt' };
  lptGroup.add(shaft);

  // 4 Stages expanding in diameter toward tail cone
  const lptStages = [
    { z: 0.65, r: 1.42, blades: 36 },
    { z: 0.22, r: 1.55, blades: 40 },
    { z: -0.22, r: 1.68, blades: 44 },
    { z: -0.65, r: 1.82, blades: 48 }
  ];

  lptStages.forEach((stg) => {
    const bLen = stg.r - 0.6;
    const bGeom = new THREE.BoxGeometry(0.16, bLen, 0.04);
    bGeom.translate(0, bLen / 2, 0);

    for (let i = 0; i < stg.blades; i++) {
      const a = (i / stg.blades) * Math.PI * 2;
      const bMesh = new THREE.Mesh(bGeom, mat);
      bMesh.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, stg.z);
      bMesh.rotation.z = a - Math.PI / 2;
      bMesh.rotation.y = -0.52;
      bMesh.userData = { componentId: 'lpt' };
      lptGroup.add(bMesh);
    }
  });

  // Tail Exhaust Centerbody Plug
  const tailPlugGeom = new THREE.ConeGeometry(0.48, 1.6, 24);
  tailPlugGeom.rotateX(-Math.PI / 2);
  tailPlugGeom.translate(0, 0, -1.65);
  const tailPlug = new THREE.Mesh(tailPlugGeom, baseMaterials.casingMetal);
  tailPlug.userData = { componentId: 'lpt' };
  lptGroup.add(tailPlug);

  lptGroup.position.z = COMPONENT_METADATA.lpt.zOffset;
  return lptGroup;
}

/**
 * 7. NACELLE COWLING & CASING (Transparent / Cutaway)
 * Aerodynamic outer cowl with inlet lip, core bypass duct, and support struts.
 */
export function createCasing(isCutaway = true) {
  const casingGroup = new THREE.Group();
  casingGroup.name = 'casing_assembly';
  casingGroup.userData = { componentId: 'casing', isCasing: true };

  // Forward Intake Lip Cowl Ring
  const intakeRingGeom = new THREE.TorusGeometry(3.4, 0.16, 16, 48);
  const intakeRing = new THREE.Mesh(intakeRingGeom, baseMaterials.casingMetal);
  intakeRing.position.z = 5.2;
  casingGroup.add(intakeRing);

  // Outer Nacelle Cowling Shell
  // In cutaway mode, thetaLength is Math.PI * 1.35 to leave an open inspection window
  const thetaLength = isCutaway ? Math.PI * 1.25 : Math.PI * 2;
  const thetaStart = isCutaway ? Math.PI * 0.85 : 0;

  const cowlGeom = new THREE.CylinderGeometry(2.6, 3.4, 11.5, 48, 1, true, thetaStart, thetaLength);
  cowlGeom.rotateX(Math.PI / 2);
  cowlGeom.translate(0, 0, -0.2);

  const cowlMesh = new THREE.Mesh(cowlGeom, baseMaterials.casingGlass);
  cowlMesh.userData = { isCasing: true };
  casingGroup.add(cowlMesh);

  // 4 Radial Structural Support Struts
  const strutGeom = new THREE.BoxGeometry(0.12, 1.5, 0.4);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const strut = new THREE.Mesh(strutGeom, baseMaterials.casingMetal);
    strut.position.set(Math.cos(angle) * 2.3, Math.sin(angle) * 2.3, 3.2);
    strut.rotation.z = angle - Math.PI / 2;
    casingGroup.add(strut);
  }

  // Exhaust Nozzle Rear Rim
  const nozzleRingGeom = new THREE.TorusGeometry(2.55, 0.12, 16, 48);
  const nozzleRing = new THREE.Mesh(nozzleRingGeom, baseMaterials.casingMetal);
  nozzleRing.position.z = -5.8;
  casingGroup.add(nozzleRing);

  return casingGroup;
}

/**
 * Builds the complete procedural 3D turbofan engine assembly
 */
export function buildCompleteEngine(options = {}) {
  const engineRoot = new THREE.Group();
  engineRoot.name = 'turbofan_engine_root';

  const fan = createFan(options.materials?.fan);
  const lpc = createLPC(options.materials?.lpc);
  const hpc = createHPC(options.materials?.hpc);
  const combustor = createCombustor(options.materials?.combustor);
  const hpt = createHPT(options.materials?.hpt);
  const lpt = createLPT(options.materials?.lpt);
  const casing = createCasing(options.isCutaway ?? true);

  engineRoot.add(fan);
  engineRoot.add(lpc);
  engineRoot.add(hpc);
  engineRoot.add(combustor);
  engineRoot.add(hpt);
  engineRoot.add(lpt);
  engineRoot.add(casing);

  // Compute all bounding boxes for reliable raycasting
  engineRoot.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      obj.geometry.computeBoundingBox();
      obj.geometry.computeBoundingSphere();
    }
  });

  return {
    root: engineRoot,
    components: { fan, lpc, hpc, combustor, hpt, lpt, casing },
    spoolN1: [fan, lpc, lpt], // Low-pressure rotating spool
    spoolN2: [hpc, hpt]       // High-pressure rotating spool
  };
}
