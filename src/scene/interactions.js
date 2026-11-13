import * as THREE from "three";
import { $ } from "../ui/dom.js";
import { clamp, snapRotation } from "../core/math.js";

export function createInteractions(app) {
  const state = app.state;
  const pointers = new Map();

  const ray = new THREE.Raycaster(),
    mouse = new THREE.Vector2();

  app.engine.canvas.setAttribute("aria-label", "Escena 3D: toca y arrastra los objetos para manipularlos");

  function setRay(x, y) {
    const rect = app.engine.canvas.getBoundingClientRect();
    mouse.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(mouse, app.engine.camera);
  }

  function pick(x, y) {
    setRay(x, y);
    const hits = ray.intersectObjects(state.entries.filter((item) => item.anchor.visible).flatMap((item) => [item.mesh, item.tag]), true);
    for (const hit of hits) {
      const item = state.entries.find((entry) => {
        let node = hit.object;
        while (node) {
          if (node === entry.anchor) return true;
          node = node.parent;
        }
        return false;
      });
      if (item) return { item, label: hit.object === item.tag };
    }
    return null;
  }

  function pickRing(x, y) {
    if (!app.selection.gizmo.visible || !state.chosen) return null;
    setRay(x, y);
    const hits = ray.intersectObjects(app.selection.rings.map((ring) => ring.children[0]), false);
    return hits.length ? hits[0].object.userData.axis : null;
  }

  function ringVector(x, y, center, normal) {
    setRay(x, y);
    if (Math.abs(ray.ray.direction.dot(normal)) < 0.06) return null;
    const point = ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center), new THREE.Vector3());
    if (!point || point.distanceToSquared(center) < 0.0001) return null;
    return point.sub(center).normalize();
  }

  function groundPoint(x, y) {
    setRay(x, y);
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  }

  function pairInfo() {
    const [a, b] = [...pointers.values()];
    return {
      x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      distance: Math.max(12, Math.hypot(b.x - a.x, b.y - a.y)),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
    };
  }

  function beginGesture() {
    if (!state.gesture || !pointers.size) return;
    const p = pointers.values().next().value;
    const item = state.gesture.item;
    state.gesture = {
      item, label: state.gesture.label, ringAxis: state.gesture.ringAxis, x: p.x, y: p.y, view: { ...state.viewState }, collectionMode: state.gesture.collectionMode,
      position: item?.anchor.position.clone(), rot: item?.rot.slice(),
      size: item?.size, height: item?.height,
      ground: groundPoint(p.x, p.y),
      moved: state.gesture.moved || false,
      sensitivity: $("fine-rotation").checked ? 0.15 : 1,
      step: Number($("rotation-step").value),
    };
    if (item && state.gesture.label) {
      const start = item.tag.getWorldPosition(new THREE.Vector3());
      const end = start.clone().add(new THREE.Vector3(0, 1, 0)).project(app.engine.camera);
      start.project(app.engine.camera);
      state.gesture.labelAxis = { x: (end.x - start.x) * app.engine.canvas.clientWidth / 2, y: -(end.y - start.y) * app.engine.canvas.clientHeight / 2 };
    }
    if (item && state.gesture.ringAxis !== null && state.gesture.ringAxis !== undefined && pointers.size === 1) {
      state.gesture.center = item.mesh.getWorldPosition(new THREE.Vector3());
      state.gesture.normal = app.selection.axisNormal(state.gesture.ringAxis, item.rot);
      state.gesture.ringStart = ringVector(p.x, p.y, state.gesture.center, state.gesture.normal);
      state.gesture.lastRingAngle = 0; state.gesture.ringTotal = 0;
    }
    if (pointers.size === 2) {
      state.gesture.ringAxis = null;
      state.gesture.pair = pairInfo();
      state.gesture.ground = groundPoint(state.gesture.pair.x, state.gesture.pair.y);
    }
  }

  function cancelGesture() {
    state.gesture = null;
    for (const id of pointers.keys()) {
      if (app.engine.canvas.hasPointerCapture(id)) app.engine.canvas.releasePointerCapture(id);
    }
    pointers.clear();
    app.engine.canvas.style.cursor = "grab";
  }

  app.engine.canvas.style.cursor = "grab";

  app.engine.canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || pointers.size >= 2) return;
    if (!pointers.size) {
      const hit = state.collectionMode ? null : pick(e.clientX, e.clientY);
      const ringAxis = hit || state.collectionMode ? null : pickRing(e.clientX, e.clientY);
      if (hit) app.interface.select(hit.item);
      if (ringAxis !== null) {
        $("axis").value = ["x", "y", "z"][ringAxis]; app.editor.syncRotationControls();
      }
      state.gesture = { item: hit?.item || (ringAxis !== null ? state.chosen : null), label: hit?.label || false, ringAxis, collectionMode: state.collectionMode };
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    app.engine.canvas.setPointerCapture(e.pointerId);
    app.engine.canvas.style.cursor = "grabbing";
    beginGesture();
  });

  app.engine.canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId) || !state.gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = state.gesture, item = g.item;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (Math.hypot(dx, dy) > 5 || pointers.size === 2) g.moved = true;
    if (!item) {
      if (pointers.size === 2) {
        const pair = pairInfo();
        app.view.rotateView(g.view, pair.x - g.pair.x, pair.y - g.pair.y);
        app.view.setViewZoom(g.view.zoom * pair.distance / g.pair.distance);
      } else app.view.rotateView(g.view, dx, dy, e.shiftKey);
      return;
    }
    if (pointers.size === 2) {
      const pair = pairInfo();
      item.size = clamp(g.size * pair.distance / g.pair.distance, 0.3, 2.5);
      const axis = $("axis").value;
      const twistAxis = state.mode === "rotate" && axis !== "free" ? { x: 0, y: 1, z: 2 }[axis] : 2;
      item.rot[twistAxis] = snapRotation(g.rot[twistAxis] - THREE.MathUtils.radToDeg(pair.angle - g.pair.angle) * g.sensitivity, g.step);
      moveItem(item, g, pair.x, pair.y);
    } else if (g.ringAxis !== null && g.ringAxis !== undefined) {
      const current = ringVector(e.clientX, e.clientY, g.center, g.normal);
      let degrees = (dx - dy) * 0.35;
      if (current && g.ringStart) {
        const angle = Math.atan2(g.ringStart.clone().cross(current).dot(g.normal), g.ringStart.dot(current));
        const delta = Math.atan2(Math.sin(angle - g.lastRingAngle), Math.cos(angle - g.lastRingAngle));
        g.ringTotal += delta; g.lastRingAngle = angle;
        degrees = THREE.MathUtils.radToDeg(g.ringTotal);
      }
      item.rot[g.ringAxis] = snapRotation(g.rot[g.ringAxis] + degrees * g.sensitivity * (e.shiftKey ? 0.15 : 1), g.step);
    } else if (g.label) {
      const axis = g.labelAxis;
      const lengthSquared = axis.x * axis.x + axis.y * axis.y;
      if (lengthSquared > 1) item.height = clamp(g.height + (dx * axis.x + dy * axis.y) / lengthSquared, 0.8, 3.4);
    } else if (state.mode === "move") {
      moveItem(item, g, e.clientX, e.clientY);
    } else if (state.mode === "scale") {
      item.size = clamp(g.size * Math.exp(-dy * 0.008), 0.3, 2.5);
    } else {
      const axis = $("axis").value;
      const sensitivity = 0.35 * g.sensitivity * (e.shiftKey ? 0.15 : 1);
      if (axis === "free") {
        item.rot[0] = snapRotation(g.rot[0] + dy * sensitivity, g.step);
        item.rot[1] = snapRotation(g.rot[1] + dx * sensitivity, g.step);
      } else {
        const index = { x: 0, y: 1, z: 2 }[axis];
        item.rot[index] = snapRotation(g.rot[index] + (dx - dy) * sensitivity, g.step);
      }
    }
    app.editor.applyTransform(item);
  });

  function moveItem(item, g, x, y) {
    const point = groundPoint(x, y);
    if (!point || !g.ground) return;
    item.anchor.position.x = clamp(g.position.x + point.x - g.ground.x, -5, 5);
    item.anchor.position.z = clamp(g.position.z + point.z - g.ground.z, -5, 5);
  }

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    const clearSelection = pointers.size === 1 && state.gesture && !state.gesture.item && !state.gesture.moved && !state.gesture.collectionMode && e.type === "pointerup";
    pointers.delete(e.pointerId);
    if (app.engine.canvas.hasPointerCapture(e.pointerId)) app.engine.canvas.releasePointerCapture(e.pointerId);
    if (!pointers.size) cancelGesture();
    else beginGesture();
    if (clearSelection) app.interface.select(null);
  }

  app.engine.canvas.addEventListener("pointerup", endPointer);

  app.engine.canvas.addEventListener("pointercancel", () => cancelGesture());

  app.engine.canvas.addEventListener("lostpointercapture", endPointer);

  window.addEventListener("blur", cancelGesture);

  app.engine.canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (pointers.size) return;
    const hit = state.collectionMode ? null : pick(e.clientX, e.clientY);
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? app.engine.canvas.clientHeight : 1);
    if (state.collectionMode || e.ctrlKey || !hit) {
      app.view.setViewZoom(state.viewState.zoom * Math.exp(-clamp(delta, -120, 120) * 0.0015));
      return;
    }
    app.interface.select(hit.item);
    if (hit.label) state.chosen.height = clamp(state.chosen.height - delta * 0.002, 0.8, 3.4);
    else state.chosen.size = clamp(state.chosen.size * Math.exp(-clamp(delta, -100, 100) * 0.002), 0.3, 2.5);
    app.editor.applyTransform(state.chosen);
  }, { passive: false });

  return { cancelGesture };
}
