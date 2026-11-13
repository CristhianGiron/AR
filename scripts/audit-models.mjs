import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { root } from './release-files.mjs';
const catalog = JSON.parse(await readFile(resolve(root, 'modelos-3d/catalogo.json')));
const rows = [];
for (const model of catalog.modelos) {
  const bytes = await readFile(resolve(root, 'modelos-3d', model.archivo));
  const length = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + length).toString());
  const extras = gltf.asset?.extras || {}, credit = model.creditos || {}, own = model.procedencia?.tipo === 'propio';
  rows.push({ id: model.id, archivo: model.archivo, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    generator: gltf.asset?.generator || '', autor: credit.autor || extras.author || null,
    licencia: credit.licencia || extras.license || null, fuente: credit.fuente || extras.source || null,
    declaracion: own ? model.procedencia.declaracion : null, licenciaPublica: own ? model.procedencia.licenciaPublica : credit.licencia || extras.license || null,
    estado: own ? 'autoria-propia-declarada' : (credit.autor || extras.author) && (credit.licencia || extras.license) && (credit.fuente || extras.source) ? 'documentado-en-archivo' : 'procedencia-pendiente' });
}
await writeFile(resolve(root, 'docs/inventario-modelos.json'), JSON.stringify({ version: 1, modelos: rows }, null, 2) + '\n');
console.log(`${rows.length} modelos inventariados: ${rows.filter((r) => r.estado === 'autoria-propia-declarada').length} propios declarados, ${rows.filter((r) => r.estado === 'documentado-en-archivo').length} con origen en archivo y ${rows.filter((r) => r.estado === 'procedencia-pendiente').length} pendientes. No se asigna una licencia pública a los modelos propios.`);
