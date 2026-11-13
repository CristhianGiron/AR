import * as THREE from "three";
import { $ } from "../ui/dom.js";

export function createLoop(app) {
  const state = app.state;
  const viewTarget = new THREE.Vector3(0, 0.65, -0.4);

  const viewQuaternion = new THREE.Quaternion();

  let running = false, frameId = null;

  function renderFrame() {
    if (app.spatial?.active || app.spatial?.pending) return;
    const w = $("stage").clientWidth,
      h = $("stage").clientHeight;
    if (
      app.engine.canvas.width !== Math.round(w * app.engine.renderer.getPixelRatio()) ||
      app.engine.canvas.height !== Math.round(h * app.engine.renderer.getPixelRatio())
    )
      app.engine.renderer.setSize(w, h, false);
    app.engine.camera.aspect = w / h;
    app.engine.camera.updateProjectionMatrix();
    // Panels are overlays: the camera always uses the complete viewport.
    app.engine.camera.clearViewOffset();
    const sceneWidth = state.entries.filter((item) => item.anchor.visible).length > 1 ? 6.6 : 5.8;
    const distance = Math.max(7, sceneWidth / (w / h));
    viewQuaternion.setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(state.viewState.x), THREE.MathUtils.degToRad(state.viewState.y), 0, "YXZ"));
    const lookTarget = state.isolatedItem ? new THREE.Box3().setFromObject(state.isolatedItem.mesh).getCenter(new THREE.Vector3()) : viewTarget;
    app.engine.camera.position.set(Math.sin(0.32) * distance, distance * 0.514, Math.cos(0.32) * distance)
      .sub(viewTarget).applyQuaternion(viewQuaternion).multiplyScalar(1 / state.viewState.zoom).add(lookTarget);
    app.engine.camera.up.set(0, 1, 0).applyQuaternion(viewQuaternion);
    app.engine.camera.lookAt(lookTarget);
    app.engine.camera.updateMatrixWorld();
    for (const e of state.entries) {
      e.tag.visible = true;
      e.tag.quaternion.copy(app.engine.camera.quaternion);
    }
    app.annotations.updateAll();
    app.layout.positionBadge();
    app.selection.updateSelection();
    app.experiment?.updateFrame();
    app.selection.renderScene();
    app.layout.positionMenu();
    app.parts?.updateFrame();
    app.missions?.update();
  }

  function tick() {
    if (!running) return;
    renderFrame();
    frameId = requestAnimationFrame(tick);
  }

  function start() {
    if (running || app.spatial?.active || app.spatial?.pending) return;
    running = true;
    tick();
  }

  function stop() {
    running = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
  }

  return { start, stop, renderFrame, get running() { return running; } };
}
