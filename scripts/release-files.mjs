import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
export const root = resolve(import.meta.dirname, '..');
async function filesUnder(folder) {
  const result = [];
  for (const entry of await readdir(resolve(root, folder), { withFileTypes: true })) {
    const name = folder + '/' + entry.name;
    if (entry.isDirectory()) result.push(...await filesUnder(name));
    else if (entry.isFile()) result.push(name);
  }
  return result;
}
export async function runtimeFiles() {
  const catalog = JSON.parse(await readFile(resolve(root, 'modelos-3d/catalogo.json')));
  const models = catalog.modelos.map((model) => {
    const file = resolve(root, 'modelos-3d', model.archivo);
    if (!file.startsWith(resolve(root, 'modelos-3d') + sep)) throw new Error('Ruta fuera del catálogo');
    return relative(root, file).split(sep).join('/');
  });
  return [...new Set(['index.html', 'README.md', ...models, 'modelos-3d/catalogo.json',
    ...await filesUnder('src'), ...await filesUnder('styles'), ...await filesUnder('assets'),
    ...await filesUnder('contenido'), ...await filesUnder('vendor'), ...await filesUnder('docs')])].sort();
}
export async function fingerprints(files) {
  return Promise.all(files.map(async (file) => {
    const bytes = await readFile(resolve(root, file));
    return { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }));
}
export function digest(entries) { return createHash('sha256').update(JSON.stringify(entries)).digest('hex'); }
export async function sourceSnapshot() {
  const files = [...new Set([...await runtimeFiles(), ...await filesUnder('tests'), ...await filesUnder('scripts'), 'package.json', 'package-lock.json'])].sort();
  const entries = await fingerprints(files); return { sha256: digest(entries), files: entries };
}
