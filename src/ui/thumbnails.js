import * as THREE from 'three';

/** Small real-model portraits; geometry and materials remain owned by the scene. */
export function createThumbnails(app) {
  const cache = new WeakMap();
  function source(item) {
    const cached = cache.get(item);
    if (cached?.color === item.color) return cached.url;
    const scene = new THREE.Scene(), model = item.mesh.clone(true);
    const group = new THREE.Group(); group.add(model); scene.add(group);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model), center = box.getCenter(new THREE.Vector3());
    group.position.copy(center).negate();
    const radius = Math.max(0.1, box.getSize(new THREE.Vector3()).length() / 2);
    const camera = new THREE.PerspectiveCamera(38, 1, radius / 100, radius * 20);
    camera.position.set(radius * 1.7, radius * 1.1, radius * 2.7); camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5971ab, 2.8));
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(3, 5, 4); scene.add(light);
    const renderer = app.engine.renderer, target = new THREE.WebGLRenderTarget(128, 128);
    const previousTarget = renderer.getRenderTarget(), color = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
    const pixels = new Uint8Array(128 * 128 * 4);
    try {
      renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(target); renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, 128, 128, pixels);
    } finally {
      renderer.setRenderTarget(previousTarget); renderer.setClearColor(color, alpha); target.dispose(); scene.clear();
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d'), image = context.createImageData(128, 128);
    for (let row = 0; row < 128; row++) image.data.set(pixels.subarray(row * 512, (row + 1) * 512), (127 - row) * 512);
    context.putImageData(image, 0, 0);
    const url = canvas.toDataURL(); cache.set(item, { color: item.color, url }); return url;
  }
  return { source };
}
