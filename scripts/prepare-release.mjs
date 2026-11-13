import { mkdir, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { root, runtimeFiles, fingerprints, sourceSnapshot, digest } from './release-files.mjs';
const latest = JSON.parse(await readFile(resolve(root, 'reports/latest.json')));
const source = await sourceSnapshot();
if (!latest.passed || source.sha256 !== latest.sourceSha256) throw new Error('Ejecuta verify:release y obtén un informe aprobado de estas mismas fuentes antes de empaquetar.');
const version = JSON.parse(await readFile(resolve(root, 'package.json'))).version;
const name = `explorar-${version}-${source.sha256.slice(0, 10)}`;
const destination = resolve(root, 'dist', name); await mkdir(destination, { recursive: true });
const files = await runtimeFiles(), entries = await fingerprints(files);
for (const file of files) { const target = resolve(destination, file); await mkdir(dirname(target), { recursive: true }); await copyFile(resolve(root, file), target); }
const status = { version, sourceSha256: source.sha256, verification: latest.folder, candidateOnly: true,
  pending: ['Dispositivos físicos y cámara real', 'Piloto educativo y revisión docente', 'Accesibilidad humana', 'Confirmación de procedencia de la referencia visual para publicación', 'Alojamiento HTTPS y aceptación de publicación'] };
await writeFile(resolve(destination, 'release-status.json'), JSON.stringify(status, null, 2) + '\n');
await writeFile(resolve(destination, 'manifest.json'), JSON.stringify({ runtimeSha256: digest(entries), sourceSha256: source.sha256, files: entries }, null, 2) + '\n');
// Verify copied bytes independently of the source paths.
for (const entry of entries) {
  const { createHash } = await import('node:crypto');
  const actual = createHash('sha256').update(await readFile(resolve(destination, entry.file))).digest('hex');
  if (actual !== entry.sha256) throw new Error('Copia distinta: ' + entry.file);
}
const artifacts = resolve(root, latest.folder, 'paquete'); await mkdir(artifacts, { recursive: true });
async function command(binary, args, env = {}) {
  return new Promise((resolveJob, reject) => {
    const job = spawn(binary, args, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; job.stdout.on('data',v=>{output+=v}); job.stderr.on('data',v=>{output+=v});
    job.on('error',reject); job.on('close',(code)=>code===0?resolveJob(output):reject(new Error(output || `Proceso terminado: ${code}`)));
  });
}
const output = await command(process.execPath, ['tests/browser/packaged.cjs'], { EXPLORAR_SITE_ROOT: destination, QA_ARTIFACTS_DIR: artifacts });
await writeFile(resolve(artifacts, 'package-test.log'), output);
const archive = resolve(root, 'dist', name + '.tar.gz');
try { await access(archive); } catch { await command('tar', ['-czf', archive, '-C', resolve(root, 'dist'), name]); }
await writeFile(resolve(root, 'dist/latest.json'), JSON.stringify({ directory: 'dist/' + name, archive: 'dist/' + name + '.tar.gz', ...status, runtimeFiles: entries.length, runtimeBytes: entries.reduce((sum,e)=>sum+e.bytes,0), packageTestPassed: true }, null, 2) + '\n');
console.log(output.trim()); console.log('Candidato preparado: ' + destination); console.log('Archivo: ' + archive);
console.log('No publicado; requisitos humanos y procedencia pendientes en release-status.json.');
