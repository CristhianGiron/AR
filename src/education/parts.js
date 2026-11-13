import * as THREE from 'three';
import { $ } from '../ui/dom.js';

export function createParts(app) {
  let definitions = {}, item = null, active = false, markers = [];
  const layer = $('part-markers'), ray = new THREE.Raycaster();
  function partsFor(target) {
    return (definitions[target?.definition.id] || []).map((part) => {
      const match = [...target.partBounds].find(([name]) => name.startsWith(THREE.PropertyBinding.sanitizeNodeName(part.nodo)));
      return match ? { ...part, box: match[1] } : null;
    }).filter(Boolean);
  }
  function showPart(part) {
    if (!item.partsVisited) item.partsVisited = [];
    if (!item.partsVisited.includes(part.id)) item.partsVisited.push(part.id);
    $('part-title').textContent = part.nombre; $('part-description').textContent = part.descripcion;
    $('parts-progress').textContent = item.partsVisited.length + ' de ' + partsFor(item).length + ' partes visitadas';
    $('parts-list').querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.part === part.id)));
    markers.forEach((marker) => marker.button.setAttribute('aria-pressed', String(marker.part.id === part.id)));
    app.pagination?.refresh($('parts')); app.pagination?.reveal($('part-title'));
  }
  function stop() { active = false; layer.hidden = true; layer.replaceChildren(); markers = []; $('parts-stop').hidden = true; }
  function start() {
    if (!item) return;
    app.learning.ensureFocused();
    app.experiment?.stop(); stop(); active = true; layer.hidden = false; $('parts-stop').hidden = false; $('notice').hidden = true;
    markers = partsFor(item).map((part, i) => {
      const button = document.createElement('button'); button.className = 'part-marker'; button.textContent = i + 1;
      button.setAttribute('aria-label', 'Explorar ' + part.nombre); button.setAttribute('aria-pressed', 'false');
      button.onclick = () => { if (app.state.hudSurface !== 'parts') app.hud.open('parts', $('open-parts')); showPart(part); };
      layer.append(button); return { part, button };
    });
    updateFrame();
  }
  function render(target) {
    const parts = partsFor(target); $('open-parts').hidden = !parts.length;
    if (!parts.length && app.state.hudSurface === 'parts') app.hud.close(false);
    if (item === target) return;
    stop(); item = target;
    $('parts-list').replaceChildren();
    parts.forEach((part, i) => {
      const button = document.createElement('button'); button.className = 'study-button'; button.textContent = (i + 1) + '. ' + part.nombre;
      button.dataset.part = part.id; button.setAttribute('aria-pressed', 'false'); button.onclick = () => showPart(part); $('parts-list').append(button);
    });
    if (parts.length) showPartPreview(parts[0]);
  }
  function showPartPreview(part) {
    $('part-title').textContent = part.nombre; $('part-description').textContent = part.descripcion;
    $('parts-progress').textContent = (item.partsVisited?.length || 0) + ' de ' + partsFor(item).length + ' partes visitadas';
  }
  function updateFrame() {
    if (!active) return;
    if (app.state.chosen !== item || !app.state.entries.includes(item)) { stop(); return; }
    const camera = app.engine.camera, rect = app.engine.canvas.getBoundingClientRect();
    for (const { part, button } of markers) {
      const center = item.mesh.localToWorld(part.box.getCenter(new THREE.Vector3()));
      const position = center.clone().project(camera);
      ray.set(camera.position, center.clone().sub(camera.position).normalize());
      const hits = ray.intersectObjects(app.state.entries.filter((e) => e.anchor.visible).map((e) => e.mesh), true);
      const tolerance = part.box.getSize(new THREE.Vector3()).length() * item.size * .55 + .03;
      const occluded = hits.length && hits[0].distance < camera.position.distanceTo(center) - tolerance;
      button.hidden = !!occluded || !item.anchor.visible || position.z < -1 || position.z > 1 || Math.abs(position.x) > .94 || Math.abs(position.y) > .94 || app.hud.isBlocking();
      button.style.left = rect.left + (position.x + 1) * rect.width / 2 + 'px';
      button.style.top = rect.top + (1 - position.y) * rect.height / 2 + 'px';
    }
  }
  async function load() {
    try {
      const response = await fetch(new URL('./contenido/partes.json', document.baseURI));
      if (!response.ok) throw new Error('No se pudieron cargar las partes.');
      const data = await response.json(); definitions = data.modelos || {};
      render(app.state.chosen);
    } catch { $('open-parts').hidden = true; }
  }
  $('parts-explore').onclick = () => { start(); app.hud.close(false); updateFrame(); $('parts-stop').focus({ preventScroll: true }); };
  $('parts-stop').onclick = () => { stop(); $('object-inspect').focus({ preventScroll: true }); };
  return { render, load, start, stop, updateFrame, partsFor };
}
