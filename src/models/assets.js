import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { wrapAngle } from "../core/math.js";

export function createAssets(app) {
  const catalogURL = new URL("./modelos-3d/catalogo.json", document.baseURI);

  function disposeResources(object) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    object.traverse((node) => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
        materials.add(material);
        Object.values(material).forEach((value) => { if (value?.isTexture) textures.add(value); });
      }
    });
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
  }

  function validateCatalog(data) {
    if (data.version !== 1 || !Array.isArray(data.modelos)) throw new Error("El catálogo debe tener version: 1 y una lista modelos.");
    const ids = new Set();
    return data.modelos.map((model) => {
      if (!model || typeof model.id !== "string" || !/^[a-z0-9-]+$/.test(model.id) || ids.has(model.id)) throw new Error("Cada modelo necesita un id único, con letras minúsculas, números o guiones.");
      ids.add(model.id);
      if (typeof model.nombre !== "string" || !model.nombre.trim() || typeof model.descripcion !== "string" || typeof model.archivo !== "string") throw new Error(`Faltan nombre, descripcion o archivo en ${model.id}.`);
      const url = new URL(model.archivo, catalogURL);
      if (url.origin !== catalogURL.origin || !url.pathname.startsWith(new URL(".", catalogURL).pathname) || !/\.(glb|gltf)$/i.test(url.pathname)) throw new Error(`El archivo de ${model.id} debe ser un GLB o glTF dentro de modelos-3d/.`);
      const view = model.visualizacion || {};
      const size = view.tamano ?? 1.6, height = view.alturaEtiqueta ?? 1.85;
      const rotation = view.rotacion ?? [0, 0, 0];
      if (!Number.isFinite(size) || size <= 0 || size > 3 || !Number.isFinite(height) || height < 0.8 || height > 3.4 || !Array.isArray(rotation) || rotation.length !== 3 || !rotation.every(Number.isFinite)) throw new Error(`La visualizacion de ${model.id} no es válida.`);
      if (model.datos !== undefined && (!Array.isArray(model.datos) || !model.datos.every((datum) => datum && typeof datum.etiqueta === "string" && ["string", "number"].includes(typeof datum.valor)))) throw new Error(`Los datos de ${model.id} no son válidos.`);
      return { ...model, nombre: model.nombre.trim(), categoria: typeof model.categoria === "string" ? model.categoria : "Modelo 3D", url: url.href, visualizacion: { tamano: size, alturaEtiqueta: height, rotacion: rotation.map(wrapAngle) } };
    });
  }

  function optimizeStaticModel(gltf) {
    const original = gltf.scene, meshes = [];
    let compatible = !gltf.animations.length;
    original.updateMatrixWorld(true);
    original.traverse((node) => {
      if (node.isLight || node.isCamera) compatible = false;
      if (!node.isMesh) return;
      meshes.push(node);
      if (node.isSkinnedMesh || node.isInstancedMesh || Array.isArray(node.material) ||
        Object.keys(node.geometry.morphAttributes).length || node.matrixWorld.determinant() < 0 ||
        node.geometry.drawRange.start !== 0 || node.geometry.drawRange.count !== Infinity || node.geometry.groups.length > 1 ||
        Object.values(node.geometry.attributes).some((attribute) => attribute.isInterleavedBufferAttribute || !attribute.array)) compatible = false;
    });
    if (!compatible || meshes.length < 30) return original;
    const batches = new Map(), merged = new THREE.Group();
    const copies = [];
    for (const mesh of meshes) {
      const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      copies.push(geometry);
      const signature = JSON.stringify(Object.keys(geometry.attributes).sort().map((key) => {
        const a = geometry.attributes[key]; return [key, a.itemSize, a.normalized, a.array.constructor.name];
      })) + Boolean(geometry.index);
      if (!batches.has(mesh.material)) batches.set(mesh.material, new Map());
      const groups = batches.get(mesh.material);
      if (!groups.has(signature)) groups.set(signature, []);
      groups.get(signature).push(geometry);
    }
    let success = true;
    batches.forEach((groups, material) => groups.forEach((geometries) => {
      const geometry = mergeGeometries(geometries, false);
      if (!geometry) { success = false; return; }
      const mesh = new THREE.Mesh(geometry, material); mesh.name = material.name || "Modelo"; merged.add(mesh);
    }));
    copies.forEach((geometry) => geometry.dispose());
    if (!success) { merged.children.forEach((node) => node.geometry.dispose()); return original; }
    // Only geometry is replaced. The imported materials and textures stay intact.
    new Set(meshes.map((mesh) => mesh.geometry)).forEach((geometry) => geometry.dispose());
    return merged;
  }

  function validateLocalGLB(buffer) {
    if (buffer.byteLength < 20) throw new Error("El archivo está vacío o no es un GLB válido.");
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error("Selecciona un archivo GLB de glTF 2.0 válido.");
    const length = view.getUint32(12, true);
    if (length > buffer.byteLength - 20) throw new Error("El archivo GLB está incompleto.");
    let data;
    try { data = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)).trim()); }
    catch { throw new Error("No se pudieron leer los datos del archivo GLB."); }
    const resources = [...(data.buffers || []), ...(data.images || [])];
    if (resources.some((resource) => resource.uri && !/^data:/i.test(resource.uri))) throw new Error("Este GLB usa recursos externos. Expórtalo con las texturas y los buffers integrados para cargarlo desde tu equipo.");
  }

  function localCredits(gltf) {
    const extra = gltf.asset?.extras;
    if (!extra || typeof extra !== "object") return undefined;
    const splitCredit = (text) => {
      if (typeof text !== "string") return ["", ""];
      const match = text.match(/^(.*?)\s*\((https?:\/\/[^)]+)\)\s*$/);
      return match ? [match[1].trim(), match[2]] : [text, ""];
    };
    const [autor, autorUrl] = splitCredit(extra.author);
    const [licencia, licenciaUrl] = splitCredit(extra.license);
    const fuente = typeof extra.source === "string" ? extra.source : "";
    return autor || licencia || fuente ? { autor, autorUrl, licencia, licenciaUrl, fuente } : undefined;
  }

  return { disposeResources, optimizeStaticModel, validateLocalGLB, localCredits, catalogURL, validateCatalog };
}
