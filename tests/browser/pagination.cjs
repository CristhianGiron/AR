const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
run(async ({ page, artifacts, catalog, root, click, close, openMenuAction, select, advanced, frame }) => {
  await page.evaluate((catalog) => {
    __app.state.catalog = __app.assets.validateCatalog(catalog); __app.library.renderCatalog();
  }, catalog);
  let pagesChecked = 0;
  async function walk(id) {
    await page.evaluate((id) => __app.pagination.refresh(document.getElementById(id), true), id);
    const count = await page.$eval('#' + id, (element) => Number(element.dataset.pageCount));
    for (let i = 0; i < count; i++) {
      const result = await page.$eval('#' + id, (surface) => {
        const body = surface.querySelector(':scope > .page-body').getBoundingClientRect();
        const rect = surface.getBoundingClientRect();
        const bad = [...surface.querySelectorAll('.page-content button, .page-content input, .page-content select, .page-content textarea')]
          .filter((element) => element.getClientRects().length && !element.closest('[hidden], [inert]') && getComputedStyle(element).visibility !== 'hidden')
          .filter((element) => {
            for (let p = element.parentElement; p !== surface; p = p.parentElement) if (p.tagName === 'DETAILS' && !p.open && !p.querySelector(':scope > summary')?.contains(element)) return false;
            return true;
          }).map((element) => ({ id: element.id || element.textContent.slice(0, 20), rect: element.getBoundingClientRect().toJSON() }))
          .filter(({ rect }) => rect.top < body.top - 1 || rect.bottom > body.bottom + 1);
        const scrollable = [surface, ...surface.querySelectorAll('*')].filter((element) => {
          const style = getComputedStyle(element);
          return ['auto', 'scroll'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
        }).map((element) => element.id || element.className);
        const arrows = [...surface.querySelectorAll(':scope > .page-navigation:not([hidden]) button')].map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
        const topInset = surface.querySelector(':scope > .page-body > .page-clip').getBoundingClientRect().top - body.top;
        return { bad, scrollable, arrows, topInset, body: body.toJSON(), bounds: rect.toJSON(), viewport: rect.top >= -1 && rect.bottom <= innerHeight + 1, page: surface.dataset.pageIndex };
      });
      if (id !== 'workspace-panel') assert.ok(result.topInset >= 9.5, id + ': padding superior en página ' + (i + 1));
      assert.deepEqual(result.scrollable, [], id + ': sin desplazamiento vertical');
      assert.ok(await page.$eval('#' + id + ' .page-context', (element) => element.textContent.trim().length > 0), id + ': sección identificada');
      if (result.bad.length) { console.log(id, result); await page.screenshot({ path: path.join(artifacts, 'pagination-debug.png') }); }
      assert.deepEqual(result.bad, [], id + ': controles completos en la página ' + i);
      assert.ok(result.arrows.every((arrow) => Math.abs(arrow.width - 44) < 1 && Math.abs(arrow.height - 44) < 1), id + ': flechas compactas de 44 px');
      assert.ok(result.viewport, id + ': dentro de la pantalla');
      pagesChecked++;
      if (i < count - 1) await page.click('#' + id + ' > .page-navigation > button:last-child');
    }
    if (count > 1) {
      await page.click('#' + id + ' > .page-navigation > button:first-child');
      assert.equal(await page.$eval('#' + id, (element) => Number(element.dataset.pageIndex)), count - 2);
    }
  }
  for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await close(); await page.setViewport({ ...viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await frame();
    if (await page.$eval('#workspace-panel', (element) => element.hidden)) await click('#workspace-toggle');
    await walk('workspace-panel');
    await openMenuAction('explore'); await walk('library');
    await click('#manual-upload summary'); await walk('library');
    await openMenuAction('my-scene');
    await page.evaluate(() => {
      const list = document.getElementById('scene-list');
      while (list.children.length < 20) list.append(list.firstElementChild.cloneNode(true));
    });
    await walk('scene-panel');
    await page.evaluate(() => __app.interface.rebuild());
    await select('sensor-luz-ldr'); await click('#object-inspect'); await walk('inspector');
    const summary = await page.$eval('#object-description', (element) => element.textContent);
    await page.$eval('#object-description', (element) => { element.textContent = 'Observa el modelo y describe sus partes. '.repeat(30); });
    await walk('inspector');
    await page.$eval('#object-description', (element, summary) => { element.textContent = summary; }, summary);
    await click('#learning-quiz-tab'); await walk('challenge');
    await click('.learning-choice'); await walk('challenge');
    await click('#open-technical'); await walk('technical');
    await advanced();
    for (const id of ['precision-details', 'numeric-controls', 'backup-controls', 'scene-maintenance']) {
      await page.$eval('#' + id, (element) => { element.open = true; });
    }
    await walk('panel');
    const grouping = await page.evaluate(() => {
      const location = (id) => __app.pagination.locate(document.getElementById(id)).target;
      return [location('object-size-number') === location('size'), location('label-height-number') === location('height')];
    });
    assert.ok(grouping.every(Boolean), 'Los números y sus sliders comparten página');
    await close(); await click('#help'); await walk('help-panel');
    await close(); await click('#view-controls-toggle'); await click('#collection-rotate'); await walk('collection-controls');
    await click('#collection-mode');
    await page.screenshot({ path: path.join(artifacts, 'pagination-' + viewport.width + '.png') });
  }
  await openMenuAction('add-shortcut');
  assert.equal(await page.$eval('#manual-upload', (element) => element.open), true);
  assert.equal(await page.$eval('#local-file', (element) => !!element.closest('[inert]')), false);
  await click('#import-local');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'local-file', 'La validación abre la página del campo requerido');
  await (await page.$('#local-file')).uploadFile(path.join(root, 'modelos-3d/FOTORESISTENCIA.glb'));
  await page.$eval('#local-name', (element) => { element.value = ''; });
  await click('#import-local');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'local-name');
  assert.equal(await page.$('#camera'), null, 'Sin botón grande de cámara duplicado');
  console.log('PASS: ' + pagesChecked + ' páginas recorridas con flechas, sin barras verticales ni controles recortados, biblioteca completa, fichas, ayuda, ajustes, importación y vista conjunta a 320/390/844/1280 px.');
}).catch((error) => { console.error(error); process.exitCode = 1; });
