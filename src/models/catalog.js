import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { $ } from "../ui/dom.js";

export function createModels(app) {
  const state = app.state;
  const catalogMap = new Map();

  const loader = new GLTFLoader();

  function availablePosition() {
    for (let slot = 0; ; slot++) {
      const column = [0, 1, -1][slot % 3], row = Math.floor(slot / 3);
      const position = new THREE.Vector3(column * 2.1, 0, -row * 2.1);
      if (!state.entries.some((item) => item.anchor.position.distanceTo(position) < 1.5)) return position;
    }
  }

  async function loadModel(id, generation = state.sceneGeneration, selectNew = true, staged = false) {
    const definition = catalogMap.get(id);
    if (!definition) throw new Error("El modelo no existe en el catálogo.");
    const gltf = await loader.loadAsync(definition.url);
    return insertModel(gltf, definition, generation, selectNew, staged);
  }

  function insertModel(gltf, definition, generation = state.sceneGeneration, selectNew = true, staged = false) {
    if (generation !== state.sceneGeneration) { app.assets.disposeResources(gltf.scene); return null; }
    // Preserve educational anchors before static mesh batching loses node names.
    const partBounds = new Map();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((node) => { if (node.isMesh) partBounds.set(node.name, new THREE.Box3().setFromObject(node)); });
    const content = app.assets.optimizeStaticModel(gltf);
    content.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(content);
    const dimensions = bounds.getSize(new THREE.Vector3());
    const largest = Math.max(dimensions.x, dimensions.y, dimensions.z);
    if (bounds.isEmpty() || !Number.isFinite(largest) || largest <= 0) { app.assets.disposeResources(content); throw new Error("El archivo no contiene una geometría visible."); }
    const centered = new THREE.Group(); centered.add(content);
    centered.position.copy(bounds.getCenter(new THREE.Vector3())).negate();
    const fitted = new THREE.Group(); fitted.add(centered);
    fitted.scale.setScalar(definition.visualizacion.tamano / largest);
    const mesh = new THREE.Group(); mesh.add(fitted);
    const localBounds = new THREE.Box3().setFromObject(fitted);
    for (const box of partBounds.values()) box.translate(centered.position).applyMatrix4(new THREE.Matrix4().makeScale(fitted.scale.x, fitted.scale.y, fitted.scale.z));
    const rotation = definition.visualizacion.rotacion.slice();
    mesh.rotation.set(...rotation.map(THREE.MathUtils.degToRad), "XYZ");
    mesh.updateMatrixWorld(true);
    mesh.position.y = -new THREE.Box3().setFromObject(mesh).min.y + 0.08;
    const anchor = new THREE.Group();
    anchor.position.copy(availablePosition()); anchor.add(mesh); if (!staged) app.engine.scene.add(anchor);
    const height = definition.visualizacion.alturaEtiqueta;
    const tag = app.annotations.labelSprite(definition.nombre); tag.position.set(0, height, 0); anchor.add(tag);
    // Keep every material's original color; a user color acts as a tint.
    const materialColors = new Map();
    mesh.traverse((node) => {
      for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
        if (material.color && !materialColors.has(material)) materialColors.set(material, material.color.clone());
      }
    });
    const item = {
      anchor, mesh, tag, localBounds, partBounds, definition, type: definition.id,
      name: definition.nombre, color: "#ffffff", materialColors,
      size: 1, height, rot: rotation, initialRot: rotation.slice(),
      initialPosition: anchor.position.clone(),
      radius: dimensions.length() / 2 * definition.visualizacion.tamano / largest,
    };
    if (!staged) { state.entries.push(item); app.interface.rebuild(); if (selectNew) app.interface.select(item); }
    return item;
  }

  async function addFromCatalog(id, trigger) {
    if (!catalogMap.has(id)) return;
    const name = catalogMap.get(id).nombre;
    const generation = state.sceneGeneration;
    if (trigger) trigger.disabled = true;
    state.pendingLoads++; app.interface.setLoading("Cargando " + name + "…");
    try {
      const item = await loadModel(id, generation);
      if (item) { app.interface.closePanels(); $("status").textContent = "Listo para explorar: " + item.name; }
    } catch (error) {
      const message = "No se pudo cargar " + name + ". " + error.message;
      $("status").textContent = message; app.interface.notify(message);
    } finally {
      if (trigger) trigger.disabled = false;
      state.pendingLoads--; if (!state.pendingLoads && !state.catalogLoading) app.interface.setLoading("");
    }
  }

  async function loadCatalogAndScene() {
    if (state.catalogLoading) return;
    state.catalogLoading = true; $("presets").disabled = true;
    app.interface.setLoading("Cargando catálogo de modelos…");
    try {
      const response = await fetch(app.assets.catalogURL, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo leer catalogo.json (HTTP " + response.status + ").");
      const definitions = app.assets.validateCatalog(await response.json());
      app.interactions.cancelGesture(); app.history.clear(); app.learning.showAll(); state.sceneGeneration++; app.interface.select(null);
      state.entries.forEach(disposeItem); state.entries.length = 0;
      state.catalog = definitions; catalogMap.clear(); state.catalog.forEach((model) => catalogMap.set(model.id, model));
      app.library.renderCatalog(); app.interface.rebuild();
      const defaults = state.catalog.filter((model) => model.cargarAlInicio === true);
      const failures = [];
      for (const definition of defaults) {
        app.interface.setLoading("Cargando " + definition.nombre + "…");
        try { await loadModel(definition.id, state.sceneGeneration, false); }
        catch (error) { failures.push(definition.nombre); console.warn("Error al cargar modelo:", definition.id, error); }
      }
      app.interface.select(null);
      const message = failures.length ? "No se pudieron cargar: " + failures.join(", ") + ". Puedes reintentar desde Explorar modelos."
        : state.entries.length ? "Modelos listos. Toca un modelo para explorarlo." : "Catálogo listo. Elige un modelo para añadirlo a la escena.";
      $("status").textContent = message; if (failures.length) app.interface.notify(message);
    } catch (error) {
      const message = "No se pudo cargar el catálogo. " + error.message;
      $("status").textContent = message; app.interface.notify(message);
      if (!state.catalog.length) {
        const container = $("library-grid"); container.replaceChildren();
        const text = document.createElement("p"); text.className = "catalog-message"; text.textContent = message;
        const retry = document.createElement("button"); retry.className = "retry-catalog catalog-message"; retry.textContent = "Reintentar carga"; retry.onclick = loadCatalogAndScene;
        container.append(text, retry);
      }
    } finally {
      state.catalogLoading = false; $("presets").disabled = false; if (!state.pendingLoads) app.interface.setLoading("");
    }
  }

  function disposeItem(item) {
    app.annotations.remove(item);
    app.engine.scene.remove(item.anchor);
    app.assets.disposeResources(item.anchor);
  }

  return { loadCatalogAndScene, loadModel, loader, insertModel, addFromCatalog, disposeItem };
}
