import * as THREE from 'three';
import { $ } from '../ui/dom.js';
import { rotationAngles } from '../education/gear-model.js';

const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const rect = (x, y, w, h) => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h });
const number = (v, digits = 1) => Number(v.toFixed(digits)).toLocaleString('es');

export function createGearTelemetry(app) {
  const layer = $('gear-telemetry'), svg = $('gear-telemetry-lines');
  const cards = [0, 1].map((index) => {
    const card = document.createElement('div'); card.className = 'gear-readout'; card.dataset.wheel = index;
    card.innerHTML = '<div class="readout-heading"><span class="readout-dot"></span><b>' + (index ? '02 · SALIDA' : '01 · ENTRADA') + '</b><span class="readout-state"></span></div><div class="readout-speed"><strong>0</strong><span>rpm</span></div><div class="readout-details"></div><div class="readout-angle"></div><div class="readout-setting"></div>';
    layer.append(card);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'), dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    path.dataset.wheel = dot.dataset.wheel = index; dot.setAttribute('r', '3'); svg.append(path, dot);
    return { card, path, dot, speed: card.querySelector('strong'), state: card.querySelector('.readout-state'), details: card.querySelector('.readout-details'), angle: card.querySelector('.readout-angle'), setting: card.querySelector('.readout-setting') };
  });
  let enabled = true;
  const point = new THREE.Vector3();
  function text(element, value) { if (element.textContent !== value) element.textContent = value; }
  function toggle() {
    enabled = !enabled; $('toggle-telemetry').setAttribute('aria-pressed', String(enabled)); updateFrame();
  }
  $('toggle-telemetry').onclick = toggle;
  function updateFrame() {
    const item = app.state.chosen, mechanism = item?.mechanism;
    const show = enabled && mechanism && item.anchor.visible && !app.state.hudHidden && !app.hud.isBlocking() && !app.spatial?.active && !app.spatial?.pending;
    layer.hidden = !show; $('toggle-telemetry').hidden = !mechanism;
    if (!show) return;
    const camera = app.engine.camera, canvas = app.engine.canvas.getBoundingClientRect();
    const viewport = { width: innerWidth, height: innerHeight }, top = $('header').getBoundingClientRect().bottom + 8;
    const obstacles = ['workspace-panel', 'bar', 'gear-transport', 'gear-model-switcher', 'gear-inline', 'gear-context', 'tools', 'class-return', 'notice'].map($)
      .filter((node) => node && !node.hidden && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden')
      .map((node) => node.getBoundingClientRect());
    const panel = app.hud.dockedPanel(); if (panel) obstacles.push(panel.getBoundingClientRect());
    // The existing name label remains readable, especially on narrow screens.
    item.tag.updateWorldMatrix(true, false);
    const nameBounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (let corner = 0; corner < 4; corner++) {
      point.set((corner & 1) - .5, (corner >> 1) - .5, 0).applyMatrix4(item.tag.matrixWorld).project(camera);
      const x = canvas.left + (point.x + 1) * canvas.width / 2, y = canvas.top + (1 - point.y) * canvas.height / 2;
      nameBounds.left = Math.min(nameBounds.left, x - 4); nameBounds.right = Math.max(nameBounds.right, x + 4);
      nameBounds.top = Math.min(nameBounds.top, y - 4); nameBounds.bottom = Math.max(nameBounds.bottom, y + 4);
    }
    if (item.tag.visible) obstacles.push(nameBounds);
    const projected = mechanism.parts.map((part) => {
      part.pivot.updateWorldMatrix(true, false); part.pivot.getWorldPosition(point); point.project(camera);
      return { x: canvas.left + (point.x + 1) * canvas.width / 2, y: canvas.top + (1 - point.y) * canvas.height / 2, z: point.z };
    });
    cards.forEach(({ card }) => { card.hidden = false; });
    const dimensions = cards.map(({ card }) => ({ w: card.offsetWidth, h: card.offsetHeight }));
    const placed = [], angles = rotationAngles(mechanism.system, mechanism.state.angle, mechanism.state.offsets);
    svg.setAttribute('viewBox', '0 0 ' + viewport.width + ' ' + viewport.height);
    const running = mechanism.state.running && !mechanism.state.separation && mechanism.state.isolated === null;
    layer.dataset.running = String(running);
    cards.forEach((record, index) => {
      const p = projected[index], { w, h } = dimensions[index];
      const visible = mechanism.parts[index].pivot.visible && p.z >= -1 && p.z <= 1 && p.x >= 0 && p.x <= viewport.width && p.y >= top && p.y < viewport.height - 60;
      record.card.hidden = !visible; record.path.hidden = record.dot.hidden = !visible;
      record.path.style.display = record.dot.style.display = visible ? '' : 'none';
      if (!visible) return;
      const rpm = running ? mechanism.state.rpm * (index ? mechanism.system.teeth[0] / mechanism.system.teeth[1] : 1) : 0;
      const sign = mechanism.state.direction * (index ? -1 : 1), arrow = sign > 0 ? '↺' : '↻';
      text(record.speed, number(rpm)); text(record.state, running ? 'ACTIVO' : 'PAUSA');
      text(record.details, mechanism.system.teeth[index] + ' dientes · ' + arrow + ' eje local');
      text(record.angle, 'ω ' + number(rpm * Math.PI / 30, 2) + ' rad/s · θ ' + number(((angles[index] * 180 / Math.PI) % 360 + 360) % 360, 0) + '°');
      const setpoint = mechanism.state.rpm * (index ? mechanism.system.teeth[0] / mechanism.system.teeth[1] : 1);
      text(record.setting, running ? 'R ' + number(mechanism.system.teeth[1] / mechanism.system.teeth[0], 2) + ':1 · velocidad simulada' : 'Ajuste ' + number(setpoint) + ' rpm');
      const candidates = [];
      const positions = [];
      for (const dx of [-w - 30, 30, -w / 2]) for (const dy of [-h - 35, 20, -h / 2, -2 * h - 50, h + 35]) positions.push([p.x + dx, p.y + dy]);
      // A compact fallback grid provides space when the name label blocks the nearest slot.
      for (let y = top; y <= viewport.height - h - 90; y += h + 10) {
        for (const x of [8, (viewport.width - w) / 2, viewport.width - w - 8]) positions.push([x, y]);
      }
      for (const [rawX, rawY] of positions) {
        const x = Math.max(8, Math.min(viewport.width - w - 8, rawX));
        const y = Math.max(top, Math.min(viewport.height - h - 90, rawY));
        const box = rect(x, y, w, h);
        const collision = obstacles.reduce((sum, other) => sum + overlap(box, other), 0);
        const clash = placed.reduce((sum, other) => sum + overlap(box, other), 0);
        const model = projected.reduce((sum, other) => sum + overlap(box, rect(other.x - 35, other.y - 35, 70, 70)), 0);
        candidates.push({ box, collision, clash, score: collision * 300 + clash * 500 + model * 3 + Math.hypot(x + w / 2 - p.x, y + h / 2 - p.y) });
      }
      candidates.sort((a, b) => a.score - b.score);
      const best = candidates[0];
      if (best.collision > 1 || best.clash > 1) {
        record.card.hidden = true; record.path.style.display = record.dot.style.display = 'none'; return;
      }
      placed.push(best.box);
      const b = best.box, startX = Math.max(b.left + 8, Math.min(b.right - 8, p.x)), startY = p.y > b.bottom ? b.bottom : p.y < b.top ? b.top : b.top + h / 2;
      record.card.style.transform = 'translate(' + b.left.toFixed(1) + 'px,' + b.top.toFixed(1) + 'px)';
      record.path.setAttribute('d', `M${startX.toFixed(1)},${startY.toFixed(1)} L${startX.toFixed(1)},${((startY + p.y) / 2).toFixed(1)} L${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      record.dot.setAttribute('cx', p.x.toFixed(1)); record.dot.setAttribute('cy', p.y.toFixed(1));
      record.card.setAttribute('aria-label', (index ? 'Salida' : 'Entrada') + ': ' + number(rpm) + ' rpm, ' + mechanism.system.teeth[index] + ' dientes. ' + (running ? 'En movimiento.' : 'En pausa.'));
    });
  }
  return { updateFrame, toggle };
}
