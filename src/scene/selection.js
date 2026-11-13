import * as THREE from "three";
import { $ } from "../ui/dom.js";

export function createSelection(app) {
  const state = app.state;
  const selection = new THREE.Group();

  selection.visible = false;

  const maskScene = new THREE.Scene();

  maskScene.add(selection);

  const maskMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  function buildGlow(item) {
    // Share geometry with the object; render its silhouette into a separate mask.
    selection.clear();
    if (!item) return;
    const silhouette = item.mesh.clone(true);
    silhouette.traverse((node) => {
      if (node.isMesh) { node.material = maskMaterial; node.raycast = () => {}; }
    });
    selection.add(silhouette);
  }

  const maskTarget = new THREE.WebGLRenderTarget(1, 1);

  const blurTargetA = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });

  const blurTargetB = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });

  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const quadScene = new THREE.Scene();

  const quadVertex = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

  const blurMaterial = new THREE.ShaderMaterial({
    uniforms: { source: { value: null }, direction: { value: new THREE.Vector2() } },
    vertexShader: quadVertex,
    fragmentShader: `uniform sampler2D source; uniform vec2 direction; varying vec2 vUv;
      void main() {
        float value = texture2D(source, vUv).r * 0.227027;
        value += (texture2D(source, vUv + direction).r + texture2D(source, vUv - direction).r) * 0.194595;
        value += (texture2D(source, vUv + direction * 2.0).r + texture2D(source, vUv - direction * 2.0).r) * 0.121622;
        value += (texture2D(source, vUv + direction * 3.0).r + texture2D(source, vUv - direction * 3.0).r) * 0.054054;
        value += (texture2D(source, vUv + direction * 4.0).r + texture2D(source, vUv - direction * 4.0).r) * 0.016216;
        gl_FragColor = vec4(vec3(value), 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });

  const haloMaterial = new THREE.ShaderMaterial({
    uniforms: { mask: { value: maskTarget.texture }, blurred: { value: blurTargetB.texture }, color: { value: new THREE.Color(0x69edff) } },
    vertexShader: quadVertex,
    fragmentShader: `uniform sampler2D mask; uniform sampler2D blurred; uniform vec3 color; varying vec2 vUv;
      void main() {
        float outside = 1.0 - texture2D(mask, vUv).r;
        float halo = clamp(texture2D(blurred, vUv).r * 2.2, 0.0, 0.9) * outside;
        gl_FragColor = vec4(color, halo);
      }`,
    transparent: true, depthTest: false, depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial);

  quad.frustumCulled = false;

  quadScene.add(quad);

  function renderScene() {
    const highlight = state.chosen && !state.collectionMode;
    if (highlight) {
      const width = Math.max(1, Math.round(app.engine.canvas.clientWidth / 2));
      const height = Math.max(1, Math.round(app.engine.canvas.clientHeight / 2));
      if (maskTarget.width !== app.engine.canvas.width || maskTarget.height !== app.engine.canvas.height) maskTarget.setSize(app.engine.canvas.width, app.engine.canvas.height);
      if (blurTargetA.width !== width || blurTargetA.height !== height) {
        blurTargetA.setSize(width, height); blurTargetB.setSize(width, height);
      }
      app.engine.renderer.setRenderTarget(maskTarget); app.engine.renderer.render(maskScene, app.engine.camera);
      quad.material = blurMaterial;
      blurMaterial.uniforms.source.value = maskTarget.texture;
      blurMaterial.uniforms.direction.value.set(2 / width, 0);
      app.engine.renderer.setRenderTarget(blurTargetA); app.engine.renderer.render(quadScene, quadCamera);
      blurMaterial.uniforms.source.value = blurTargetA.texture;
      blurMaterial.uniforms.direction.value.set(0, 2 / height);
      app.engine.renderer.setRenderTarget(blurTargetB); app.engine.renderer.render(quadScene, quadCamera);
    }
    app.engine.renderer.setRenderTarget(null); app.engine.renderer.render(app.engine.scene, app.engine.camera);
    if (highlight) {
      quad.material = haloMaterial;
      app.engine.renderer.autoClear = false; app.engine.renderer.render(quadScene, quadCamera); app.engine.renderer.autoClear = true;
    }
  }

  const gizmo = new THREE.Group();

  app.engine.scene.add(gizmo);

  const ringGeometry = new THREE.TorusGeometry(1, 0.013, 8, 96);

  const ringHitGeometry = new THREE.TorusGeometry(1, 0.065, 8, 64);

  const hiddenRingMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });

  const axisVectors = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

  const rings = [0xff7a92, 0x68eaa1, 0x79adff].map((color, index) => {
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false }));
    ring.renderOrder = 990;
    ring.userData.axis = index;
    const hit = new THREE.Mesh(ringHitGeometry, hiddenRingMaterial);
    hit.userData.axis = index;
    ring.add(hit); gizmo.add(ring);
    return ring;
  });

  function axisNormal(index, rotation) {
    const normal = axisVectors[index].clone();
    if (index === 1) normal.applyAxisAngle(axisVectors[0], THREE.MathUtils.degToRad(rotation[0]));
    if (index === 2) normal.applyEuler(new THREE.Euler(THREE.MathUtils.degToRad(rotation[0]), THREE.MathUtils.degToRad(rotation[1]), 0, "XYZ"));
    return normal;
  }

  function updateSelection() {
    selection.visible = !!state.chosen && !state.collectionMode;
    gizmo.visible = !!state.chosen && !state.collectionMode && state.mode === "rotate" && state.rotationExpanded;
    if (!state.chosen) return;
    selection.position.copy(state.chosen.anchor.position);
    selection.children.forEach((outline) => {
      outline.position.copy(state.chosen.mesh.position);
      outline.quaternion.copy(state.chosen.mesh.quaternion);
      outline.scale.copy(state.chosen.mesh.scale);
    });
    if (gizmo.visible) {
      gizmo.position.copy(state.chosen.mesh.getWorldPosition(new THREE.Vector3()));
      const radius = state.chosen.radius * state.chosen.size + 0.1;
      rings.forEach((ring, index) => {
        ring.quaternion.setFromUnitVectors(axisVectors[2], axisNormal(index, state.chosen.rot));
        ring.scale.setScalar(radius + index * 0.025);
        const active = $("axis").value;
        ring.material.opacity = active === "free" || active === ["x", "y", "z"][index] ? 0.9 : 0.25;
      });
      gizmo.updateMatrixWorld(true);
    }
  }

  return { selection, buildGlow, gizmo, rings, axisNormal, renderScene, updateSelection };
}
