import * as THREE from 'three';
import { speedFactors, rotationAngles } from '../education/gear-model.js';

const NS = 'http://www.w3.org/2000/svg';
const colors = ['#ffe26b', '#ffb4d6', '#83f3de', '#d6b7ff'];
export function createGearDirections(app) {
  const svg = document.createElementNS(NS, 'svg'); svg.id = 'gear-direction-arrows';
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Flechas que indican el sentido de giro de cada engranaje');
  document.body.append(svg);
  const records = [], reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const center = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), point = new THREE.Vector3(), reference = new THREE.Vector3();
  let enabled = false;
  svg.style.display = 'none';
  const pointString = p => p.x.toFixed(1) + ',' + p.y.toFixed(1);
  function add(index) {
    const group = document.createElementNS(NS, 'g'); group.dataset.gear = index;
    const title = document.createElementNS(NS, 'title'); group.append(title);
    const arrows = [0, Math.PI].map(() => {
      const outline = document.createElementNS(NS, 'path'), arc = document.createElementNS(NS, 'path'), head = document.createElementNS(NS, 'path');
      outline.classList.add('direction-outline'); arc.classList.add('direction-arc'); head.classList.add('direction-head');
      group.append(outline, arc, head); return { outline, arc, head };
    });
    group.style.setProperty('--direction-color', colors[index % colors.length]); svg.append(group);
    return { group, arrows, title };
  }
  function project(radius, theta, camera, canvas) {
    point.copy(u).multiplyScalar(Math.cos(theta) * radius).addScaledVector(v, Math.sin(theta) * radius).add(center).project(camera);
    return { x: canvas.left + (point.x + 1) * canvas.width / 2, y: canvas.top + (1 - point.y) * canvas.height / 2 };
  }
  function updateFrame() {
    const item = app.state.chosen, mechanism = item?.mechanism;
    const show = enabled && mechanism && item.anchor.visible && !app.state.hudHidden && !app.hud.isBlocking() && !app.spatial?.active && !app.spatial?.pending;
    svg.hidden = !show; svg.style.display = show ? '' : 'none';
    const toggle = document.getElementById('gear-hub-direction');
    if (toggle) toggle.setAttribute('aria-pressed', String(enabled));
    if (!show) return;
    while (records.length < mechanism.parts.length) records.push(add(records.length));
    const camera = app.engine.camera, canvas = app.engine.canvas.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + innerWidth + ' ' + innerHeight);
    item.mesh.updateWorldMatrix(true, true);
    const factors = speedFactors(mechanism.system), angles = rotationAngles(mechanism.system, mechanism.state.angle, mechanism.state.offsets);
    const moving = mechanism.state.running && !mechanism.state.separation && mechanism.state.isolated === null;
    svg.dataset.running = String(moving);
    records.forEach((record, index) => {
      const part = mechanism.parts[index];
      record.group.style.display = part?.pivot.visible ? '' : 'none'; if (!part?.pivot.visible) return;
      part.pivot.getWorldPosition(center); point.copy(center).project(camera);
      if (point.z < -1 || point.z > 1) { record.group.style.display = 'none'; return; }
      if (!part.directionRadius) {
        const bounds = item.partBounds.get(mechanism.system.nodes[index]), size = bounds?.getSize(new THREE.Vector3());
        const parentScale = part.pivot.getWorldScale(new THREE.Vector3()).x;
        // Find a radius in world space from the model's preserved local part bounds.
        const localRadius = size ? Math.max(...size.toArray().filter((_, axis) => Math.abs(part.axis.getComponent(axis)) < .9)) * .32 : .25;
        part.directionRadius = localRadius / (parentScale / item.size);
      }
      reference.set(Math.abs(part.axis.z) < .9 ? 0 : 1, 0, Math.abs(part.axis.z) < .9 ? 1 : 0);
      u.crossVectors(reference, part.axis).normalize(); v.crossVectors(part.axis, u).normalize();
      const worldScale = part.pivot.getWorldScale(reference).x;
      u.transformDirection(part.pivot.parent.matrixWorld).multiplyScalar(worldScale);
      v.transformDirection(part.pivot.parent.matrixWorld).multiplyScalar(worldScale);
      const sign = mechanism.state.direction * Math.sign(factors[index]);
      // A separated/isolated piece advances independently when stepping.
      const direction = mechanism.state.separation || mechanism.state.isolated !== null ? mechanism.state.direction : sign;
      const phase = reduced.matches ? 0 : angles[index];
      record.group.dataset.sign = String(direction);
      record.title.textContent = (mechanism.system.labels?.[index] || (index ? 'Salida' : 'Entrada')) + ': sentido indicado por la flecha. ' + (moving ? 'En movimiento.' : 'En pausa; sentido configurado.');
      const radius = part.directionRadius;
      const origin = project(radius, phase, camera, canvas), opposite = project(radius, phase + Math.PI, camera, canvas);
      if (Math.hypot(origin.x - opposite.x, origin.y - opposite.y) < 12) { record.group.style.display = 'none'; return; }
      record.arrows.forEach((arrow, half) => {
        const start = phase + half * Math.PI, points = [];
        for (let i = 0; i <= 20; i++) points.push(project(radius, start + direction * i / 20 * Math.PI * .68, camera, canvas));
        const tip = points.at(-1), before = points.at(-3), dx = tip.x - before.x, dy = tip.y - before.y, norm = Math.hypot(dx, dy);
        if (norm < .01) return;
        const tx = dx / norm, ty = dy / norm, size = innerWidth <= 600 ? 9 : 11;
        const left = { x: tip.x - tx * size - ty * size * .55, y: tip.y - ty * size + tx * size * .55 };
        const right = { x: tip.x - tx * size + ty * size * .55, y: tip.y - ty * size - tx * size * .55 };
        const d = points.map((p, i) => (i ? 'L' : 'M') + pointString(p)).join(' ');
        arrow.arc.setAttribute('d', d); arrow.outline.setAttribute('d', d);
        arrow.head.setAttribute('d', 'M' + pointString(tip) + ' L' + pointString(left) + ' L' + pointString(right) + ' Z');
      });
    });
  }
  function toggle() { enabled = !enabled; updateFrame(); }
  reduced.addEventListener('change', updateFrame);
  return { updateFrame, toggle, get enabled() { return enabled; } };
}
