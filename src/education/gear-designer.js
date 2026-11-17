import * as THREE from 'three';
import { applyGearColors } from './gear-colors.js';
import { $ } from '../ui/dom.js';
import { DEFAULT_GEAR_DESIGN, validateGearDesign, gearDimensions } from './gear-design.js';

export function createGearDesigner(app) {
  let busy = false;
  const fieldIds = ['teeth-1', 'teeth-2', 'module', 'width', 'bore'];
  function read() {
    const number = (id) => $('gear-' + id).value.trim() === '' ? NaN : Number($('gear-' + id).value);
    return validateGearDesign({ version: 1, teeth: [number('teeth-1'), number('teeth-2')], module: number('module'), width: number('width'), bore: number('bore') });
  }
  function preview() {
    try {
      const d = read(), distance = d.module * (d.teeth[0] + d.teeth[1]) / 2;
      $('gear-draft-reading').textContent = 'Relación ' + (d.teeth[1] / d.teeth[0]).toFixed(2) + ':1 · Entre ejes: ' + distance.toFixed(2) + ' mm · Diámetros exteriores: ' + d.teeth.map((z) => (2 * gearDimensions(z, d.module).tip).toFixed(1)).join(' / ') + ' mm';
    } catch { $('gear-draft-reading').textContent = 'Completa los valores para calcular las dimensiones del par.'; }
    app.pagination.refresh($('gear-designer'));
  }
  function report(error) {
    $('gear-design-error').textContent = error.message; $('gear-design-error').hidden = false;
    app.pagination.refresh($('gear-designer')); app.pagination.reveal($('gear-design-error'));
    if (fieldIds.includes(error.field)) {
      const field = $('gear-' + error.field); field.setAttribute('aria-invalid', 'true'); field.focus({ preventScroll: true });
    }
  }
  function populate() {
    const item = app.state.chosen;
    if (item?.definition.id !== 'engranajes-rectos' || busy) return;
    const d = item.mechanism.design || DEFAULT_GEAR_DESIGN;
    [d.teeth[0], d.teeth[1], d.module, d.width, d.bore].forEach((value, index) => {
      const input = $('gear-' + fieldIds[index]); input.value = value; input.removeAttribute('aria-invalid');
    });
    $('gear-design-error').hidden = true; $('gear-use-original').hidden = !item.mechanism.design;
    preview();
  }
  function open() {
    if (app.state.chosen?.definition.id !== 'engranajes-rectos' || busy) return;
    populate(); app.hud.open('gear-designer', $('gear-design-open'));
  }
  async function replace(design, showWorkshop = true) {
    const item = app.state.chosen, state = app.state;
    if (busy || state.pendingLoads || state.projectLoading || state.catalogLoading || item?.definition.id !== 'engranajes-rectos') throw new Error('Selecciona los engranajes rectos y espera a que termine la carga actual.');
    const generation = state.sceneGeneration;
    let prepared = null;
    busy = true; state.pendingLoads++;
    const inputs = [...$('gear-designer').querySelectorAll('input, button')]; inputs.forEach((input) => { input.disabled = true; });
    app.interface.setLoading(design ? 'Generando los dientes…' : 'Recuperando el modelo original…');
    try {
      // Prepare completely before releasing the model the learner is using.
      prepared = await app.models.loadModel(item.definition.id, generation, false, true, design);
      const index = state.entries.indexOf(item);
      if (!prepared || generation !== state.sceneGeneration || index < 0) throw new Error('La escena cambió durante la preparación. Vuelve a intentarlo.');
      prepared.name = item.name;
      app.editor.rename(prepared, item.name, false);
      prepared.color = item.color;
      if (item.mechanism.state.colors) prepared.mechanism.state.colors = [...item.mechanism.state.colors];
      const tint = new THREE.Color(item.color);
      prepared.materialColors.forEach((original, material) => material.color.copy(original).multiply(tint));
      applyGearColors(prepared);
      prepared.size = item.size; prepared.height = item.height; prepared.rot = item.rot.slice();
      prepared.anchor.position.copy(item.anchor.position); prepared.initialPosition.copy(item.initialPosition);
      prepared.mechanism.state.rpm = item.mechanism.state.rpm; prepared.mechanism.state.direction = item.mechanism.state.direction;
      prepared.anchor.visible = item.anchor.visible; app.editor.applyTransform(prepared);
      const selected = state.chosen === item;
      app.interactions.cancelGesture();
      if (state.isolatedItem === item) state.isolatedItem = prepared;
      if (selected) app.interface.select(null);
      state.entries[index] = prepared; app.engine.scene.add(prepared.anchor);
      app.models.disposeItem(item); app.interface.rebuild();
      if (selected) app.interface.select(prepared);
      prepared = null;
      $('gear-design-error').hidden = true;
      if (showWorkshop && !app.gearCenter?.active) {
        app.hud.close(false); app.gears.open();
        if (app.hud.isBlocking()) app.hud.close(false);
      }
      app.loop.renderFrame();
    } catch (error) { if (prepared) app.models.disposeItem(prepared); throw error; }
    finally {
      busy = false; state.pendingLoads--; inputs.forEach((input) => { input.disabled = false; });
      app.interface.setLoading('');
      if (app.gearCenter?.active) populate();
    }
  }
  $('gear-design-open').onclick = open;
  $('gear-design-form').onsubmit = async (event) => {
    event.preventDefault(); if (busy) return;
    try { await replace(read()); } catch (error) { report(error); }
  };
  $('gear-use-original').onclick = async () => { if (busy) return; try { await replace(undefined); } catch (error) { report(error); } };
  $('gear-design-back').onclick = () => app.gears.open();
  fieldIds.forEach((id) => $('gear-' + id).addEventListener('input', () => {
    $('gear-' + id).removeAttribute('aria-invalid'); $('gear-design-error').hidden = true; preview();
  }));
  return { open, populate, replace, get busy() { return busy; } };
}
