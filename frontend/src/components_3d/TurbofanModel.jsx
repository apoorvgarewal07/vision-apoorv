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

    // 3D Holographic Selection Reticle & Targeting Ring
    this.targetReticle = new THREE.Group();
    this.targetReticle.name = 'target_reticle';
    this.targetReticle.userData = { isHalo: true };

    const ringGeom = new THREE.TorusGeometry(1.0, 0.038, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    this.reticleRing = new THREE.Mesh(ringGeom, ringMat);
    this.reticleRing.userData = { isHalo: true };
    this.targetReticle.add(this.reticleRing);

    // 4 Corner Tick Brackets for Aerospace HUD targeting aesthetic
    const tickGeom = new THREE.BoxGeometry(0.1, 0.35, 0.04);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const tick = new THREE.Mesh(tickGeom, tickMat);
      tick.position.set(Math.cos(angle) * 1.0, Math.sin(angle) * 1.0, 0);
      tick.rotation.z = angle;
      tick.userData = { isHalo: true };
      this.targetReticle.add(tick);
    }

    this.targetReticle.visible = false;
    this.scene.add(this.targetReticle);

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

    // 4. Update 3D Holographic Targeting Reticle on Selected Component
    if (selectedId && this.components[selectedId] && COMPONENT_METADATA[selectedId]) {
      const comp = this.components[selectedId];
      const meta = COMPONENT_METADATA[selectedId];
      const targetRadius = (meta.radius || 2.0) * 1.18;

      this.targetReticle.visible = true;
      // Follow the component's exact Z position (including exploded view offsets)
      this.targetReticle.position.z = comp.position.z;
      this.targetReticle.position.x = comp.position.x;
      this.targetReticle.position.y = comp.position.y;

      // Scale reticle to match the component radius with a high-tech breathing pulse
      const pulseScale = targetRadius * (1.0 + 0.035 * Math.sin(time * 6));
      this.targetReticle.scale.set(pulseScale, pulseScale, pulseScale);

      // Rotate slowly for live HUD tracking effect
      this.targetReticle.rotation.z += delta * 1.4;
    } else {
      this.targetReticle.visible = false;
    }
  }

  dispose() {
    if (this.targetReticle) {
      this.scene.remove(this.targetReticle);
    }
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

