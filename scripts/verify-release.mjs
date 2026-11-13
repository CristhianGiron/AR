import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { root, sourceSnapshot } from './release-files.mjs';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const folder = resolve(root, 'reports', stamp);
await mkdir(folder, { recursive: true });
const before = await sourceSnapshot();
const jobs = [
  ['estructura', ['scripts/check-project.mjs']],
  ['unitarias', ['--test', 'tests/unit/learning.test.js', 'tests/unit/pagination.test.js', 'tests/unit/projects.test.js', 'tests/unit/missions.test.js', 'tests/unit/echo.test.js', 'tests/unit/surfaces.test.js']],
  ['escenas-guardadas', ['tests/browser/projects.cjs']],
  ['laboratorio-educativo', ['tests/browser/learning-lab.cjs', '--all-models']],
  ['laboratorio-eco', ['tests/browser/echo-lab.cjs', '--all-models']],
  ['misiones-guiadas', ['tests/browser/missions.cjs', '--all-models']],
  ['superficies-webxr', ['tests/browser/surfaces.cjs', '--all-models']],
  ['camara', ['tests/browser/camera.cjs']],
  ['inicio-sin-webgl', ['tests/browser/startup.cjs']],
  ['regresion-completa', ['tests/browser/smoke.cjs', '--all-models']],
  ['fichas-catalogo', ['tests/browser/card-overview.cjs', '--all-models']],
  ['paginacion', ['tests/browser/pagination.cjs']],
  ['ficha-y-reto', ['tests/browser/inspector.cjs']],
  ['accesibilidad', ['tests/browser/accessibility.cjs']],
  ['efectos-visuales', ['tests/browser/effects.cjs']],
  ['banner-y-etiquetas', ['tests/browser/banner-labels.cjs', '--all-models']],
  ['centrado-y-tipografia', ['tests/browser/centering.cjs']],
  ['paneles-informativos', ['tests/browser/panels.cjs']],
  ['referencia-visual', ['tests/browser/reference.cjs']],
];
const results = [];
for (const [name, args] of jobs) {
  const started = Date.now(); console.log('Verificando: ' + name);
  const artifacts = resolve(folder, name); await mkdir(artifacts, { recursive: true });
  const result = await new Promise((resolveJob) => {
    const processJob = spawn(process.execPath, args, { cwd: root, env: { ...process.env, QA_ARTIFACTS_DIR: artifacts }, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '', timedOut = false;
    processJob.stdout.on('data', (chunk) => { log += chunk; }); processJob.stderr.on('data', (chunk) => { log += chunk; });
    const timer = setTimeout(() => { timedOut = true; processJob.kill('SIGTERM'); }, 480000);
    processJob.on('error', (error) => { log += error.message; });
    processJob.on('close', (code, signal) => { clearTimeout(timer); resolveJob({ code, signal, timedOut, log }); });
  });
  await writeFile(resolve(folder, name + '.log'), result.log);
  results.push({ name, command: ['node', ...args].join(' '), exitCode: result.code, signal: result.signal, timedOut: result.timedOut, seconds: Math.round((Date.now() - started) / 1000), passed: result.code === 0 && !result.signal && !result.timedOut });
  console.log((results.at(-1).passed ? 'PASS: ' : 'FAIL: ') + name);
}
const after = await sourceSnapshot(), unchanged = before.sha256 === after.sha256;
const report = { generatedAt: new Date().toISOString(), sourceSha256: before.sha256, unchangedDuringTests: unchanged,
  node: process.version, platform: process.platform, browserPath: process.env.BROWSER_PATH || '/usr/bin/google-chrome',
  passed: unchanged && results.every((result) => result.passed), results,
  scope: 'Chrome en Linux con renderizado por software y medios simulados. No sustituye dispositivos físicos, revisión docente ni evaluación humana de accesibilidad.' };
await writeFile(resolve(folder, 'report.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(resolve(folder, 'source-manifest.json'), JSON.stringify(before, null, 2) + '\n');
await writeFile(resolve(folder, 'README.md'), `# Verificación de entrega\n\nFecha UTC: ${report.generatedAt}\n\nResultado: **${report.passed ? 'APROBADA AUTOMÁTICAMENTE' : 'CON PENDIENTES'}**\n\nHuella de fuentes: \`${before.sha256}\`\n\n| Comprobación | Resultado | Segundos |\n| --- | --- | --- |\n${results.map((r) => `| ${r.name} | ${r.passed ? 'PASS' : 'FAIL'} | ${r.seconds} |`).join('\n')}\n\n${report.scope}\n\nCada carpeta contiene las evidencias de su prueba. Los resultados incompletos de axe requieren evaluación humana.\n`);
await writeFile(resolve(root, 'reports/latest.json'), JSON.stringify({ folder: 'reports/' + stamp, ...report }, null, 2) + '\n');
console.log('Informe: ' + folder); if (!report.passed) process.exitCode = 1;
