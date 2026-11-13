import { Color } from 'three';
import { $ } from './dom.js';
import { createProjectStore } from '../storage/project-store.js';
import { validateProject, encodeBuffer, decodeBuffer, MAX_PROJECT_BYTES } from '../storage/project-format.js';

export function createProjects(app) {
  const state = app.state, store = createProjectStore();
  let currentId = null, busy = false, run = 0, deleted = null;
  const catalogIds = () => new Set(state.catalog.map((definition) => definition.id));
  function message(text, error = false) {
    $('project-message').textContent = text; $('project-message').setAttribute('role', error ? 'alert' : 'status');
    app.pagination.refresh($('projects')); app.pagination.reveal($('project-message'));
  }
  function available() {
    if (!state.startupReady || busy || state.catalogLoading || state.pendingLoads) throw new Error('Espera a que termine la carga actual antes de guardar o abrir otra escena.');
  }
  function capture() {
    available();
    const assets = [], byBuffer = new Map();
    const entries = state.entries.map((item) => {
      let source;
      if (item.localBuffer) {
        let id = byBuffer.get(item.localBuffer);
        if (!id) { id = 'asset-' + (assets.length + 1); byBuffer.set(item.localBuffer, id); assets.push({ id, glb: encodeBuffer(item.localBuffer), definition: item.definition }); }
        source = { asset: id };
      } else source = { catalog: item.definition.id };
      return { source, name: item.name, color: item.color, position: item.anchor.position.toArray(), homePosition: item.initialPosition.toArray(), rotation: item.rot.slice(), size: item.size, height: item.height,
        activity: item.activity, echoActivity: item.echoActivity, partsVisited: item.partsVisited || [] };
    });
    const learning = app.learning.snapshot();
    const document = validateProject({ journey: app.missions.snapshot(), format: 'explorar-project', version: 1, name: $('project-name').value.trim() || 'Mi exploración', assets, entries, view: { ...state.viewState },
      selected: state.chosen ? state.entries.indexOf(state.chosen) : null, isolated: state.isolatedItem ? state.entries.indexOf(state.isolatedItem) : null, returnView: learning.returnView, answers: learning.answers }, catalogIds());
    if (JSON.stringify(document).length > MAX_PROJECT_BYTES) throw new Error('La escena es demasiado grande. Reduce los modelos locales antes de guardarla.');
    return document;
  }
  async function restore(input) {
    available();
    const document = validateProject(input, catalogIds()), generation = state.sceneGeneration, operation = ++run;
    // Decode and inspect every embedded model before touching the current scene.
    const buffers = new Map();
    for (const asset of document.assets) { const buffer = decodeBuffer(asset.glb); app.assets.validateLocalGLB(buffer); buffers.set(asset.id, buffer); }
    busy = true; state.projectLoading = true;
    const prepared = []; let completed = false; $('project-progress').showModal();
    const check = () => { if (operation !== run || generation !== state.sceneGeneration) throw new Error('Se canceló la apertura. La escena anterior se conserva.'); };
    try {
      for (const entry of document.entries) {
        check(); let item;
        if (entry.source.catalog) item = await app.models.loadModel(entry.source.catalog, generation, false, true);
        else {
          const asset = document.assets.find((value) => value.id === entry.source.asset), buffer = buffers.get(asset.id);
          const gltf = await app.models.loader.parseAsync(buffer, '');
          try { check(); } catch (error) { app.assets.disposeResources(gltf.scene); throw error; }
          item = app.models.insertModel(gltf, asset.definition, generation, false, true);
          if (item) item.localBuffer = buffer;
        }
        if (!item) throw new Error('La escena cambió durante la apertura. Inténtalo de nuevo.');
        prepared.push(item); check();
        app.editor.rename(item, entry.name, false); item.color = entry.color;
        const tint = new Color(entry.color);
        item.materialColors.forEach((original, material) => material.color.copy(original).multiply(tint));
        item.anchor.position.fromArray(entry.position); item.initialPosition.fromArray(entry.homePosition);
        item.rot = entry.rotation; item.size = entry.size; item.height = entry.height;
        item.activity = entry.activity; item.echoActivity = entry.echoActivity; item.partsVisited = entry.partsVisited;
        app.editor.applyTransform(item);
      }
      check();
      app.interactions.cancelGesture(); app.parts?.stop(); app.experiment?.stop();
      app.learning.showAll(); app.history.clear(); app.interface.select(null);
      state.entries.forEach(app.models.disposeItem); state.entries.length = 0;
      for (const item of prepared) { state.entries.push(item); app.engine.scene.add(item.anchor); }
      state.sceneGeneration++;
      Object.assign(state.viewState, document.view);
      app.learning.restoreSnapshot(document);
      app.interface.rebuild(); app.interface.select(document.selected === null ? null : state.entries[document.selected]);
      app.missions.restore(document.journey);
      $('project-name').value = document.name;
      app.hud.close(false); app.interface.notify('Escena abierta: ' + document.name); app.loop.renderFrame(); completed = true;
    } catch (error) {
      prepared.forEach((item) => { if (!state.entries.includes(item)) app.models.disposeItem(item); });
      throw error;
    } finally {
      busy = false; state.projectLoading = false; if ($('project-progress').open) $('project-progress').close();
      if (completed) $(state.chosen ? 'object-inspect' : 'workspace-toggle').focus({ preventScroll: true });
    }
    return document;
  }
  async function refreshList() {
    const list = $('saved-projects'); list.replaceChildren();
    const loading = document.createElement('p'); loading.textContent = 'Buscando tus escenas…'; list.append(loading);
    try {
      const records = (await store.list()).sort((a, b) => b.updatedAt - a.updatedAt); list.replaceChildren();
      if (!records.length) { const text = document.createElement('p'); text.textContent = 'Todavía no hay escenas guardadas en este navegador.'; list.append(text); }
      for (const record of records) {
        const row = document.createElement('div'); row.className = 'saved-project';
        const open = document.createElement('button'); open.type = 'button'; open.className = 'study-button';
        open.textContent = record.name + ' · ' + record.count + ' componentes';
        open.onclick = async () => {
          try { const stored = await store.get(record.id); if (!stored) throw new Error('Esta escena ya no está guardada. Actualiza el listado.'); await restore(stored.document); currentId = record.id; } catch (error) { message(error.message, true); }
        };
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'round-button'; remove.setAttribute('aria-label', 'Eliminar escena guardada ' + record.name); remove.textContent = '×';
        remove.onclick = async () => {
          try { available(); const stored = await store.get(record.id); await store.remove(record.id); deleted = stored; if (currentId === record.id) currentId = null; $('undo-project-delete').hidden = false; await refreshList(); message('Escena quitada del navegador. Puedes deshacerlo.'); }
          catch (error) { message('No se pudo eliminar la escena. ' + error.message, true); }
        };
        row.append(open, remove); list.append(row);
      }
    } catch { list.replaceChildren(); message('No se pudo acceder al guardado de este navegador. Puedes exportar la escena a un archivo.', true); }
    app.pagination.refresh($('projects'));
  }
  async function save(copy = false) {
    try {
      const document = capture(), id = !copy && currentId || crypto.randomUUID();
      busy = true;
      try { await store.put({ id, updatedAt: Date.now(), document }); currentId = id; } finally { busy = false; }
      await refreshList(); message('Escena guardada en este navegador: ' + document.name);
    } catch (error) {
      const reason = error.name === 'QuotaExceededError' ? 'No queda espacio en este navegador.' : error.name === 'SecurityError' ? 'El navegador no permite guardar aquí.' : error.message;
      message('No se pudo guardar. ' + reason + ' Puedes usar Exportar archivo.', true);
    }
  }
  $('save-project').onclick = () => save();
  $('copy-project').onclick = () => save(true);
  $('export-project').onclick = () => {
    try {
      const document = capture(), blob = new Blob([JSON.stringify(document)], { type: 'application/json' });
      if (blob.size > MAX_PROJECT_BYTES) throw new Error('La escena supera 128 MB. Reduce los modelos locales.');
      const url = URL.createObjectURL(blob), link = window.document.createElement('a');
      link.href = url; link.download = (document.name.replace(/[^a-z\dáéíóúñ -]/gi, '').slice(0, 50) || 'mi-escena') + '.explorar.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000); message('Archivo exportado. Incluye tus modelos locales y observaciones.');
    } catch (error) { message(error.message, true); }
  };
  $('import-project').onchange = async () => {
    const file = $('import-project').files[0]; if (!file) return;
    try {
      if (file.size > MAX_PROJECT_BYTES) throw new Error('El archivo supera 128 MB.');
      let data; try { data = JSON.parse(await file.text()); } catch { throw new Error('No se pudo leer la escena. Elige un archivo .explorar.json válido.'); }
      await restore(data); currentId = null;
    } catch (error) { message(error.message, true); }
    finally { $('import-project').value = ''; }
  };
  $('undo-project-delete').onclick = async () => {
    if (!deleted) return;
    try { await store.put(deleted); deleted = null; $('undo-project-delete').hidden = true; await refreshList(); message('Escena guardada recuperada.'); }
    catch { message('No se pudo recuperar. Revisa el espacio disponible del navegador.', true); }
  };
  const cancel = () => { run++; if ($('project-progress').open) $('project-progress').close(); };
  $('cancel-project-open').onclick = cancel;
  $('project-progress').addEventListener('cancel', (event) => { event.preventDefault(); cancel(); });
  return { capture, restore, refreshList, get busy() { return busy; }, store };
}
