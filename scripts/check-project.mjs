import { readFile, readdir, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { validateMissions } from "../src/education/mission-model.js";
import { validateLessons } from "../src/education/lessons.js";

const root = resolve(import.meta.dirname, "..");
async function scripts(folder) {
  const result = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const file = resolve(folder, item.name);
    if (item.isDirectory()) result.push(...await scripts(file));
    else if (item.name.endsWith(".js")) result.push(file);
  }
  return result;
}
const files = await scripts(resolve(root, "src"));
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status) throw new Error(result.stderr);
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) await access(resolve(dirname(file), match[1]));
}
// Development and delivery scripts must also remain executable.
for (const folder of ["scripts", "tests/browser", "tests/unit"]) {
  for (const name of await readdir(resolve(root, folder))) {
    if (!/\.(?:mjs|cjs|js)$/.test(name)) continue;
    const result = spawnSync(process.execPath, ["--check", resolve(root, folder, name)], { encoding: "utf8" });
    if (result.status) throw new Error(result.stderr);
  }
}
const catalog = JSON.parse(await readFile(resolve(root, "modelos-3d/catalogo.json"), "utf8"));
const ids = new Set();
for (const model of catalog.modelos) {
  if (ids.has(model.id)) throw new Error("Id duplicado: " + model.id);
  ids.add(model.id); await access(resolve(root, "modelos-3d", model.archivo));
}
const lessons = validateLessons(JSON.parse(await readFile(resolve(root, "contenido/retos.json"), "utf8")));
for (const id of lessons.keys()) if (!ids.has(id)) throw new Error("Reto sin modelo: " + id);
const parts = JSON.parse(await readFile(resolve(root, "contenido/partes.json"), "utf8"));
if (parts.version !== 1 || !parts.modelos) throw new Error("Contenido de partes no compatible.");
for (const [id, entries] of Object.entries(parts.modelos)) {
  if (!ids.has(id) || !Array.isArray(entries) || entries.length > 20) throw new Error("Partes sin modelo o fuera de límite: " + id);
  const unique = new Set();
  for (const part of entries) {
    if (unique.has(part.id) || ![part.id, part.nombre, part.nodo, part.descripcion].every(value => typeof value === 'string' && value.trim())) throw new Error("Parte no válida: " + id);
    unique.add(part.id);
  }
}
validateMissions(JSON.parse(await readFile(resolve(root, "contenido/misiones.json"), "utf8")), ids);
const html = await readFile(resolve(root, "index.html"), "utf8");
if (html.includes('<style>') || /\bstyle=/.test(html) || /<script type="module">/.test(html)) throw new Error("El HTML vuelve a contener estilos o lógica de aplicación.");
const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
if (new Set(htmlIds).size !== htmlIds.length) throw new Error("Hay ids duplicados en el HTML.");
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) await access(resolve(root, match[1]));
console.log(`OK: ${files.length} módulos, ${ids.size} modelos y ${lessons.size} retos; rutas, sintaxis e identificadores correctos.`);
