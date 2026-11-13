import * as THREE from "three";

export function createAnnotations(app) {
  const state = app.state;
  function labelSprite(name) {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    const fill = ctx.createLinearGradient(0, 0, 0, 150);
    fill.addColorStop(0, "rgba(79,74,140,.95)");
    fill.addColorStop(1, "rgba(35,35,86,.95)");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(6, 6, 756, 138, 50);
    ctx.fill();
    ctx.strokeStyle = "#79eaff";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 53px " + getComputedStyle(document.documentElement).getPropertyValue("--app-font").trim();
    let t = name;
    if (ctx.measureText(t).width > 700) {
      while (t.length > 1 && ctx.measureText(t + "…").width > 700)
        t = t.slice(0, -1);
      t += "…";
    }
    ctx.fillText(t, 384, 76);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: tex,
      // Alpha cutout writes depth only inside the visible label, never its empty corners.
      // Real depth lets nearer lines pass and hides anything genuinely behind this label.
      transparent: false,
      alphaTest: 0.1,
      depthTest: true,
      depthWrite: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.65, 0.33, 1);
    return sprite;
  }

  const connectors = new Map();
  const bounds = new THREE.Box3();
  const raycaster = new THREE.Raycaster();
  const labelBottom = new THREE.Vector3();
  const center = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const localStart = new THREE.Vector3(), localEnd = new THREE.Vector3();

  function endpointTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    context.beginPath(); context.arc(32, 32, 29, 0, Math.PI * 2);
    context.fillStyle = "#10233f"; context.fill();
    context.beginPath(); context.arc(32, 32, 21, 0, Math.PI * 2);
    context.fillStyle = "#ffffff"; context.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function ensure(item) {
    if (connectors.has(item)) return connectors.get(item);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const material = new THREE.LineBasicMaterial({
      color: 0x9cefff, transparent: true, opacity: 0.95,
      depthTest: true, depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.name = "Conector de etiqueta";
    line.raycast = () => {}; // Annotation strokes never intercept object selection.
    // Reuse the exact two line endpoints; fixed pixel size remains readable at any zoom.
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: endpointTexture(), color: 0x9cefff, size: 8, sizeAttenuation: false,
      transparent: true, alphaTest: 0.1, depthTest: true, depthWrite: false,
    }));
    points.name = "Extremos del conector";
    points.renderOrder = 1;
    points.raycast = () => {};
    line.add(points);
    item.anchor.add(line);
    const record = {
      line, points, meshMatrix: null, labelMatrix: new THREE.Matrix4(),
      cameraQuaternion: new THREE.Quaternion(),
    };
    connectors.set(item, record); return record;
  }

  function remove(item) {
    const record = connectors.get(item);
    if (!record) return;
    record.line.removeFromParent();
    record.points.material.map.dispose(); record.points.material.dispose();
    record.line.geometry.dispose(); record.line.material.dispose();
    connectors.delete(item);
  }

  function updateAll() {
    const present = new Set(state.entries);
    for (const item of connectors.keys()) if (!present.has(item)) remove(item);
    for (const item of state.entries) {
      if (!item.anchor.visible) continue;
      const record = ensure(item), { line } = record;
      item.anchor.updateWorldMatrix(true, true);
      // Cache expensive mesh intersections until the model, label or view changes.
      if (!record.meshMatrix || !record.meshMatrix.equals(item.mesh.matrixWorld) ||
          !record.labelMatrix.equals(item.tag.matrixWorld) ||
          !record.cameraQuaternion.equals(app.engine.camera.quaternion)) {
        labelBottom.set(0, -item.tag.scale.y / 2, 0)
          .applyQuaternion(app.engine.camera.quaternion)
          .add(item.tag.getWorldPosition(localEnd));
        bounds.setFromObject(item.mesh).getCenter(center);
        direction.subVectors(center, labelBottom).normalize();
        raycaster.set(labelBottom, direction);
        const hit = raycaster.intersectObject(item.mesh, true)[0];
        localStart.copy(hit?.point || center);
        localEnd.copy(labelBottom);
        item.anchor.worldToLocal(localStart); item.anchor.worldToLocal(localEnd);
        const position = line.geometry.getAttribute("position");
        position.setXYZ(0, localStart.x, localStart.y, localStart.z);
        position.setXYZ(1, localEnd.x, localEnd.y, localEnd.z);
        position.needsUpdate = true; line.geometry.computeBoundingSphere();
        if (!record.meshMatrix) record.meshMatrix = new THREE.Matrix4();
        record.meshMatrix.copy(item.mesh.matrixWorld);
        record.labelMatrix.copy(item.tag.matrixWorld);
        record.cameraQuaternion.copy(app.engine.camera.quaternion);
      }
      line.material.color.setHex(item === state.chosen ? 0xd3fbff : 0x9cefff);
      record.points.material.color.copy(line.material.color);
      record.points.material.size = item === state.chosen ? 9 : 8;
    }
  }

  return { labelSprite, updateAll, remove };
}
