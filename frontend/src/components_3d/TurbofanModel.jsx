import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { buildCompleteEngine } from './engineGeometries.js';
import { updateComponentGlows } from './ComponentGlow.jsx';
import { COMPONENT_METADATA } from '../utils/componentSensorMap.js';

export class TurbofanModelController {
  constructor(scene) {
    this.scene = scene;
    const { root, components, spoolN1, spoolN2 } = buildCompleteEngine({ isCutaway: true });

    this.root = root;
    this.components = components;
    this.spoolN1 = spoolN1;
    this.spoolN2 = spoolN2;

    this.scene.add(this.root);

    this.isExploded = false;
    this.isCutaway = true;
    this.rotationEnabled = true;

    this.angleN1 = 0;
    this.angleN2 = 0;
  }

  setExploded(exploded) {
    this.isExploded = exploded;
  }

  setCutaway(cutaway) {
    this.isCutaway = cutaway;
    if (this.components.casing) {
      this.components.casing.visible = cutaway !== false;
    }
  }

  setRotationEnabled(enabled) {
    this.rotationEnabled = enabled;
  }

  update({ selectedId, hoveredId, telemetryTick, delta = 0.016, time = 0 }) {
    // 1. Dual spool rotational dynamics based on C-MAPSS sensor RPM
    if (this.rotationEnabled) {
      const sensors = telemetryTick?.sensors || {};
      const nfRpm = sensors.s8 || 2388.0;
      const ncRpm = sensors.s9 || 9050.0;

      // Normalize rotation speeds for visual clarity at 60 FPS
      const speedN1 = (nfRpm / 2388.0) * 1.8 * delta;
      const speedN2 = (ncRpm / 9050.0) * 3.4 * delta;

      this.angleN1 -= speedN1;
      this.angleN2 -= speedN2;

      this.spoolN1.forEach((comp) => {
        comp.rotation.z = this.angleN1;
      });

      this.spoolN2.forEach((comp) => {
        comp.rotation.z = this.angleN2;
      });
    }

    // 2. Smooth Exploded View Interpolation along central Z-axis
    Object.entries(this.components).forEach(([id, comp]) => {
      if (id === 'casing') {
        comp.visible = !this.isExploded;
        return;
      }

      const meta = COMPONENT_METADATA[id];
      if (!meta) return;

      const targetZ = this.isExploded ? meta.explodedOffset : meta.zOffset;
      // Exponential smoothing (lerp) toward target position
      comp.position.z += (targetZ - comp.position.z) * 0.12;
    });

    // 3. Dynamic Heatmap & Emissive Glow Updating
    updateComponentGlows(this.components, {
      selectedId,
      hoveredId,
      telemetryTick,
      time
    });
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      }
    });
  }
}
