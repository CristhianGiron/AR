import * as THREE from 'three';
import { transmissionSystem } from '../education/transmission-design.js';
import { createParametricGears } from './parametric-gears.js';

const colors = ['#f68c19', '#ff76a2', '#49b9dd', '#b393f5', '#79c965'];
export function createTransmissionGears(id) {
  const system = transmissionSystem(id), scene = new THREE.Group();
  const shafts = system.nodes.map((name, i) => {
    const shaft = new THREE.Group(); shaft.name = name; shaft.position.fromArray(system.centers[i]); scene.add(shaft); return shaft;
  });
  try {
    system.stages.forEach((stage, i) => {
      const pair = createParametricGears({ version: 1, teeth: stage.teeth, module: system.module, width: system.width, bore: 6 });
      [...pair.scene.children].forEach((wheel, j) => {
        const index = i + j;
        // In a simple train the preceding contact already supplied this intermediate wheel.
        if (!system.contacts[i].z && i > 0 && j === 0) {
          wheel.traverse(node => { node.geometry?.dispose(); node.material?.dispose(); }); return;
        }
        wheel.name = 'wheel-' + i + '-' + j;
        wheel.position.set(0, 0, system.contacts[i].z);
        wheel.rotation.z = j === 0 ? -system.phase[index] : 0;
        wheel.traverse(node => { if (node.material?.color) node.material.color.set(colors[index]); });
        shafts[index].add(wheel);
      });
    });
    // Axles visibly join the two wheels on a compound shaft, stopping within their bores.
    shafts.forEach((shaft, i) => {
      const heights = shaft.children.map(wheel => wheel.position.z), low = Math.min(...heights) - system.width / 2, high = Math.max(...heights) + system.width / 2;
      const geometry = new THREE.CylinderGeometry(2.7, 2.7, high - low + 4, 24); geometry.rotateX(Math.PI / 2);
      const axle = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#8593a9', metalness: .65, roughness: .4 }));
      axle.name = 'axle-' + i; axle.position.z = (low + high) / 2; shaft.add(axle);
    });
    return { scene, animations: [], transmissionVariant: id, gearSystem: system };
  } catch (error) { scene.traverse(node => { node.geometry?.dispose(); node.material?.dispose(); }); throw error; }
}
