import * as THREE from 'three';
import { $ } from '../ui/dom.js';
import { actualRPM, forceReadings } from '../education/gear-dynamics.js';
import { rotationAngles, speedFactors, gearRatio, gearRPM } from '../education/gear-model.js';

import { arrangeGearLabels, boxAt } from './gear-label-layout.js';

const number = (v, digits = 1) => Number(v.toFixed(digits)).toLocaleString('es');

export function createGearTelemetry(app) {
  const layer = $('gear-telemetry'), svg = $('gear-telemetry-lines');
  const cards = [];
  function addCard(index) {
    const card = document.createElement('div'); card.className = 'gear-readout'; card.dataset.wheel = index;
    card.innerHTML = '<div class="readout-heading"><span class="readout-dot"></span><b>' + (index ? '02 · SALIDA' : '01 · ENTRADA') + '</b><span class="readout-state"></span></div><div class="readout-speed"><strong>0</strong><span>rpm</span></div><div class="readout-details"></div><div class="readout-angle"></div><div class="readout-setting"></div><div class="readout-force" hidden></div><div class="readout-torque" hidden></div>';
    layer.append(card);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'), dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    path.dataset.wheel = dot.dataset.wheel = index; dot.setAttribute('r', '3'); svg.append(path, dot);
    return { card, path, dot, heading: card.querySelector('b'), speed: card.querySelector('strong'), state: card.querySelector('.readout-state'), details: card.querySelector('.readout-details'), angle: card.querySelector('.readout-angle'), setting: card.querySelector('.readout-setting'), force: card.querySelector('.readout-force'), torque: card.querySelector('.readout-torque') };
  }
  for (let index = 0; index < 2; index++) cards.push(addCard(index));
  let enabled = true, lastItem = null, signature = '', placements = [], previous = [], layoutInput = null;
  function measure(record) {
    const measureKey = innerWidth + ':' + !record.force.hidden;
    if (record.measureWidth !== measureKey) {
      record.sizes = {};
      for (const density of ['full', 'compact']) {
        record.card.dataset.density = density; record.card.hidden = false;
        record.sizes[density] = { w: record.card.offsetWidth, h: record.card.offsetHeight };
      }
      record.measureWidth = measureKey;
    }
    return record.sizes;
  }
  const point = new THREE.Vector3(), axisWorld = new THREE.Vector3(), homeWorld = new THREE.Vector3(), displacement = new THREE.Vector3();
  function projectPart(item, part, index, camera, canvas) {
    const bounds = item.partBounds.get(item.mechanism.system.nodes[index]);
    part.pivot.getWorldPosition(axisWorld);
    part.pivot.parent.localToWorld(homeWorld.copy(part.home));
    displacement.copy(axisWorld).sub(homeWorld);
    const footprint = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    if (bounds) for (let corner = 0; corner < 8; corner++) {
      point.set(corner & 1 ? bounds.max.x : bounds.min.x, corner & 2 ? bounds.max.y : bounds.min.y, corner & 4 ? bounds.max.z : bounds.min.z)
        .applyMatrix4(item.mesh.matrixWorld).add(displacement).project(camera);
      const x = canvas.left + (point.x + 1) * canvas.width / 2, y = canvas.top + (1 - point.y) * canvas.height / 2;
      footprint.left = Math.min(footprint.left, x); footprint.right = Math.max(footprint.right, x);
      footprint.top = Math.min(footprint.top, y); footprint.bottom = Math.max(footprint.bottom, y);
    }
    point.copy(axisWorld).project(camera);
    const anchor = { x: canvas.left + (point.x + 1) * canvas.width / 2, y: canvas.top + (1 - point.y) * canvas.height / 2, z: point.z };
    return { ...anchor, footprint: bounds ? footprint : boxAt(anchor.x - 20, anchor.y - 20, 40, 40) };
  }
  function text(element, value) { if (element.textContent !== value) element.textContent = value; }
  function toggle() {
    enabled = !enabled; $('toggle-telemetry').setAttribute('aria-pressed', String(enabled)); updateFrame();
  }
  $('toggle-telemetry').onclick = toggle;
  function updateFrame() {
    app.gearDirections?.updateFrame();
    const item = app.state.chosen, mechanism = item?.mechanism;
    const show = enabled && mechanism && item.anchor.visible && !app.state.hudHidden && !app.hud.isBlocking() && !app.spatial?.active && !app.spatial?.pending;
    layer.hidden = !show; $('toggle-telemetry').hidden = !mechanism;
    if (!show) return;
    while (cards.length < mechanism.parts.length) cards.push(addCard(cards.length));
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
    item.mesh.updateWorldMatrix(true, true);
    const projected = mechanism.parts.map((part, index) => projectPart(item, part, index, camera, canvas));
    if (lastItem !== item) { lastItem = item; signature = ''; placements = []; previous = []; }
    const factors = speedFactors(mechanism.system), angles = rotationAngles(mechanism.system, mechanism.state.angle, mechanism.state.offsets);
    const running = mechanism.state.running && !mechanism.state.separation && mechanism.state.isolated === null;
    const labels = [], physics = forceReadings(mechanism);
    svg.setAttribute('viewBox', '0 0 ' + viewport.width + ' ' + viewport.height); layer.dataset.running = String(running);
    cards.forEach((record, index) => {
      const p = projected[index];
      const visible = p && mechanism.parts[index].pivot.visible && p.z >= -1 && p.z <= 1 && p.x >= 8 && p.x <= viewport.width - 8 && p.y >= top && p.y < viewport.height - 12;
      record.card.hidden = true; record.path.style.display = record.dot.style.display = 'none';
      if (!p) return;
      const role = index === 0 ? 'Entrada' : index === mechanism.parts.length - 1 ? 'Salida' : 'Intermedio ' + index;
      const caption = index > 0 && index < mechanism.parts.length - 1 ? 'INT. ' + index : role.toUpperCase();
      text(record.heading, String(index + 1).padStart(2, '0') + ' · ' + caption);
      const rpm = running ? gearRPM(mechanism.system, actualRPM(mechanism), index) : 0;
      const sign = mechanism.state.direction * Math.sign(factors[index]), arrow = sign > 0 ? '↺' : '↻';
      const teeth = mechanism.system.partTeeth?.[index]?.join(' / ') || mechanism.system.teeth[index];
      const setpoint = gearRPM(mechanism.system, mechanism.state.rpm, index);
      const angular = number(rpm * Math.PI / 30, 2), angle = number(((angles[index] * 180 / Math.PI) % 360 + 360) % 360, 0);
      text(record.speed, number(rpm)); text(record.state, physics?.stalled ? 'CARGA' : running ? 'ACTIVO' : 'PAUSA');
      record.angleFull = 'ω ' + angular + ' rad/s · θ ' + angle + '°';
      record.angleShort = 'ω' + angular + 'rad/s θ' + angle + '°';
      text(record.angle, record.angleFull);
      record.detailsShort = String(teeth).replaceAll(' / ', '/') + ' dientes ' + arrow;
      record.detailsText = teeth + ' dientes · ' + arrow;
      record.settingText = running ? 'R ' + number(gearRatio(mechanism.system), 2) + ':1 · simulación' : 'Ajuste ' + number(setpoint) + ' rpm';
      if (physics) record.settingText = index && physics.connected ? 'τ disp. ' + number(physics.available, 3) + ' N·m' : !physics.connected ? 'Desconectado' : physics.limited ? 'Límite 240 rpm' : physics.stalled ? 'Carga: detenido' : 'Accionado por fuerza';
      text(record.details, record.detailsText); text(record.setting, record.settingText);
      record.force.hidden = record.torque.hidden = !physics;
      if (physics) {
        const force = index === 0 ? physics.running ? mechanism.state.drive.force : 0 : physics.force2;
        const torque = index === 0 ? physics.running ? physics.applied : 0 : physics.torque2;
        text(record.force, (index ? 'Fₜ ' : 'F ') + number(force, 3) + ' N');
        text(record.torque, (index ? 'τ₂ ' : 'τ₁ ') + number(torque, 3) + ' N·m');
      }
      record.card.setAttribute('role', 'group');
      record.card.setAttribute('aria-label', role + ': ' + number(rpm) + ' rpm, ' + teeth + ' dientes, velocidad angular ' + angular + ' radianes por segundo, ángulo ' + angle + ' grados. ' + (running ? 'En movimiento.' : 'En pausa, ajuste de ' + number(setpoint) + ' rpm.') + (physics ? ' ' + record.force.textContent + ', ' + record.torque.textContent + '. Modelo dinámico educativo.' : ''));
      if (visible) labels.push({ index, anchor: p, footprint: p.footprint, sizes: measure(record) });
    });
    const modelBounds = projected.filter((point, index) => mechanism.parts[index].pivot.visible && point.z >= -1 && point.z <= 1).map(point => point.footprint);
    const safe = boxAt(8, top, viewport.width - 16, Math.max(0, viewport.height - top - 12));
    // Values and motor angle do not change the layout; solve only when geometry/UI moves.
    const key = [innerWidth, innerHeight, !!physics, ...labels.flatMap(label => [label.index, Math.round(label.anchor.x * 2), Math.round(label.anchor.y * 2), ...[label.footprint.left, label.footprint.top, label.footprint.right, label.footprint.bottom].map(Math.round)]), ...[...obstacles, ...modelBounds].flatMap(box => [box.left, box.top, box.right, box.bottom].map(Math.round))].join('|');
    if (key !== signature) {
      layoutInput = { labels, obstacles, modelBounds, viewport: safe, previous, maxDistance: innerWidth <= 600 ? 112 : 128 };
      placements = arrangeGearLabels(layoutInput);
      previous = []; for (const placement of placements) previous[placement.index] = placement;
      signature = key;
    }
    // Measuring a new density must not accidentally reveal a card with no safe local slot.
    cards.forEach(record => { record.card.hidden = true; record.path.style.display = record.dot.style.display = 'none'; });
    for (const placement of placements) {
      const record = cards[placement.index], p = projected[placement.index], b = placement.box;
      record.card.hidden = false; record.card.dataset.density = placement.density;
      if (placement.density === 'compact') { text(record.angle, record.angleShort); text(record.details, record.detailsShort); }
      record.card.style.transform = 'translate(' + b.left.toFixed(1) + 'px,' + b.top.toFixed(1) + 'px)';
      record.path.style.display = record.dot.style.display = '';
      const route = placement.route.map((point, i) => (i ? 'L' : 'M') + point.x.toFixed(1) + ',' + point.y.toFixed(1)).join(' ');
      record.path.setAttribute('d', route);
      record.card.dataset.modelGap = String(Math.round(Math.hypot(Math.max(b.left - p.footprint.right, p.footprint.left - b.right, 0), Math.max(b.top - p.footprint.bottom, p.footprint.top - b.bottom, 0))));
      record.dot.setAttribute('cx', p.x.toFixed(1)); record.dot.setAttribute('cy', p.y.toFixed(1));
    }
  }
  return { updateFrame, toggle, get layout() { return { input: layoutInput, placements }; } };
}
