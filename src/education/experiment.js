import * as THREE from 'three';
import { $ } from '../ui/dom.js';
import { lightResponse } from './ldr-model.js';

export function createExperiment(app) {
  let item = null, active = false, drag = null;
  const lamp = $('virtual-lamp'), layer = $('light-lab'), center = new THREE.Vector3();
  function activity() { return item.activity ||= { distance: .5, observations: [], explanation: '' }; }
  function describe(distance) { const r = lightResponse(distance); return 'Luz ' + r.lightLabel + ' · resistencia ' + r.resistanceLabel; }
  function update() {
    if (!item) return;
    const data = activity(), r = lightResponse(data.distance);
    $('experiment-reading').textContent = describe(data.distance);
    $('lamp-reading').textContent = describe(data.distance);
    $('experiment-light').value = r.light; $('experiment-resistance').value = r.resistance;
    lamp.setAttribute('aria-valuenow', Math.round(data.distance * 100));
    lamp.setAttribute('aria-valuetext', describe(data.distance));
    $('record-observation').disabled = data.observations.length >= 12;
    $('observation-list').replaceChildren();
    data.observations.forEach((sample, i) => { const row = document.createElement('li'); row.textContent = (i + 1) + '. ' + describe(sample.distance); $('observation-list').append(row); });
    $('observation-count').textContent = data.observations.length + ' de 12 observaciones';
    updateFrame(); app.pagination?.refresh($('experiment'));
  }
  function setDistance(value) { if (!item) return; activity().distance = Math.max(0, Math.min(1, value)); update(); }
  function stop() { active = false; drag = null; layer.hidden = true; document.body.classList.remove('experiment-active'); }
  function start() {
    if (!item) return;
    app.experiment.stop();
    app.learning.ensureFocused();
    app.parts.stop(); active = true; layer.hidden = false; document.body.classList.add('experiment-active'); $('notice').hidden = true; update();
  }
  function render(target) {
    const supported = target?.definition.id === 'sensor-luz-ldr';
    if (target === item) return;
    stop(); item = supported ? target : null;
    if (item) { $('experiment-explanation').value = activity().explanation; update(); }
  }
  function projectedCenter() {
    const face = app.parts.partsFor(item).find((part) => part.id === 'pista');
    if (face) { face.box.getCenter(center); item.mesh.localToWorld(center); } else new THREE.Box3().setFromObject(item.mesh).getCenter(center);
    center.project(app.engine.camera);
    const rect = app.engine.canvas.getBoundingClientRect();
    return { x: rect.left + (center.x + 1) * rect.width / 2, y: rect.top + (1 - center.y) * rect.height / 2, rect };
  }
  function updateFrame() {
    if (!active) return;
    if (app.state.chosen !== item || !app.state.entries.includes(item)) { stop(); return; }
    const p = projectedCenter(), reach = Math.min(180, p.rect.width * .28), offset = 45 + activity().distance * reach;
    const x = Math.max(26, Math.min(innerWidth - 26, p.x + offset)), y = Math.max(120, Math.min(innerHeight - 100, p.y - 60));
    lamp.style.left = x + 'px'; lamp.style.top = y + 'px';
    const line = $('light-ray'); line.setAttribute('x1', x); line.setAttribute('y1', y); line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
    for (const [id, cx, cy] of [['light-source-dot', x, y], ['light-target-dot', p.x, p.y]]) { $(id).setAttribute('cx', cx); $(id).setAttribute('cy', cy); }
    layer.classList.toggle('lab-blocked', app.hud.isBlocking());
  }
  lamp.addEventListener('pointerdown', (event) => { if (event.button !== 0) return; drag = { id: event.pointerId, x: event.clientX, distance: activity().distance }; lamp.setPointerCapture(event.pointerId); event.preventDefault(); });
  lamp.addEventListener('pointermove', (event) => { if (drag?.id === event.pointerId) setDistance(drag.distance + (event.clientX - drag.x) / Math.min(180, innerWidth * .28)); });
  const release = () => { drag = null; };
  lamp.addEventListener('pointerup', release); lamp.addEventListener('pointercancel', release); lamp.addEventListener('lostpointercapture', release);
  lamp.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); setDistance(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : activity().distance + (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -.1 : .1));
  });
  for (const id of ['less-light', 'lamp-less']) $(id).onclick = () => setDistance(activity().distance + .2);
  for (const id of ['more-light', 'lamp-more']) $(id).onclick = () => setDistance(activity().distance - .2);
  $('experiment-explore').onclick = () => { start(); app.hud.close(false); updateFrame(); lamp.focus({ preventScroll: true }); };
  $('lamp-details').onclick = () => app.hud.open('experiment', $('open-experiment'));
  $('lamp-stop').onclick = () => { stop(); $('object-inspect').focus({ preventScroll: true }); };
  $('record-observation').onclick = () => { if (item && activity().observations.length < 12) { activity().observations.push({ distance: activity().distance }); update(); app.pagination.reveal($('observation-count')); } };
  $('clear-observations').onclick = () => { if (item) { activity().observations = []; update(); } };
  $('experiment-explanation').oninput = () => { if (item) activity().explanation = $('experiment-explanation').value; };
  $('experiment-respond').onclick = () => { app.hud.open('challenge', $('open-challenge')); app.learning.showStep('quiz'); };
  return { render, start, stop, updateFrame, setDistance };
}
