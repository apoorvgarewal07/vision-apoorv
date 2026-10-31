import * as THREE from 'three';

/**
 * Applies dynamic thermal heatmap coloring and selection glows to 3D turbofan meshes
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
      if (child.isMesh && child.material && !child.userData.isCasing) {
        const mat = child.material;

        if (isSelected) {
          // Focused Component Glow: high-tech sky cyan
          mat.emissive.setHex(0x38bdf8);
          mat.emissiveIntensity = 0.55;
        } else if (isHovered) {
          // Hover outline pulse
          mat.emissive.setHex(0x0ea5e9);
          mat.emissiveIntensity = 0.35;
        } else if (thermalColor) {
          // Real-time thermal telemetry degradation
          mat.emissive.copy(thermalColor);
          mat.emissiveIntensity = thermalIntensity;
        } else {
          // Nominal baseline
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0.0;
        }
      }
    });
  });
}
