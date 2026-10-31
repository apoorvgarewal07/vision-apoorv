import * as THREE from 'three';

/**
 * Procedural Aerospace PBR Materials for Turbofan Engine Digital Twin
 */

export const baseMaterials = {
  // 1. Titanium alloy for fan blades and compressor stages
  titanium: new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.28,
    metalness: 0.85,
    name: 'titanium'
  }),

  // 2. High-temp nickel-chromium alloy for combustion chamber & liners
  combustor: new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.48,
    metalness: 0.65,
    name: 'combustor'
  }),

  // 3. Single-crystal superalloy for high-pressure turbine blading
  turbine: new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.32,
    metalness: 0.82,
    name: 'turbine'
  }),

  // 4. Glossy aerodynamic composite spinner nose cone
  spinner: new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.15,
    metalness: 0.9,
    name: 'spinner'
  }),

  // 5. Central high-strength driveshaft steel
  shaft: new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.25,
    metalness: 0.92,
    name: 'shaft'
  }),

  // 6. Translucent aerospace glass cowling (cutaway outer nacelle)
  casingGlass: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    opacity: 0.16,
    transparent: true,
    roughness: 0.08,
    metalness: 0.15,
    depthWrite: false,
    side: THREE.DoubleSide,
    name: 'casingGlass'
  }),

  // 7. Structural cowling intake ring and exhaust nozzle rim
  casingMetal: new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.75,
    name: 'casingMetal'
  }),

  // 8. Fuel nozzle injectors & manifold piping
  copperBrass: new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.3,
    metalness: 0.85,
    name: 'copperBrass'
  })
};

/**
 * Clone material with dynamic emissive highlight or thermal glow
 */
export function createComponentMaterial(type, options = {}) {
  const base = baseMaterials[type] || baseMaterials.titanium;
  const mat = base.clone();

  if (options.color) mat.color.set(options.color);
  if (options.emissive) mat.emissive.set(options.emissive);
  if (options.emissiveIntensity !== undefined) mat.emissiveIntensity = options.emissiveIntensity;
  if (options.opacity !== undefined) {
    mat.opacity = options.opacity;
    mat.transparent = options.opacity < 1.0;
  }

  return mat;
}
