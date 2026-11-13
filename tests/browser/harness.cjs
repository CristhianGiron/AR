const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const root = process.env.EXPLORAR_SITE_ROOT ? path.resolve(process.env.EXPLORAR_SITE_ROOT) : path.resolve(__dirname, '../..');
const artifacts = process.env.QA_ARTIFACTS_DIR ? path.resolve(process.env.QA_ARTIFACTS_DIR) : path.join(os.tmpdir(), 'explorar-qa');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'modelos-3d/catalogo.json')));
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'contenido/retos.json')));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.svg': 'image/svg+xml' };

async function run(callback) {
  const allModels = process.argv.includes('--all-models');
  fs.mkdirSync(artifacts, { recursive: true });
  const server = http.createServer((request, response) => {
    if (request.url === '/favicon.ico') { response.writeHead(204); return response.end(); }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); return response.end(); }
    if (pathname === '/contenido/retos.json' && request.headers.referer?.includes('no-lessons=1')) { response.writeHead(404); return response.end(); }
    if (pathname === '/contenido/misiones.json' && request.headers.referer?.includes('no-missions=1')) { response.writeHead(404); return response.end(); }
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    if (pathname === '/modelos-3d/catalogo.json' && !allModels) return response.end(JSON.stringify({ ...catalog, modelos: catalog.modelos.filter((model) => ['sensor-luz-ldr', 'sensor-lluvia'].includes(model.id)) }));
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', ...(process.env.QA_FINE_POINTER === '1' ? ['--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'] : [])] });
  try {
    fs.writeFileSync(path.join(artifacts, 'browser.json'), JSON.stringify({ browser: await browser.version(), node: process.version, platform: process.platform, mode: 'headless-software-rendering', physicalDevice: false, finePointerSimulation: process.env.QA_FINE_POINTER === '1' }, null, 2));
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.evaluateOnNewDocument(() => { window.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 200); });
    await page.setViewport({ width: 1280, height: 900, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    async function load(suffix = '') {
      await page.goto(origin + '/' + suffix, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async () => {
        window.__app = (await import('/src/main.js')).app;
        window.__THREE = await import('three');
        await __app.ready; __app.loop.stop(); __app.loop.renderFrame();
      });
    }
    const frame = () => page.evaluate(() => __app.loop.renderFrame());
    const ready = () => page.waitForFunction(() => !__app.state.catalogLoading && __app.state.pendingLoads === 0);
    const snapshot = () => page.evaluate(() => __app.state.entries.map((item) => ({ id: item.type, position: item.anchor.position.toArray(), rotation: item.rot.slice(), size: item.size })));
    const close = async () => { await page.evaluate(() => __app.hud.close(false)); await frame(); };
    // Reach off-page controls by clicking the same visible arrows a learner uses.
    async function click(selector, options) {
      const destination = await page.$eval(selector, (element) => element.closest('dialog')?.id);
      if (destination === 'inspector' && !await page.$eval('#inspector', (element) => element.open)) {
        await close();
        if (!await page.$eval('#inspector', (element) => element.open)) await page.click('#object-inspect');
      }
      if (['challenge', 'technical'].includes(destination) && !await page.$eval('#' + destination, (element) => element.open)) {
        if (!await page.$eval('#inspector', (element) => element.open)) { await close(); await page.click('#object-inspect'); }
        await page.click(destination === 'challenge' ? '#open-challenge' : '#open-technical');
      }
      await page.evaluate(() => document.querySelectorAll('.paged-surface').forEach((surface) => __app.pagination.refresh(surface)));
      for (let step = 0; step < 100; step++) {
        const location = await page.evaluate((selector) => __app.pagination.locate(document.querySelector(selector)), selector);
        if (!location || location.target < 0 || location.current === location.target) break;
        const side = location.current < location.target ? 'last-child' : 'first-child';
        await page.click('#' + location.surface + ' > .page-navigation > button:' + side);
      }
      return page.click(selector, options);
    }
    const openMenuAction = async (id) => { await close(); if (!await page.$eval('#workspace-panel', (element) => !element.hidden)) await page.click('#workspace-toggle'); await click('#' + id); await frame(); };
    const select = async (id) => {
      await openMenuAction('my-scene');
      const index = await page.evaluate((id) => __app.state.entries.findIndex((item) => item.type === id), id);
      assert.ok(index >= 0, id);
      await click('.scene-item:nth-child(' + (index + 1) + ')'); await frame();
    };
    const advanced = async () => { await close(); await page.click('#object-more'); await frame(); };
    await load();
    await callback({ page, browser, errors, origin, root, artifacts, catalog, lessons, allModels, frame, ready, snapshot, close, click, openMenuAction, select, advanced, load });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
}
module.exports = { run };
