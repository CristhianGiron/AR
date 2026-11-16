import * as THREE from 'three';
import { validateGearDesign, parametricSystem, spurOutline } from '../education/gear-design.js';

export function createParametricGears(input) {
  const design = validateGearDesign(input), system = parametricSystem(design), scene = new THREE.Group();
  try {
    design.teeth.forEach((teeth, index) => {
      const points = spurOutline(teeth, design.module), shape = new THREE.Shape();
      shape.moveTo(...points[0]); points.slice(1).forEach((point) => shape.lineTo(...point)); shape.closePath();
      if (design.bore > 0) {
        const hole = new THREE.Path(); hole.absarc(0, 0, design.bore / 2, 0, Math.PI * 2, true); shape.holes.push(hole);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: design.width, bevelEnabled: false, steps: 1, curveSegments: 48 });
      geometry.translate(0, 0, -design.width / 2); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const material = new THREE.MeshStandardMaterial({ color: index ? '#ff76a2' : '#f68c19', metalness: .25, roughness: .35 });
      const mesh = new THREE.Mesh(geometry, material); mesh.name = system.nodes[index]; mesh.position.fromArray(system.centers[index]); scene.add(mesh);
    });
    return { scene, animations: [], gearDesign: design };
  } catch (error) { scene.traverse((node) => { node.geometry?.dispose(); node.material?.dispose(); }); throw error; }
}
