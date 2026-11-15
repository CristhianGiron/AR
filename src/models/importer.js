import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { modelFormat, findResource, MAX_MODEL_BYTES } from './formats.js';

function trackedManager() {
  const manager = new THREE.LoadingManager();
  let pending = 0, finish;
  const errors = [];
  const start = manager.itemStart.bind(manager), end = manager.itemEnd.bind(manager);
  manager.itemStart = (url) => { pending++; start(url); };
  manager.itemEnd = (url) => { end(url); if (--pending === 0) finish?.(); };
  manager.onError = (url) => errors.push(url);
  return { manager, async settle() { if (pending) await new Promise((resolve) => { finish = resolve; }); },
    check() { if (errors.length) throw new Error('No se pudo leer una textura o un recurso del modelo. Revisa los archivos seleccionados.'); } };
}

async function parseModel(buffer, format, manager, base, readText) {
  if (format === 'glb' || format === 'gltf') return new GLTFLoader(manager).parseAsync(buffer, base);
  if (format === 'obj') {
    const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
    const loader = new OBJLoader(manager), text = new TextDecoder().decode(buffer);
    const libraries = [...text.matchAll(/^\s*mtllib\s+(.+?)\s*$/gm)].map((match) => match[1].trim());
    if (libraries.length) {
      const { MTLLoader } = await import('three/addons/loaders/MTLLoader.js');
      const materials = new Map();
      for (const library of libraries) {
        const source = await readText(library);
        const creator = new MTLLoader(manager).parse(source.text, source.base);
        creator.preload();
        Object.keys(creator.materialsInfo).forEach((name) => materials.set(name, creator.create(name)));
      }
      loader.setMaterials({ create(name) { return materials.get(name) || new THREE.MeshPhongMaterial(); } });
    }
    return { scene: loader.parse(text), animations: [] };
  }
  if (format === 'fbx') {
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const scene = new FBXLoader(manager).parse(buffer, base);
    return { scene, animations: scene.animations || [] };
  }
  const module = format === 'stl' ? await import('three/addons/loaders/STLLoader.js') : await import('three/addons/loaders/PLYLoader.js');
  const Loader = module.STLLoader || module.PLYLoader;
  const geometry = new Loader(manager).parse(buffer);
  if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: geometry.hasAttribute('color') ? 0xffffff : 0xb8c5d6,
    vertexColors: geometry.hasAttribute('color'), roughness: .65, side: THREE.DoubleSide,
    opacity: geometry.alpha ?? 1, transparent: (geometry.alpha ?? 1) < 1 });
  const scene = new THREE.Group(); scene.add(new THREE.Mesh(geometry, material));
  return { scene, animations: [] };
}

function validateGeometry(scene) {
  const bounds = new THREE.Box3().setFromObject(scene);
  if (bounds.isEmpty() || ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite) || bounds.getSize(new THREE.Vector3()).length() <= 0) {
    throw new Error('El archivo no contiene una geometría visible.');
  }
}

// Keep an independent manager per import so simultaneous loads cannot mix resources.
export async function importLocalModel(file, resources, assets) {
  const format = modelFormat(file.name), files = [...resources];
  if ([file, ...files].reduce((sum, item) => sum + item.size, 0) > MAX_MODEL_BYTES) throw new Error('El modelo y sus recursos superan 64 MB. Reduce su tamaño antes de abrirlo.');
  const tracking = trackedManager(), { manager } = tracking, urls = new Map();
  let original;
  manager.setURLModifier((url) => {
    // Loaders create blob URLs for images embedded in GLB and FBX.
    if (/^(data:|blob:)/i.test(url)) return url;
    let resource;
    try { resource = findResource(files, url); }
    catch (error) { manager.onError(url); throw error; }
    if (!urls.has(resource)) urls.set(resource, URL.createObjectURL(resource));
    return urls.get(resource);
  });
  try {
    const { TGALoader } = await import('three/addons/loaders/TGALoader.js');
    manager.addHandler(/\.tga$/i, new TGALoader(manager));
    const buffer = await file.arrayBuffer();
    original = await parseModel(buffer, format, manager, '', async (name) => ({ text: await findResource(files, name).text(), base: '' }));
    await tracking.settle(); tracking.check(); validateGeometry(original.scene);
    if (format === 'glb') {
      assets.validateLocalGLB(buffer);
      return { gltf: original, buffer };
    }
    // Store all local formats as self-contained GLB, preserving the project schema.
    const credits = original.asset;
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const integrated = await new GLTFExporter().parseAsync(original.scene, { binary: true, animations: original.animations, onlyVisible: false });
    assets.validateLocalGLB(integrated);
    const gltf = await new GLTFLoader().parseAsync(integrated, '');
    if (credits) gltf.asset = credits;
    assets.disposeResources(original.scene); original = null;
    return { gltf, buffer: integrated };
  } catch (error) {
    if (original) assets.disposeResources(original.scene);
    throw error;
  } finally {
    await tracking.settle();
    urls.forEach((url) => URL.revokeObjectURL(url));
  }
}

export async function loadCatalogModel(url, gltfLoader, assets) {
  const format = modelFormat(new URL(url).pathname);
  if (format === 'glb' || format === 'gltf') return gltfLoader.loadAsync(url);
  const tracking = trackedManager(), base = new URL('.', url).href;
  let model;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo leer el modelo (HTTP ' + response.status + ').');
    model = await parseModel(await response.arrayBuffer(), format, tracking.manager, base, async (name) => {
      const materialURL = new URL(name, base), response = await fetch(materialURL);
      if (!response.ok) throw new Error('No se pudo leer el material ' + name + '.');
      return { text: await response.text(), base: new URL('.', materialURL).href };
    });
    await tracking.settle(); tracking.check(); return model;
  } catch (error) { if (model) assets.disposeResources(model.scene); throw error; }
  finally { await tracking.settle(); }
}
