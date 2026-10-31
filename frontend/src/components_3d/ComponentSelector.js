import * as THREE from 'three';

/**
 * Three.js Raycasting & Component Selection Handler
 */
export class ComponentSelector {
  constructor(camera, scene, domElement) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.hoveredComponentId = null;
    this.selectedComponentId = null;

    this.onHoverCallback = null;
    this.onSelectCallback = null;

    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerClick = this.onPointerClick.bind(this);

    this.domElement.addEventListener('pointermove', this._onPointerMove);
    this.domElement.addEventListener('click', this._onPointerClick);
  }

  setCallbacks({ onHover, onSelect }) {
    this.onHoverCallback = onHover;
    this.onSelectCallback = onSelect;
  }

  updateMouse(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  getIntersectedComponent() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const hit of intersects) {
      let cur = hit.object;
      // Skip translucent outer glass casing unless explicitly clicking empty space
      if (cur.userData && cur.userData.isCasing) continue;

      while (cur) {
        if (cur.userData && cur.userData.componentId) {
          return { componentId: cur.userData.componentId, hitPoint: hit.point, object: cur };
        }
        cur = cur.parent;
      }
    }
    return null;
  }

  onPointerMove(event) {
    this.updateMouse(event);
    const result = this.getIntersectedComponent();
    const newId = result ? result.componentId : null;

    if (newId !== this.hoveredComponentId) {
      this.hoveredComponentId = newId;
      this.domElement.style.cursor = newId ? 'pointer' : 'default';
      if (this.onHoverCallback) {
        this.onHoverCallback(newId);
      }
    }
  }

  onPointerClick(event) {
    this.updateMouse(event);
    const result = this.getIntersectedComponent();
    const clickedId = result ? result.componentId : null;

    this.selectedComponentId = clickedId;
    if (this.onSelectCallback) {
      this.onSelectCallback(clickedId, result ? result.hitPoint : null);
    }
  }

  dispose() {
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('click', this._onPointerClick);
  }
}
