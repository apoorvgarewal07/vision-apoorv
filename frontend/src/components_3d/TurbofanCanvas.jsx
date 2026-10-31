import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TurbofanModelController } from './TurbofanModel.jsx';
import { ComponentSelector } from './ComponentSelector.js';
import { ComponentTooltip } from './ComponentTooltip.jsx';
import { COMPONENT_METADATA } from '../utils/componentSensorMap.js';
import {
  RotateCcw,
  Layers,
  Eye,
  Play,
  Pause,
  Compass,
  Maximize2,
  ZoomIn,
  Flame,
  Info
} from 'lucide-react';

export const TurbofanCanvas = ({ telemetryTick, onSelectComponentExternal, selectedComponentExternal }) => {
  const mountRef = useRef(null);
  const [selectedId, setSelectedId] = useState(selectedComponentExternal || null);
  const [hoveredId, setHoveredId] = useState(null);
  const [isExploded, setIsExploded] = useState(false);
  const [isCutaway, setIsCutaway] = useState(true);
  const [isRotating, setIsRotating] = useState(true);

  // Sync external selection if provided
  useEffect(() => {
    if (selectedComponentExternal !== undefined) {
      setSelectedId(selectedComponentExternal);
    }
  }, [selectedComponentExternal]);

  const controllerRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const targetCamPosRef = useRef(null);
  const targetLookAtRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a12); // Deep aerospace dark

    // Grid helper
    const grid = new THREE.GridHelper(24, 24, 0x1e293b, 0x0f172a);
    grid.position.y = -3.8;
    scene.add(grid);

    // 2. Camera setup
    const width = currentMount.clientWidth || 800;
    const height = currentMount.clientHeight || 550;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(11, 6, 12);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    currentMount.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 35;
    controls.minDistance = 3;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(12, 16, 14);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    fillLight.position.set(-14, -6, -10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf8fafc, 1.2);
    rimLight.position.set(0, 12, -14);
    scene.add(rimLight);

    // 6. Build Procedural Engine
    const controller = new TurbofanModelController(scene);
    controllerRef.current = controller;

    // 7. Raycasting Component Selector
    const selector = new ComponentSelector(camera, scene, renderer.domElement);
    selector.setCallbacks({
      onHover: (id) => setHoveredId(id),
      onSelect: (id, hitPoint) => {
        setSelectedId(id);
        if (onSelectComponentExternal) onSelectComponentExternal(id);

        if (id && COMPONENT_METADATA[id]) {
          const z = COMPONENT_METADATA[id].zOffset;
          targetLookAtRef.current = new THREE.Vector3(0, 0, z);
          targetCamPosRef.current = new THREE.Vector3(7, 3, z + 6);
        }
      }
    });

    // 8. Animation & Render Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth camera interpolation toward target
      if (targetLookAtRef.current && targetCamPosRef.current) {
        controls.target.lerp(targetLookAtRef.current, 0.08);
        camera.position.lerp(targetCamPosRef.current, 0.08);
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.1) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      controls.update();

      controller.update({
        selectedId,
        hoveredId,
        telemetryTick,
        delta,
        time
      });

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize handler
    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      selector.dispose();
      controller.dispose();
      renderer.dispose();
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync state changes with controller
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setExploded(isExploded);
    }
  }, [isExploded]);

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setCutaway(isCutaway);
    }
  }, [isCutaway]);

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setRotationEnabled(isRotating);
    }
  }, [isRotating]);

  const handleSelectComponent = (id) => {
    setSelectedId(id);
    if (onSelectComponentExternal) onSelectComponentExternal(id);

    if (id && COMPONENT_METADATA[id] && controlsRef.current && cameraRef.current) {
      const z = COMPONENT_METADATA[id].zOffset;
      targetLookAtRef.current = new THREE.Vector3(0, 0, z);
      targetCamPosRef.current = new THREE.Vector3(7, 3, z + 6);
    }
  };

  const handleResetCamera = () => {
    setSelectedId(null);
    if (onSelectComponentExternal) onSelectComponentExternal(null);
    targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    targetCamPosRef.current = new THREE.Vector3(11, 6, 12);
  };

  return (
    <div className="relative w-full h-[580px] bg-aerospace-950 rounded-2xl overflow-hidden border border-aerospace-800 shadow-2xl select-none">
      
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Flight Deck Overlay Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 flex-wrap pointer-events-auto">
        
        {/* Exploded View Toggle */}
        <button
          onClick={() => setIsExploded(!isExploded)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shadow-md ${
            isExploded
              ? 'bg-telemetry-cyan text-white shadow-telemetry-cyan/25'
              : 'bg-aerospace-900/90 text-aerospace-300 hover:text-white hover:bg-aerospace-850 border border-aerospace-750'
          }`}
          title="Separates turbofan stages along central shaft"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isExploded ? 'Assembled View' : 'Exploded View'}</span>
        </button>

        {/* Cutaway Nacelle Cowling Toggle */}
        <button
          onClick={() => setIsCutaway(!isCutaway)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shadow-md ${
            isCutaway
              ? 'bg-aerospace-800 text-telemetry-cyan border border-telemetry-cyan/40'
              : 'bg-aerospace-900/90 text-aerospace-400 hover:text-white border border-aerospace-750'
          }`}
          title="Toggle translucent cutaway window"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isCutaway ? 'Cutaway Nacelle: ON' : 'Nacelle: Full'}</span>
        </button>

        {/* Spool Rotation Toggle */}
        <button
          onClick={() => setIsRotating(!isRotating)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-aerospace-900/90 text-aerospace-300 hover:text-white border border-aerospace-750 transition shadow-md"
          title="Toggle dual spool shaft rotation"
        >
          {isRotating ? (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Spools: Active</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>Spools: Paused</span>
            </>
          )}
        </button>

        {/* Camera Reset */}
        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg bg-aerospace-900/90 text-aerospace-400 hover:text-white hover:bg-aerospace-850 border border-aerospace-750 transition shadow-md"
          title="Reset Camera View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

      </div>

      {/* Real-Time Spool Telemetry Badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 hidden sm:flex items-center gap-3 bg-aerospace-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-aerospace-800 text-xs font-mono text-aerospace-300 shadow-lg pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-telemetry-cyan animate-pulse" />
          <span>N1 (Fan/LPC):</span>
          <span className="text-white font-bold">{Math.round(telemetryTick?.sensors?.s8 || 2388)} rpm</span>
        </div>
        <span className="text-aerospace-700">•</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-telemetry-emerald animate-pulse" />
          <span>N2 (Core/HPC):</span>
          <span className="text-white font-bold">{Math.round(telemetryTick?.sensors?.s9 || 9050)} rpm</span>
        </div>
      </div>

      {/* Floating Component Tooltip / Inspection Card */}
      <ComponentTooltip
        selectedComponentId={selectedId}
        onSelectComponent={handleSelectComponent}
        telemetryTick={telemetryTick}
        onClose={() => setSelectedId(null)}
      />

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-4 hidden md:flex items-center gap-2 bg-aerospace-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-aerospace-800/80 text-[11px] font-mono text-aerospace-400 pointer-events-none">
        <Compass className="w-3.5 h-3.5 text-telemetry-cyan" />
        <span>Left-click + Drag to rotate • Right-click to pan • Scroll to zoom</span>
      </div>

    </div>
  );
};
