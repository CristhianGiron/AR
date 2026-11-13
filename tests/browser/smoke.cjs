const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { run } = require('./harness.cjs');

run(async ({ page, artifacts, root, lessons, allModels, frame, ready, snapshot, close, click, openMenuAction, select, advanced, load }) => {
  const initialCount = await page.evaluate(() => __app.state.entries.length);
  assert.equal(initialCount, allModels ? 6 : 2);
  assert.equal(await page.evaluate(() => __app.state.chosen), null);
  assert.equal(await page.$$eval('dialog[open]', (dialogs) => dialogs.length), 0);
  assert.ok(await page.evaluate(() => __app.state.entries.every((item) => [...item.materialColors].every(([material, color]) => material.color.equals(color)))));
  assert.equal(await page.$eval('#workspace-panel', (element) => element.tagName), 'ASIDE');
  assert.equal(await page.$eval('#workspace-panel', (element) => element.hidden), false);
  await page.mouse.click(1100, 160); await frame();
  assert.equal(await page.evaluate(() => __app.state.hudSurface), null);
  assert.equal(await page.$eval('#workspace-panel', (element) => element.hidden), false);
  await click('#hud-toggle');
  assert.equal(await page.$eval('#workspace-panel', (element) => element.hidden), true);
  await click('#hud-toggle'); await frame();
  assert.equal(await page.$eval('#workspace-panel', (element) => element.hidden), false);
  await page.screenshot({ path: path.join(artifacts, 'hud-initial.png') });

  if (allModels) {
    await openMenuAction('explore'); await click('[data-model="arduino-uno"]'); await ready(); await frame();
    assert.equal(await page.evaluate(() => __app.state.chosen.type), 'arduino-uno');
    await advanced(); assert.equal(await page.$$eval('#model-data a', (items) => items.length), 3);
    await click('#delete'); await frame(); assert.equal(await page.evaluate(() => __app.state.entries.length), initialCount);
  }
  await select('sensor-luz-ldr');
  assert.equal(await page.$$eval('#actions > button', (buttons) => buttons.length), 5);
  assert.equal(await page.evaluate(() => __app.state.hudSurface), null);
  await click('[data-mode="rotate"]'); await frame();
  assert.equal(await page.evaluate(() => __app.state.rotationExpanded), false);
  assert.equal(await page.$$eval('dialog[open]', (dialogs) => dialogs.length), 0);
  await page.screenshot({ path: path.join(artifacts, 'hud-selected.png') });

  await advanced(); assert.equal(await page.$eval('#panel', (dialog) => dialog.open), true);
  assert.equal(await page.$$eval('dialog[open]', (dialogs) => dialogs.length), 1);
  await click('#precision-details summary');
  await page.waitForFunction(() => __app.state.rotationExpanded);
  await page.$eval('#angle-y', (input) => { input.value = '12.3'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.evaluate(() => __app.state.chosen.rot[1]), 12.3);
  await click('#numeric-controls summary');
  const beforeMove = await page.evaluate(() => __app.state.chosen.anchor.position.x);
  await click('[data-translate="x"][data-direction="1"]');
  assert.ok(Math.abs(await page.evaluate(() => __app.state.chosen.anchor.position.x) - beforeMove - 0.1) < 1e-8);
  await page.$eval('#object-size-number', (input) => { input.value = '1.4'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.evaluate(() => __app.state.chosen.size), 1.4);
  await click('#home');
  await page.keyboard.press('Escape'); await frame();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'object-more');

  await click('#object-inspect'); await frame();
  await page.keyboard.press('Escape'); await frame();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'object-inspect');
  await click('#object-inspect'); await frame();
  assert.equal(await page.evaluate(() => __app.state.hudSurface), 'inspector');
  assert.equal(await page.$$eval('dialog[open]', (dialogs) => dialogs.length), 1);
  await click('#learning-quiz-tab');
  const lesson = lessons.retos.find((item) => item.modelo === 'sensor-luz-ldr');
  await (await page.$$('#learning-choices button'))[(lesson.correcta + 1) % lesson.opciones.length].click();
  assert.ok(await page.$eval('#learning-feedback', (item) => item.textContent.includes('pista')));
  await (await page.$$('#learning-choices button'))[lesson.correcta].click();
  assert.ok(await page.$eval('#learning-feedback', (item) => item.classList.contains('correct')));
  await click('#retry-lesson');
  assert.ok(await page.$$eval('#learning-choices button', (buttons) => buttons.every((button) => !button.disabled)));
  await click('#learning-observe-tab');
  const beforeFocus = await snapshot(); await click('#focus-component'); await frame();
  assert.equal(await page.$$eval('dialog[open]', (dialogs) => dialogs.length), 0);
  assert.equal(await page.evaluate(() => __app.state.entries.filter((item) => item.anchor.visible).length), 1);
  assert.deepEqual(await snapshot(), beforeFocus);
  await click('#view-controls-toggle'); await click('#collection-mode'); await frame();
  assert.ok(await page.evaluate(() => __app.state.entries.every((item) => item.anchor.visible)));
  const beforeGroup = await snapshot();
  await click('#collection-in'); await click('#collection-rotate');
  await page.$eval('#collection-x', (input) => { input.value = '25'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await frame(); assert.deepEqual(await snapshot(), beforeGroup);
  await click('#collection-reset'); await click('#collection-mode'); await close();

  await openMenuAction('explore'); await click('#manual-upload summary');
  await (await page.$('#local-file')).uploadFile(path.join(root, 'modelos-3d/FOTORESISTENCIA.glb'));
  await page.$eval('#local-name', (input) => { input.value = 'Mi modelo local'; });
  await click('#import-local'); await ready(); await frame();
  assert.equal(await page.evaluate(() => __app.state.entries.length), initialCount + 1);
  await page.evaluate(() => { window.__uploaded = __app.state.chosen; });
  await advanced(); await click('#delete'); await frame();
  assert.equal(await page.evaluate(() => __app.state.entries.length), initialCount);
  assert.equal(await page.$$eval('dialog[open]', (dialogs) => dialogs.length), 0);
  await click('#undo-remove'); await frame();
  assert.equal(await page.evaluate(() => __app.state.chosen === __uploaded), true);

  // Use real WebGL depth: a rear label must not erase the line; a nearer one must hide it.
  await close();
  await page.evaluate(async () => {
    const T = __THREE, { createAnnotations } = await import('/src/scene/annotations.js');
    const camera = new T.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 0, 6); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const scene = new T.Scene(), anchor = new T.Group(); scene.background = new T.Color(0x191a50); scene.add(anchor);
    const mesh = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.5), new T.MeshBasicMaterial({ color: 0x606060 }));
    mesh.position.y = -1; anchor.add(mesh);
    const state = { entries: [], chosen: null };
    const annotations = createAnnotations({ state, engine: { camera } });
    const tag = annotations.labelSprite('Origen'); tag.position.y = 1; anchor.add(tag);
    const item = { anchor, mesh, tag }; state.entries.push(item);
    const blocker = annotations.labelSprite(''); scene.add(blocker);
    window.__depthFixture = { scene, camera, anchor, mesh, tag, blocker, annotations, state, item };
    window.__renderDepth = (z, x = 0, y = 0) => {
      blocker.position.set(x, y, z); annotations.updateAll();
      __app.engine.renderer.render(scene, camera);
    };
  });
  async function cyanAtCenter() {
    const screenshot = await page.screenshot({ encoding: 'base64' });
    return page.evaluate(async (screenshot) => {
      const image = new Image(); image.src = 'data:image/png;base64,' + screenshot; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(Math.round(image.width / 2) - 2, Math.round(image.height / 2) - 2, 5, 5).data;
      return Array.from({ length: pixels.length / 4 }, (_, i) => pixels.slice(i * 4, i * 4 + 3))
        .some(([r, g, b]) => r > 80 && g > 120 && b > 160 && g > r + 20);
    }, screenshot);
  }
  await page.evaluate(() => __renderDepth(-0.6));
  assert.ok(await cyanAtCenter(), 'Una etiqueta detrás no debe borrar la línea cercana');
  await page.screenshot({ path: path.join(artifacts, 'connector-label-behind.png') });
  await page.evaluate(() => __renderDepth(0.6));
  assert.equal(await cyanAtCenter(), false, 'Una etiqueta delante debe ocultar la línea lejana');
  await page.screenshot({ path: path.join(artifacts, 'connector-label-in-front.png') });
  await page.evaluate(() => __renderDepth(0.6, -0.81, -0.16));
  assert.ok(await cyanAtCenter(), 'Las esquinas transparentes no deben escribir profundidad');
  await page.evaluate(() => {
    const f = __depthFixture, line = f.anchor.children.find((node) => node.isLine);
    if (line.geometry.getAttribute('position').count !== 2) throw new Error('El conector debe ser recto');
    const point = new __THREE.Vector3().fromBufferAttribute(line.geometry.getAttribute('position'), 0);
    if (Math.abs(point.y + 0.75) > 0.0001) throw new Error('El extremo debe tocar la superficie del modelo');
    f.annotations.remove(f.item);
    if (f.anchor.children.some((node) => node.isLine)) throw new Error('El conector eliminado sigue en la escena');
    f.annotations.updateAll(); // Also exercises rebuilding after undo.
    f.state.entries.length = 0; f.annotations.updateAll();
    f.mesh.geometry.dispose(); f.mesh.material.dispose();
    for (const tag of [f.tag, f.blocker]) { tag.material.map.dispose(); tag.material.dispose(); }
    delete window.__depthFixture; delete window.__renderDepth;
    __app.loop.renderFrame();
  });

  // Native dialog focus is contained and Escape returns to the invoking floating action.
  await select('sensor-luz-ldr'); await advanced();
  await page.evaluate(() => { const buttons = [...document.querySelectorAll('#panel button')].filter((button) => !button.disabled && !button.closest('[inert], [hidden]') && button.getClientRects().length); buttons.at(-1).focus(); });
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement.closest('dialog')?.id === 'panel'));
  await page.keyboard.press('Escape'); await frame();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'object-more');

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewport({ ...viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await frame();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const quick = await page.$eval('#tools', (element) => { const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }; });
    assert.ok(quick.height <= 48 && quick.width <= 256 && quick.left >= 0 && quick.right <= viewport.width && quick.bottom <= viewport.height);
    if (viewport.width <= 700) {
      await click('#workspace-toggle');
      assert.equal(await page.$$eval('dialog[open]', (dialogs) => dialogs.length), 0);
      assert.equal(await page.$eval('#workspace-panel', (element) => element.inert), false);
      assert.equal(await page.$eval('#stage canvas', (element) => element.closest('[inert]')), null);
      await page.keyboard.press('Escape'); await frame();
      assert.equal(await page.$eval('#workspace-panel', (element) => element.hidden), true);
    }
    await click('#object-inspect');
    assert.equal(await page.evaluate(() => __app.state.hudSurface), 'inspector');
    await page.keyboard.press('Escape'); await frame();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'object-inspect');
    await advanced();
    const dialog = await page.$eval('#panel', (element) => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
    assert.ok(dialog.left >= 0 && dialog.right <= viewport.width && dialog.top >= 0 && dialog.bottom <= viewport.height);
    await close();
  }
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await frame();
  await page.screenshot({ path: path.join(artifacts, 'hud-mobile-selected.png') });
  await advanced(); await page.screenshot({ path: path.join(artifacts, 'hud-mobile-advanced.png') }); await close();
  await click('#view-controls-toggle'); await click('#collection-mode'); await close();
  const touchBefore = await snapshot(), cdp = await page.createCDPSession();
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([id, x, y]) => ({ id, x, y, radiusX: 2, radiusY: 2, force: 1 })) });
  await touch('touchStart', [[0, 170, 400]]); await touch('touchStart', [[0, 170, 400], [1, 210, 400]]);
  await touch('touchMove', [[0, 165, 410], [1, 235, 425]]); await touch('touchEnd', []); await frame();
  assert.ok(await page.evaluate(() => __app.state.viewState.zoom > 1)); assert.deepEqual(await snapshot(), touchBefore);
  await page.evaluate(() => { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new DOMException('Denied', 'NotAllowedError'); } } }); });
  await click('#quick-camera'); await page.waitForFunction(() => document.getElementById('notice').textContent.includes('No se pudo activar'));

  await load('?no-lessons=1'); await select('sensor-luz-ldr'); await advanced(); await click('#mobile-inspect');
  assert.equal(await page.$$eval('#learning-choices button', (buttons) => buttons.length), 0);
  assert.equal(await page.$eval('#learning-card', (card) => card.hidden), false);
  console.log('PASS: HUD progresivo, cinco acciones rápidas, exclusión de paneles, foco/Escape, controles sin arrastrar, conectores rectos con oclusión 3D por profundidad, modelos/materiales, retos, importación/deshacer, zoom/giro y gestos táctiles, 320/390/844/1280 px.');
  console.log('Capturas:', artifacts);
}).catch((error) => { console.error(error); process.exit(1); });
