import * as THREE from 'three';
import { $ } from '../ui/dom.js';
import { echoResponse, describeEcho, ECHO_MIN_CM, ECHO_MAX_CM } from './echo-model.js';

export function createEchoExperiment(app) {
  let item = null, active = false, drag = null;
  const layer = $('echo-lab'), handle = $('echo-obstacle-handle');
  const group = new THREE.Group(); group.name = 'Esquema del eco'; group.visible = false;
  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(.9, .7, .08), new THREE.MeshBasicMaterial({ color: 0x8260d7, transparent: true, opacity: .38, depthWrite: false }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(obstacle.geometry), new THREE.LineBasicMaterial({ color: 0xc8f5ff })); obstacle.add(edges); group.add(obstacle);
  const rays = [0x7defff, 0xffe466].map((color) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color, dashSize: .08, gapSize: .045 })); line.computeLineDistances(); group.add(line); return line;
  });
  const dotCanvas = document.createElement('canvas'); dotCanvas.width = dotCanvas.height = 16;
  const context = dotCanvas.getContext('2d'); context.fillStyle = '#fff'; context.beginPath(); context.arc(8, 8, 7, 0, Math.PI * 2); context.fill();
  const dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), new THREE.PointsMaterial({ color: 0xffe99a, size: 7, sizeAttenuation: false, map: new THREE.CanvasTexture(dotCanvas), alphaTest: .1 }));
  group.add(dots); app.engine.scene.add(group);
  const localEmitter = new THREE.Vector3(), localReceiver = new THREE.Vector3(), target = new THREE.Vector3();
  function activity() { return item.echoActivity ||= { distanceCm: 100, present: true, observations: [], explanation: '' }; }
  function releaseDrag() { const previous = drag; drag = null; if (previous?.element.hasPointerCapture(previous.id)) previous.element.releasePointerCapture(previous.id); }
  function stop() { active = false; releaseDrag(); group.visible = false; layer.hidden = true; document.body.classList.remove('echo-active'); }
  function render(selected) {
    const targetItem = selected?.definition.id === 'sensor-ultrasonico' ? selected : null;
    if (item === targetItem) return;
    stop(); item = targetItem;
    if (item) { $('echo-explanation').value = activity().explanation; update(); }
  }
  function update() {
    if (!item) return;
    const data = activity(), result = echoResponse(data.distanceCm, data.present);
    $('echo-reading').textContent = result.present ? 'Distancia simulada: ' + result.distanceCm + ' cm' : 'Distancia no disponible';
    $('echo-scene-reading').textContent = describeEcho(data);
    $('echo-time').textContent = result.present ? 'Tiempo de ida y vuelta: ' + result.echoMs.toFixed(2).replace('.', ',') + ' ms' : 'Sin señal de regreso: no equivale a cero centímetros.';
    $('echo-present').checked = data.present;
    if (document.activeElement !== $('echo-distance')) $('echo-distance').value = data.distanceCm;
    handle.setAttribute('aria-valuenow', String(data.distanceCm)); handle.setAttribute('aria-valuetext', describeEcho(data));
    handle.disabled = !data.present; $('echo-record').disabled = data.observations.length >= 12;
    $('echo-observations').replaceChildren(...data.observations.map((sample, i) => { const row = document.createElement('li'); row.textContent = (i + 1) + '. ' + describeEcho(sample); return row; }));
    $('echo-count').textContent = data.observations.length + ' de 12 observaciones';
    $('echo-scene-present').setAttribute('aria-pressed', String(data.present));
    $('echo-scene-present').setAttribute('aria-label', data.present ? 'Quitar obstáculo virtual' : 'Colocar obstáculo virtual');
    $('echo-scene-present').textContent = data.present ? '▣' : '□';
    updateFrame(); app.pagination?.refresh($('echo-experiment'));
  }
  function setDistance(value) {
    if (!item || !Number.isFinite(value)) return;
    activity().distanceCm = Math.max(ECHO_MIN_CM, Math.min(ECHO_MAX_CM, Math.round(value))); update();
  }
  function point(distance) {
    // Authoring coordinates: transducers face +Z. The visible path is schematic.
    return new THREE.Vector3((localEmitter.x + localReceiver.x) / 2, (localEmitter.y + localReceiver.y) / 2, Math.max(localEmitter.z, localReceiver.z) + .55 + (distance - ECHO_MIN_CM) / (ECHO_MAX_CM - ECHO_MIN_CM) * 1.1);
  }
  function setAnchors() {
    const parts = app.parts.partsFor(item);
    for (const [id, point] of [['emisor', localEmitter], ['receptor', localReceiver]]) {
      const box = parts.find((part) => part.id === id)?.box;
      if (box) { box.getCenter(point); point.z = box.max.z; }
      else { item.localBounds.getCenter(point); point.z = item.localBounds.max.z; }
    }
  }
  function screen(local) {
    const world = item.mesh.localToWorld(local.clone()).project(app.engine.camera), rect = app.engine.canvas.getBoundingClientRect();
    return { x: rect.left + (world.x + 1) * rect.width / 2, y: rect.top + (1 - world.y) * rect.height / 2, z: world.z };
  }
  function updateFrame() {
    if (!active) return;
    if (item !== app.state.chosen || !app.state.entries.includes(item)) { stop(); return; }
    item.mesh.updateWorldMatrix(true, false); group.matrixAutoUpdate = false; group.matrix.copy(item.mesh.matrixWorld); group.matrixWorldNeedsUpdate = true;
    target.copy(point(activity().distanceCm)); obstacle.position.copy(target); obstacle.visible = activity().present;
    const segments = [[localEmitter, target], [target, localReceiver]];
    const write = (geometry, points) => { const positions = geometry.getAttribute('position'); points.forEach((p, i) => positions.setXYZ(i, p.x, p.y, p.z)); positions.needsUpdate = true; geometry.computeBoundingSphere(); };
    rays.forEach((line, index) => {
      line.visible = activity().present; write(line.geometry, segments[index]);
      const distances = line.geometry.getAttribute('lineDistance'); distances.setX(1, segments[index][0].distanceTo(segments[index][1])); distances.needsUpdate = true;
    });
    dots.visible = activity().present; write(dots.geometry, [localEmitter, target, localReceiver]);
    const p = screen(target); handle.hidden = !activity().present || p.z < -1 || p.z > 1 || Math.abs(p.x - innerWidth / 2) > innerWidth / 2 - 25 || p.y < 25 || p.y > innerHeight - 75;
    handle.style.left = p.x + 'px'; handle.style.top = p.y + 'px';
    const blocked = app.hud.isBlocking(); group.visible = !blocked; layer.classList.toggle('lab-blocked', blocked);
  }
  function start() {
    if (!item) return;
    app.experiment.stop(); app.parts.stop(); app.learning.ensureFocused();
    app.state.viewState.zoom = Math.max(.4, Math.min(app.state.viewState.zoom, 1.15 / Math.max(1, item.size)));
    setAnchors(); active = true; layer.hidden = false; group.visible = true; document.body.classList.add('echo-active'); $('notice').hidden = true;
    app.loop.renderFrame(); update();
  }
  function beginDrag(event, element) {
    if (event.button !== 0 || drag || !activity().present) return;
    const near = screen(point(ECHO_MIN_CM)), far = screen(point(ECHO_MAX_CM));
    let dx = far.x - near.x, dy = far.y - near.y;
    if (Math.hypot(dx, dy) < 20) { dx = 120; dy = 0; }
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: activity().distanceCm, dx, dy, element };
    element.setPointerCapture(event.pointerId); event.preventDefault();
  }
  function moveDrag(event) {
    if (drag?.id === event.pointerId) setDistance(drag.distance + ((event.clientX - drag.x) * drag.dx + (event.clientY - drag.y) * drag.dy) / (drag.dx ** 2 + drag.dy ** 2) * (ECHO_MAX_CM - ECHO_MIN_CM));
  }
  handle.addEventListener('pointerdown', (event) => beginDrag(event, handle));
  handle.addEventListener('pointermove', moveDrag);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, (event) => { if (drag?.id === event.pointerId) releaseDrag(); });
  // The whole rendered obstacle can be dragged; the HTML handle is an alternative.
  const ray = new THREE.Raycaster(), canvas = app.engine.canvas;
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !active || !activity().present || app.hud.isBlocking()) return;
    if (drag) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), app.engine.camera);
    obstacle.updateWorldMatrix(true, false);
    const hit = ray.intersectObject(obstacle, false)[0];
    const other = ray.intersectObjects(app.state.entries.filter((entry) => entry.anchor.visible).map((entry) => entry.mesh), true)[0];
    if (!hit || other && other.distance < hit.distance) return;
    beginDrag(event, canvas); event.stopImmediatePropagation();
  }, true);
  canvas.addEventListener('pointermove', (event) => { if (drag?.element === canvas) { moveDrag(event); event.stopImmediatePropagation(); } }, true);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, (event) => { if (drag?.element === canvas && drag.id === event.pointerId) { releaseDrag(); event.stopImmediatePropagation(); } }, true);
  handle.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); setDistance(event.key === 'Home' ? ECHO_MIN_CM : event.key === 'End' ? ECHO_MAX_CM : activity().distanceCm + (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -10 : 10));
  });
  for (const id of ['echo-nearer', 'echo-scene-nearer']) $(id).onclick = () => setDistance(activity().distanceCm - 20);
  for (const id of ['echo-farther', 'echo-scene-farther']) $(id).onclick = () => setDistance(activity().distanceCm + 20);
  $('echo-distance').onchange = () => { if ($('echo-distance').checkValidity()) setDistance($('echo-distance').valueAsNumber); };
  $('echo-present').onchange = () => { if (item) { activity().present = $('echo-present').checked; update(); } };
  $('echo-scene-present').onclick = () => { activity().present = !activity().present; update(); };
  $('echo-explore').onclick = () => { start(); app.hud.close(false); updateFrame(); (activity().present && !handle.hidden ? handle : $('echo-scene-present')).focus({ preventScroll: true }); };
  $('echo-scene-details').onclick = () => { if (app.state.hudSurface !== 'echo-experiment') app.hud.open('echo-experiment', $('open-experiment')); };
  $('echo-scene-stop').onclick = () => { stop(); $('object-inspect').focus({ preventScroll: true }); };
  $('echo-record').onclick = () => { if (item && activity().observations.length < 12) { const { distanceCm, present } = activity(); activity().observations.push({ distanceCm, present }); update(); app.pagination.reveal($('echo-count')); } };
  $('echo-clear').onclick = () => { activity().observations = []; update(); };
  $('echo-explanation').oninput = () => { if (item) activity().explanation = $('echo-explanation').value; };
  $('echo-respond').onclick = () => { app.hud.open('challenge', $('open-challenge')); app.learning.showStep('quiz'); };
  $('echo-save').onclick = () => { app.hud.open('projects'); app.projects.refreshList(); };
  addEventListener('pagehide', stop);
  return { render, start, stop, updateFrame, setDistance, get group() { return group; } };
}
