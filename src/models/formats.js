export const MODEL_FORMATS = ['glb', 'gltf', 'obj', 'fbx', 'stl', 'ply'];
export const MAX_MODEL_BYTES = 64 * 1024 * 1024;

export function modelFormat(name) {
  const extension = name.split(/[?#]/, 1)[0].split('.').pop().toLowerCase();
  if (!MODEL_FORMATS.includes(extension)) throw new Error('Selecciona un modelo GLB, glTF, OBJ, FBX, STL o PLY.');
  return extension;
}

export function resourcePath(name) {
  let path;
  try { path = decodeURIComponent(name); } catch { path = name; }
  return path.replace(/\\/g, '/').replace(/[?#].*$/, '').split('/').filter((part) => part && part !== '.').join('/');
}

// File pickers may flatten folders. Use a basename only when it is unique.
export function findResource(files, name) {
  const path = resourcePath(name);
  const exact = files.filter((file) => resourcePath(file.webkitRelativePath || file.name) === path);
  if (exact.length === 1) return exact[0];
  const basename = path.split('/').pop();
  const matches = files.filter((file) => resourcePath(file.name).split('/').pop() === basename);
  if (matches.length !== 1) throw new Error(matches.length ? 'Hay varios recursos llamados ' + basename + '. Usa nombres de archivo únicos.' : 'Falta el recurso ' + basename + '. Selecciónalo en Materiales y texturas.');
  return matches[0];
}
