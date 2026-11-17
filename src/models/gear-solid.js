import * as THREE from 'three';
import { GEAR_MATERIAL, STANDARD_GRAVITY } from '../education/gear-physical.js';

/** Integrate a closed OBJ in its manufacturing coordinates (mm), before display fitting. */
export function originalGearPhysical(parts, system) {
  const distance = new THREE.Vector3(...system.centers[0]).distanceTo(new THREE.Vector3(...system.centers[1]));
  const module = 2 * distance / (system.teeth[0] + system.teeth[1]);
  const measured = parts.map((part, index) => {
    part.pivot.updateWorldMatrix(true, true);
    const inverse = part.pivot.matrixWorld.clone().invert();
    let volume = 0, moment = 0, outer = 0, bore = Infinity, low = Infinity, high = -Infinity;
    part.pivot.traverse(node => {
      if (!node.isMesh) return;
      const matrix = inverse.clone().multiply(node.matrixWorld), geometry = node.geometry, positions = geometry.attributes.position;
      const count = geometry.index?.count ?? positions.count;
      for (let i = 0; i < count; i += 3) {
        const triangle = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, geometry.index ? geometry.index.getX(i + j) : i + j).applyMatrix4(matrix));
        const [a, b, c] = triangle, signed = a.dot(b.clone().cross(c)) / 6;
        volume += signed;
        const second = k => a[k] ** 2 + b[k] ** 2 + c[k] ** 2 + a[k] * b[k] + a[k] * c[k] + b[k] * c[k];
        moment += signed * (second('x') + second('y')) / 10;
        for (const v of triangle) { const r = Math.hypot(v.x, v.y); outer = Math.max(outer, r); bore = Math.min(bore, r); low = Math.min(low, v.z); high = Math.max(high, v.z); }
      }
    });
    volume = Math.abs(volume) * 1e-9;
    const mass = volume * GEAR_MATERIAL.density;
    return Object.freeze({ pitchRadius: system.teeth[index] * module / 2000, outerRadius: outer / 1000,
      bore: 2 * bore / 1000, width: (high - low) / 1000, volume, mass, weight: mass * STANDARD_GRAVITY,
      inertia: Math.abs(moment) * 1e-15 * GEAR_MATERIAL.density });
  });
  return Object.freeze({ material: GEAR_MATERIAL, parts: Object.freeze(measured), totalMass: measured.reduce((sum, p) => sum + p.mass, 0) });
}
