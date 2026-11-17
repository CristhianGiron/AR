import * as THREE from 'three';

const materialsOf = node => Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];

/** Clone per moving part: an OBJ can reuse one material for multiple gears. */
export function preparePartColors(node) {
  const copies = new Map(), originals = new Map();
  node.traverse(mesh => {
    if (!mesh.material) return;
    const copy = material => {
      if (!copies.has(material)) {
        const cloned = material.clone(); copies.set(material, cloned);
        if (cloned.color) originals.set(cloned, cloned.color.clone());
      }
      return copies.get(material);
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
  });
  return originals;
}
export function applyGearColors(item) {
  const mechanism = item?.mechanism; if (!mechanism) return;
  const tint = new THREE.Color(item.color);
  mechanism.parts.forEach((part, index) => {
    const color = mechanism.state.colors?.[index];
    part.originalColors.forEach((original, material) => {
      if (color) material.color.set(color);
      else material.color.copy(original).multiply(tint);
    });
  });
}
export function partColor(item, index) {
  const part = item?.mechanism?.parts[index];
  if (!part) return '#ffffff';
  let color = '#ffffff';
  part.pivot.traverse(node => {
    const material = materialsOf(node).find(material => material.color);
    if (material) color = '#' + material.color.getHexString();
  });
  return color;
}
