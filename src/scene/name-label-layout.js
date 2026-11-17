import * as THREE from 'three';
import { boxAt, boxDistance, overlapArea } from './gear-label-layout.js';

/** Project stable part bounds instead of rotating tooth geometry on every frame. */
export function createNameLabelLayout(app) {
  const point = new THREE.Vector3(), home = new THREE.Vector3(), delta = new THREE.Vector3();
  const cameraPoint = new THREE.Vector3(), position = new THREE.Vector3(), scale = new THREE.Vector3();
  const previous = new WeakMap();
  function screenBounds(item, camera, canvas) {
    const boxes = [];
    const parts = item.mechanism?.parts || [null];
    for (const [index, part] of parts.entries()) {
      if (part && !part.pivot.visible) continue;
      const bounds = part ? item.partBounds.get(item.mechanism.system.nodes[index]) : item.localBounds;
      if (!bounds) continue;
      delta.set(0, 0, 0);
      if (part) {
        part.pivot.getWorldPosition(delta); part.pivot.parent.localToWorld(home.copy(part.home)); delta.sub(home);
      }
      const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
      let visible = false;
      for (let corner = 0; corner < 8; corner++) {
        point.set(corner & 1 ? bounds.max.x : bounds.min.x, corner & 2 ? bounds.max.y : bounds.min.y, corner & 4 ? bounds.max.z : bounds.min.z)
          .applyMatrix4(item.mesh.matrixWorld).add(delta).project(camera);
        visible ||= point.z >= -1 && point.z <= 1;
        const x = canvas.left + (point.x + 1) * canvas.width / 2, y = canvas.top + (1 - point.y) * canvas.height / 2;
        box.left = Math.min(box.left, x); box.right = Math.max(box.right, x);
        box.top = Math.min(box.top, y); box.bottom = Math.max(box.bottom, y);
      }
      if (visible) boxes.push(box);
    }
    return boxes;
  }
  function update() {
    if (!app.engine.canvas) return;
    const camera = app.engine.camera, canvas = app.engine.canvas.getBoundingClientRect();
    const header = document.getElementById('header').getBoundingClientRect();
    const safe = { left: canvas.left + 10, right: canvas.right - 10, top: Math.max(canvas.top + 10, header.bottom + 8), bottom: canvas.bottom - 10 };
    const obstacles = ['workspace-panel', 'bar', 'gear-center', 'gear-context', 'gear-dock', 'tools', 'class-return', 'notice'].map(id => document.getElementById(id))
      .filter(node => node && !node.hidden && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden' && getComputedStyle(node).display !== 'contents')
      .map(node => node.getBoundingClientRect());
    const entries = app.state.entries.filter(item => item.anchor.visible);
    const footprints = new Map();
    for (const item of entries) { item.mesh.updateWorldMatrix(true, true); footprints.set(item, screenBounds(item, camera, canvas)); }
    const allBounds = [...footprints.values()].flat(), placed = [];
    for (const item of entries.sort((a, b) => Number(b === app.state.chosen) - Number(a === app.state.chosen))) {
      const tag = item.tag, boxes = footprints.get(item);
      tag.visible = false;
      if (!boxes.length || app.state.hudHidden) continue;
      const bounds = { left: Math.min(...boxes.map(b => b.left)), top: Math.min(...boxes.map(b => b.top)), right: Math.max(...boxes.map(b => b.right)), bottom: Math.max(...boxes.map(b => b.bottom)) };
      if (bounds.right < safe.left || bounds.left > safe.right || bounds.bottom < safe.top || bounds.top > safe.bottom) continue;
      const width = Math.min(canvas.width <= 600 ? 184 : 224, safe.right - safe.left), height = width * 150 / 768;
      const centerX = (bounds.left + bounds.right) / 2, centerY = (bounds.top + bounds.bottom) / 2;
      point.set(0, item.height, 0).applyMatrix4(item.anchor.matrixWorld).project(camera);
      const preferred = { x: canvas.left + (point.x + 1) * canvas.width / 2 - width / 2, y: canvas.top + (1 - point.y) * canvas.height / 2 - height / 2 };
      const positions = [[preferred.x, preferred.y]], old = previous.get(item);
      if (old && old.width === width && old.viewport === canvas.width + ':' + canvas.height) positions.push([old.x + centerX - old.centerX, old.y + centerY - old.centerY]);
      for (const gap of [14, 28, 44, 64]) {
        for (const x of [centerX - width / 2, bounds.left, bounds.right - width]) positions.push([x, bounds.top - height - gap], [x, bounds.bottom + gap]);
        for (const y of [centerY - height / 2, bounds.top, bounds.bottom - height]) positions.push([bounds.left - width - gap, y], [bounds.right + gap, y]);
      }
      let best = null;
      for (const [rawX, rawY] of positions) {
        const x = Math.round(Math.max(safe.left, Math.min(safe.right - width, rawX)) * 10) / 10, y = Math.round(Math.max(safe.top, Math.min(safe.bottom - height, rawY)) * 10) / 10;
        const box = boxAt(x, y, width, height);
        if (y < safe.top || box.bottom > safe.bottom) continue;
        if ([...allBounds, ...placed, ...obstacles].some(obstacle => overlapArea(boxAt(x - 5, y - 5, width + 10, height + 10), obstacle) > .5)) continue;
        const gap = Math.min(...boxes.map(part => boxDistance(part, box)));
        if (gap > 90) continue;
        const prior = old ? Math.min(25, Math.hypot(x - (old.x + centerX - old.centerX), y - (old.y + centerY - old.centerY)) * .12) : 0;
        const score = gap + Math.min(180, Math.hypot(x - preferred.x, y - preferred.y)) * .12 + (box.top >= bounds.bottom ? 8 : 0) + prior;
        if (!best || score < best.score) best = { x, y, box, score };
      }
      if (!best) continue;
      item.mesh.getWorldPosition(position); cameraPoint.copy(position).applyMatrix4(camera.matrixWorldInverse);
      const depth = -cameraPoint.z; if (depth <= camera.near) continue;
      const ndc = new THREE.Vector3(0, 0, -depth).applyMatrix4(camera.projectionMatrix).z;
      position.set(((best.x + width / 2 - canvas.left) / canvas.width) * 2 - 1, 1 - ((best.y + height / 2 - canvas.top) / canvas.height) * 2, ndc).unproject(camera);
      item.anchor.worldToLocal(position); tag.position.copy(position);
      item.anchor.getWorldScale(scale);
      const units = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / canvas.height;
      tag.scale.set(width * units / scale.x, height * units / scale.y, 1);
      tag.quaternion.copy(camera.quaternion); tag.visible = true; tag.updateWorldMatrix(false, false);
      tag.userData.screenBounds = best.box;
      tag.userData.protectedBounds = allBounds;
      previous.set(item, { ...best, width, centerX, centerY, viewport: canvas.width + ':' + canvas.height }); placed.push(best.box);
    }
  }
  return { update };
}
