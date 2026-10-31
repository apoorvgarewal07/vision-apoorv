import * as THREE from 'three';

/**
 * Applies dynamic thermal heatmap coloring and bright selection highlights to 3D turbofan meshes
 */
export function updateComponentGlows(components, { selectedId, hoveredId, telemetryTick, time = 0 }) {
  if (!components) return;

  const healthIndex = telemetryTick?.health_index !== undefined ? telemetryTick.health_index : 1.0;
  const sensors = telemetryTick?.sensors || {};

  // HPC specific heat calculation: nominal T30 is ~1588 °R
  const t30 = sensors.s3 || 1588.0;
  const hpcHeatRatio = Math.max(0, Math.min(1.0, (t30 - 1588.0) / 45.0 + (1.0 - healthIndex)));

  Object.entries(components).forEach(([id, group]) => {
    if (!group || id === 'casing') return;

    const isSelected = id === selectedId;
    const isHovered = id === hoveredId;

    // Determine component base health/thermal level
    let thermalColor = null;
    let thermalIntensity = 0.0;

    if (id === 'hpc') {
      if (hpcHeatRatio > 0.6) {
        // Severe heat / degradation: glowing pulsing red
        const pulse = 0.5 + 0.4 * Math.sin(time * 6);
        thermalColor = new THREE.Color(0xef4444);
        thermalIntensity = 0.7 * pulse;
      } else if (hpcHeatRatio > 0.25) {
        // Elevated thermal stress: warm amber
        thermalColor = new THREE.Color(0xf59e0b);
        thermalIntensity = 0.45;
      }
    } else if (id === 'lpt' && healthIndex < 0.5) {
      // EGT exhaust elevated
      thermalColor = new THREE.Color(0xf97316);
      thermalIntensity = 0.35;
    }

    group.traverse((child) => {
      if (child.isMesh && child.material && !child.userData.isCasing && !child.userData.isHalo) {
        const mat = child.material;

        // Cache original base color, roughness and metalness
        if (child.userData.origColorHex === undefined) {
          child.userData.origColorHex = mat.color.getHex();
        }
        if (child.userData.origRoughness === undefined) {
          child.userData.origRoughness = mat.roughness;
        }

        if (isSelected) {
          // PROMINENT CLICK HIGHLIGHT:
          // Pulsing electric cyan emissive glow
          const pulse = 0.8 + 0.25 * Math.sin(time * 7);
          mat.emissive.setHex(0x00e5ff); // Vivid electric cyan
          mat.emissiveIntensity = 0.95 * pulse;
          
          // Tint diffuse color to glowing sky cyan for high visibility
          mat.color.setHex(0x7dd3fc);
          mat.roughness = 0.18;
        } else if (isHovered) {
          // Hover preview highlight
          mat.emissive.setHex(0x0284c7);
          mat.emissiveIntensity = 0.5;
          mat.color.setHex(child.userData.origColorHex);
          mat.roughness = child.userData.origRoughness;
        } else if (thermalColor) {
          // Real-time thermal telemetry degradation
          mat.emissive.copy(thermalColor);
          mat.emissiveIntensity = thermalIntensity;
          mat.color.setHex(child.userData.origColorHex);
          mat.roughness = child.userData.origRoughness;
        } else {
          // Nominal baseline
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0.0;
          mat.color.setHex(child.userData.origColorHex);
          mat.roughness = child.userData.origRoughness;
        }
      }
    });
  });
}

