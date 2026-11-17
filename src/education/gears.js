import * as THREE from 'three';
import { $ } from '../ui/dom.js';
import { GEAR_SYSTEMS, gearRPM, rotationAngles, validateGearState } from './gear-model.js';
import { parametricSystem, DEFAULT_GEAR_DESIGN, validateGearDesign } from './gear-design.js';
import { preparePartColors, applyGearColors } from './gear-colors.js';
import { uiIcon } from '../ui/icons.js';

export function createGears(app) {
  let target = null, lastTime = null, stateSwitch = false;
  const initial = (count = 2) => ({ angle: 0, rpm: 12, direction: 1, separation: 0, offsets: Array(count).fill(0), isolated: null, running: false });
  function prepare(gltf, definition) {
    const design = gltf.gearDesign;
    const system = design ? parametricSystem(design) : GEAR_SYSTEMS[definition.mecanismo?.tipo];
    if (!system) return null;
    const sourceMaterials = new Set();
    gltf.scene.traverse(node => { for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) sourceMaterials.add(material); });
    const parts = system.nodes.map((name, index) => {
      const node = gltf.scene.getObjectByName(name);
      if (!node) throw new Error('Falta la pieza ' + name + ' del mecanismo.');
      const pivot = new THREE.Group(), home = new THREE.Vector3(...system.centers[index]);
      pivot.name = 'Eje ' + (index + 1); pivot.position.copy(home);
      node.parent.add(pivot); pivot.add(node); node.position.sub(home);
      return { pivot, home, originalColors: preparePartColors(node), axis: new THREE.Vector3(...system.axes[index]), direction: new THREE.Vector3(...system.separation[index]) };
    });
    const used = new Set();
    gltf.scene.traverse(node => { for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) used.add(material); });
    for (const material of sourceMaterials) if (!used.has(material)) material.dispose();
    const mechanism = { system, parts, design, state: initial(parts.length) }; apply(mechanism); return mechanism;
  }
  function apply(mechanism) {
    const { system, parts, state } = mechanism, angles = rotationAngles(system, state.angle, state.offsets);
    parts.forEach((part, index) => {
      part.pivot.position.copy(part.home).addScaledVector(part.direction, state.separation * system.travel);
      part.pivot.quaternion.setFromAxisAngle(part.axis, angles[index]);
      part.pivot.visible = state.isolated === null || state.isolated === index;
    });
  }
  function current() { return app.state.chosen?.mechanism ? app.state.chosen : null; }
  function syncQuickButtons() {
    document.querySelectorAll('[data-gear-select]').forEach((button) => {
      const id = button.dataset.gearSelect;
      const pressed = String(current()?.definition.id === id);
      const disabled = !!stateSwitch || app.state.pendingLoads > 0 || app.state.catalogLoading || app.state.projectLoading || !app.state.catalog.some((model) => model.id === id && GEAR_SYSTEMS[model.mecanismo?.tipo]);
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
      if (button.disabled !== disabled) button.disabled = disabled;
    });
  }
  function sync() {
    app.gearInline?.sync();
    const item = current(), mechanism = item?.mechanism;
    const select = $('gear-system'), definitions = app.state.catalog.filter((model) => GEAR_SYSTEMS[model.mecanismo?.tipo]);
    if (select.dataset.ids !== definitions.map((model) => model.id).join(',')) {
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Elige un mecanismo';
      select.replaceChildren(placeholder, ...definitions.map((model) => { const option = document.createElement('option'); option.value = model.id; option.textContent = model.nombre; return option; }));
      select.dataset.ids = definitions.map((model) => model.id).join(',');
    }
    select.value = item?.definition.id || '';
    syncQuickButtons();
    $('gear-model-switcher').hidden = !definitions.length;
    $('gear-empty').hidden = !!mechanism; $('gear-controls').hidden = !mechanism;
    $('gear-transport').hidden = !mechanism;
    $('gear-design-open').hidden = item?.definition.id !== 'engranajes-rectos';
    if (!mechanism) return;
    const state = mechanism.state, teeth = mechanism.system.teeth;
    const piece = $('gear-piece'), names = mechanism.system.labels || ['Piñón de entrada', 'Rueda de salida'];
    if (piece.dataset.names !== names.join('|')) {
      piece.replaceChildren(...names.map((name, index) => { const option = document.createElement('option'); option.value = index; option.textContent = name; return option; }));
      piece.dataset.names = names.join('|');
    }

    $('gear-title').textContent = item.name;
    $('gear-design-mode').textContent = mechanism.design ? 'Diseño paramétrico · ' + teeth.join(' / ') + ' dientes' : 'Modelo OBJ original · dientes fijos';
    $('gear-description').textContent = mechanism.system.description;
    $('gear-play').textContent = state.running ? 'Pausar' : 'Poner en marcha';
    $('gear-play').setAttribute('aria-pressed', String(state.running));
    $('gear-play').disabled = state.separation > 0 || state.isolated !== null;
    const toggleLabel = state.running ? 'Pausar' : 'Iniciar';
    if ($('gear-toggle').getAttribute('aria-label') !== toggleLabel) {
      $('gear-toggle').innerHTML = uiIcon(state.running ? 'pause' : 'play') + '<span class="sr-only">' + toggleLabel + '</span>';
      $('gear-toggle').setAttribute('aria-label', toggleLabel);
    }
    $('gear-toggle').setAttribute('aria-pressed', String(state.running));
    $('gear-toggle').disabled = $('gear-play').disabled;
    $('gear-separate-quick').textContent = state.separation > 0 || state.isolated !== null ? 'Montar' : 'Separar';
    $('gear-speed').value = state.rpm; $('gear-speed-value').textContent = state.rpm + ' rpm';
    $('gear-separation').value = Math.round(state.separation * 100);
    $('gear-separation-value').textContent = Math.round(state.separation * 100) + ' %';
    $('gear-reverse').setAttribute('aria-pressed', String(state.direction === -1));
    $('gear-isolate').setAttribute('aria-pressed', String(state.isolated !== null));
    $('gear-isolate').textContent = state.isolated === null ? 'Ver solo esta pieza' : mechanism.parts.length > 2 ? 'Ver todas las piezas' : 'Ver las dos piezas';
    $('gear-reading').textContent = 'Entrada: ' + state.rpm + ' rpm · Salida: ' + gearRPM(mechanism.system, state.rpm).toFixed(1) + ' rpm · ' + (mechanism.system.stages ? mechanism.system.stages.length + ' etapas · ' + mechanism.system.stages.map(stage => stage.teeth.join('→')).join(' / ') + ' dientes' : teeth[0] + ':' + teeth[1] + ' dientes');
    $('gear-status').textContent = state.separation > 0 ? 'Piezas separadas: el motor está desconectado. Usa Girar un paso para examinar la pieza elegida.' : state.isolated !== null ? 'Pieza aislada. Muestra las dos o vuelve a montar para conectar el motor.' : state.running ? 'Mecanismo en marcha. Las ruedas giran alrededor de sus propios ejes.' : 'Mecanismo montado. Listo para girar.';
    app.pagination?.refresh($('gears'));
    app.gearClass?.render();
  }
  function render(item) {
    if (target !== item) { if (target?.mechanism) target.mechanism.state.running = false; target = item; }
    sync();
  }
  function mutate(action) {
    const item = current(); if (!item) return;
    $('notice').hidden = true;
    action(item.mechanism.state, item.mechanism); apply(item.mechanism);
    app.selection.buildGlow(item); sync(); app.loop.renderFrame();
  }
  function reset(item = current()) {
    if (!item?.mechanism) return;
    const colors = item.mechanism.state.colors;
    Object.assign(item.mechanism.state, initial(item.mechanism.parts.length));
    if (colors) item.mechanism.state.colors = colors;
    apply(item.mechanism); sync();
  }
  function updateFrame(now = performance.now()) {
    syncQuickButtons();
    const delta = lastTime === null ? 0 : Math.min(.1, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
    for (const item of app.state.entries) {
      const mechanism = item.mechanism; if (!mechanism) continue;
      if (mechanism.state.running && item.anchor.visible && mechanism.state.separation === 0 && mechanism.state.isolated === null) {
        // A continuous phase avoids a discontinuity in the driven wheel at 2π.
        mechanism.state.angle += delta * mechanism.state.rpm * Math.PI / 30 * mechanism.state.direction;
        apply(mechanism);
        if (item === app.state.chosen) app.selection.buildGlow(item);
      }
    }
  }
  function suspend() { lastTime = null; }
  function snapshot(item) { return item.mechanism ? validateGearState({ ...item.mechanism.state, design: item.mechanism.design }) : undefined; }
  function restore(item, value) { if (item.mechanism && value) { const validated = validateGearState(value); if (validated.offsets.length !== item.mechanism.parts.length) throw new Error('El estado no corresponde a las piezas de este mecanismo.'); delete item.mechanism.state.colors; Object.assign(item.mechanism.state, validated, { running: false }); apply(item.mechanism); applyGearColors(item); } }
  function open(trigger = $('open-gears')) {
    if (!current()) {
      const item = app.state.entries.find((entry) => entry.mechanism);
      if (item) app.interface.select(item);
    }
    sync(); if (app.state.hudSurface !== 'gears') app.hud.open('gears', trigger);
  }
  function preview() { if (app.state.hudSurface === 'gears' && app.hud.isBlocking()) app.hud.close(false); }
  function toggleMotor() {
    mutate((state) => { if (!state.separation && state.isolated === null) { state.running = !state.running; suspend(); } });
    if (current()?.mechanism.state.running) preview();
  }
  function step() {
    mutate((state) => {
      state.running = false;
      if (state.separation || state.isolated !== null) state.offsets[Number($('gear-piece').value)] += state.direction * Math.PI / 12;
      else state.angle += state.direction * Math.PI / 12;
    });
    preview();
  }
  function assemble(state) { Object.assign(state, initial(state.offsets.length), { rpm: state.rpm, direction: state.direction }); }
  async function selectModel(id) {
    const state = app.state;
    if (stateSwitch || state.pendingLoads || state.catalogLoading || state.projectLoading) return null;
    if (!state.catalog.some((model) => model.id === id && GEAR_SYSTEMS[model.mecanismo?.tipo])) throw new Error('El mecanismo no está disponible.');
    if (current()?.definition.id === id) return current();
    const generation = state.sceneGeneration;
    let prepared = null;
    stateSwitch = true; state.pendingLoads++; sync();
    app.interface.setLoading('Preparando el mecanismo…');
    try {
      let item = state.entries.find((entry) => entry.definition.id === id);
      if (!item) {
        prepared = await app.models.loadModel(id, generation, false, true);
        if (!prepared || generation !== state.sceneGeneration) throw new Error('La escena cambió durante la carga. Vuelve a elegir el modelo.');
        item = prepared;
      }
      if (generation !== state.sceneGeneration || (!prepared && !state.entries.includes(item))) throw new Error('La escena cambió durante la carga.');
      // Commit after preparation: a failed download keeps the current model and its controls.
      if (prepared) { state.entries.push(item); app.engine.scene.add(item.anchor); prepared = null; app.interface.rebuild(); }
      app.learning.showAll(); app.interface.select(item); app.learning.ensureFocused(); state.viewState.zoom = 1;
      $('notice').hidden = true;
      app.loop.renderFrame();
      return item;
    } finally {
      if (prepared) app.models.disposeItem(prepared);
      stateSwitch = false; state.pendingLoads--; sync(); app.interface.setLoading('');
    }
  }
  document.querySelectorAll('[data-gear-select]').forEach((button) => {
    button.onclick = async () => {
      try { await selectModel(button.dataset.gearSelect); }
      catch (error) { app.interface.notify('No se pudo cambiar el modelo. ' + error.message); }
    };
  });
  $('gear-quick').setAttribute('aria-controls', 'gear-inline');
  $('gear-step-quick').innerHTML = uiIcon('step') + '<span class="sr-only">Paso</span>';
  $('gear-quick').innerHTML = uiIcon('settings') + '<span class="sr-only">Ajustar</span>';
  $('gear-quick').setAttribute('aria-expanded', 'false');
  $('gear-quick').onclick = () => document.body.classList.contains('classroom-mode') ? app.gearInline.open() : open();
  $('gear-system').onchange = async () => {
    const id = $('gear-system').value;
    if (!id) return;
    $('gear-system').disabled = true;
    try {
      const item = await selectModel(id);
      if (!item) return;
      if (app.state.hudSurface !== 'gears') app.hud.open('gears', $('open-gears')); sync();
    } catch (error) { app.interface.notify('No se pudo abrir el mecanismo. ' + error.message); sync(); }
    finally { $('gear-system').disabled = false; sync(); }
  };
  $('gear-play').onclick = $('gear-toggle').onclick = toggleMotor;
  $('gear-step').onclick = $('gear-step-quick').onclick = step;
  $('gear-reverse').onclick = () => mutate((state) => { state.direction *= -1; });
  $('gear-speed').oninput = () => mutate((state) => { state.rpm = Number($('gear-speed').value); });
  $('gear-separation').oninput = () => mutate((state) => { state.separation = Number($('gear-separation').value) / 100; state.running = false; });
  $('gear-explode').onclick = () => { mutate((state) => { state.separation = 1; state.running = false; state.isolated = null; }); preview(); };
  $('gear-assemble').onclick = () => { mutate(assemble); preview(); };
  $('gear-separate-quick').onclick = () => mutate((state) => { if (state.separation || state.isolated !== null) assemble(state); else { state.separation = 1; state.running = false; } });
  $('gear-reset').onclick = () => mutate(() => reset());
  $('gear-isolate').onclick = () => mutate((state) => { state.running = false; state.isolated = state.isolated === null ? Number($('gear-piece').value) : null; });
  $('gear-piece').onchange = () => mutate((state) => { if (state.isolated !== null) state.isolated = Number($('gear-piece').value); });
  document.addEventListener('visibilitychange', suspend);
  return { prepare, render, updateFrame, reset, snapshot, restore, open, suspend, selectModel };
}
