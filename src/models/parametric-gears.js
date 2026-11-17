import * as THREE from 'three';
import { validateGearDesign, parametricSystem, spurOutline, gearFaceRelief } from '../education/gear-design.js';

export function createParametricGears(input) {
  const design = validateGearDesign(input), system = parametricSystem(design), scene = new THREE.Group();
  try {
    design.teeth.forEach((teeth, index) => {
      const points = spurOutline(teeth, design.module), relief = gearFaceRelief(teeth, design.module, design.width, design.bore);
      const shapeWithHole = radius => {
        const shape = new THREE.Shape();
        shape.moveTo(...points[0]); points.slice(1).forEach(point => shape.lineTo(...point)); shape.closePath();
        if (radius > 0) { const hole = new THREE.Path(); hole.absarc(0, 0, radius, 0, Math.PI * 2, true); shape.holes.push(hole); }
        return shape;
      };
      const extrude = (shape, depth, z) => {
        const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 48 });
        geometry.translate(0, 0, z); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
      };
      const geometry = extrude(shapeWithHole(design.bore / 2), design.width - 2 * relief.depth, -design.width / 2 + relief.depth);
      const material = new THREE.MeshStandardMaterial({ color: index ? '#ff76a2' : '#f68c19', metalness: .25, roughness: .35 });
      const mesh = new THREE.Mesh(geometry, material); mesh.name = system.nodes[index]; mesh.position.fromArray(system.centers[index]); scene.add(mesh);
      if (relief.depth) for (const [side, z] of [['back', -design.width / 2], ['front', design.width / 2 - relief.depth]]) {
        const rim = new THREE.Mesh(extrude(shapeWithHole(relief.radius), relief.depth, z), material);
        rim.name = system.nodes[index] + '-' + side; mesh.add(rim);
      }
    });
    return { scene, animations: [], gearDesign: design };
  } catch (error) { scene.traverse((node) => { node.geometry?.dispose(); node.material?.dispose(); }); throw error; }
}
