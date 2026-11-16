const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');
run(async ({ page, click, close, frame, artifacts }) => {
  assert.equal(await page.evaluate(() => __app.state.hudSurface), null);
  assert.equal(await page.$eval('#workspace-panel', e => e.hidden), true);
  assert.equal(await page.$$eval('dialog[open]', es => es.length), 0);
  await page.click('#gear-quick');
  assert.equal(await page.$eval('#gear-inline', e => e.hidden), true, 'settings open the shared workshop');
  await page.$eval('#class-rpm', e => { e.value = '30'; e.dispatchEvent(new Event('input')); });
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.system.teeth), [15, 30], 'RPM alone preserves original teeth');
  assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.rpm), 30);
  await click('#class-custom-quantity');
  await page.$eval('#class-teeth-1', e => e.value = '24'); await page.$eval('#class-teeth-2', e => e.value = '36');
  await click('#class-apply');
  await page.waitForFunction(() => __app.state.pendingLoads === 0 && __app.state.chosen.mechanism.design?.teeth.join(',') === '24,36');
  assert.equal(await page.evaluate(() => __app.state.hudSurface), 'gear-center');
  await page.$eval('#class-rpm', e => { e.value = '999'; e.dispatchEvent(new Event('input')); });
  assert.equal(await page.$eval('#class-rpm', e => e.getAttribute('aria-invalid')), 'true');
  assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.rpm), 30);
  await page.$eval('#class-rpm', e => { e.value = '30'; e.dispatchEvent(new Event('input')); });
  await click('#center-learn-tab'); await click('#class-speed-tab');
  await click('#center-scenes-tab');
  await page.$eval('#project-name', e => e.value = 'Clase organizada');
  await click('#save-project');
  await page.waitForFunction(() => document.querySelector('#project-message').textContent.includes('guardada'));
  await click('#center-controls-tab');
  assert.equal(await page.$eval('#class-teeth-1', e => e.value), '24');
  await click('#center-learn-tab');
  assert.equal(await page.$eval('#class-speed-tab', e => e.getAttribute('aria-pressed')), 'true');
  await click('#center-scenes-tab');
  assert.equal(await page.$eval('#project-name', e => e.value), 'Clase organizada');
  const saved = await page.evaluate(() => __app.projects.capture());
  await page.evaluate(async data => __app.projects.restore(data), saved);
  assert.equal(await page.evaluate(() => __app.state.hudSurface), 'gear-center');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'project-name');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => __app.state.hudSurface), null);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'gear-quick');
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const size of [{ width: 1280, height: 900 }, { width: 390, height: 780 }, { width: 320, height: 780 }, { width: 844, height: 390 }]) {
    await page.setViewport({ ...size, isMobile: true, hasTouch: true }); await close(); await frame();
    const model = await page.evaluate(() => { const item = __app.state.chosen; return item.mesh.localToWorld(item.localBounds.getCenter(new __THREE.Vector3())).project(__app.engine.camera).toArray(); });
    const dock = await page.$eval('#gear-dock', e => e.getBoundingClientRect().toJSON());
    assert.ok(dock.left >= 0 && dock.right <= size.width && dock.top >= 0 && dock.bottom <= size.height);
    const center = { x: (model[0] + 1) * size.width / 2, y: (1 - model[1]) * size.height / 2 };
    assert.ok(center.y < dock.top || center.y > dock.bottom || center.x < dock.left || center.x > dock.right, 'dock leaves model center free');
    await page.screenshot({ path: path.join(artifacts, 'gear-dock-' + size.width + '.png') });
    await page.click('#gear-quick');
    for (const section of ['controls', 'learn', 'scenes']) {
      await click('#center-' + section + '-tab');
      const bounds = await page.$eval('#gear-center', e => e.getBoundingClientRect().toJSON());
      assert.ok(bounds.left >= 0 && bounds.right <= size.width && bounds.top >= 0 && bounds.bottom <= size.height, 'workshop inside screen');
      assert.equal(await page.$$eval('dialog[open]', es => es.length), 1);
      const audit = await page.evaluate(async () => (await axe.run('#gear-center', {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
      assert.deepEqual(audit, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(artifacts, 'gear-center-' + section + '-' + size.width + '.png') });
    }
    await page.focus('#center-controls-tab'); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'center-learn-tab');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'center-scenes-tab');
  }
  await page.setViewport({ width: 320, height: 780, isMobile: true, hasTouch: true });
  for (const section of ['controls', 'learn', 'scenes']) {
    await click('#center-' + section + '-tab');
    await page.evaluate(key => document.querySelectorAll('#center-' + key + ' details').forEach(d => { d.open = true; }), section);
    const audit = await page.evaluate(async () => (await axe.run('#gear-center', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    assert.deepEqual(audit, [], 'expanded ' + section);
    const dimensions = await page.$eval('.gear-center-body', e => ({ scroll: e.scrollWidth, width: e.clientWidth }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, 'expanded tools stay within the panel: ' + section);
  }
  console.log('PASS: model-first startup, single workshop, persistent controls/lessons/scenes, save/restore, validation, Escape, keyboard tabs, expanded tools, axe and portrait/landscape layouts.');
}).catch(error => { console.error(error); process.exitCode = 1; });
