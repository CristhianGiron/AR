const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');

run(async ({ page, click, frame, close, artifacts }) => {
  await page.evaluate(() => __app.gearClass.open());
  // Desktop data is visible beside the docked classroom, without opening another panel.
  await frame();
  const cards = () => page.evaluate(() => [...document.querySelectorAll('.gear-readout')].filter(e => !e.hidden).map(e => ({ text: e.textContent, rect: e.getBoundingClientRect().toJSON() })));
  assert.equal((await cards()).length, 2);
  assert.deepEqual(await page.$$eval('.readout-speed strong', es => es.map(e => e.textContent)), ['0', '0']);
  await click('#center-controls-tab');
  await page.$eval('#class-rpm', e => { e.value = '100'; e.dispatchEvent(new Event('input')); });
  await click('#gear-play'); await frame();
  assert.deepEqual(await page.$$eval('.readout-speed strong', es => es.map(e => e.textContent)), ['100', '50']);
  assert.match((await cards())[0].text, /10,47 rad\/s/);
  const first = await page.$eval('.readout-angle', e => e.textContent);
  await page.evaluate(() => { __app.gears.suspend(); __app.gears.updateFrame(1000); __app.gears.updateFrame(1100); __app.loop.renderFrame(); });
  assert.notEqual(await page.$eval('.readout-angle', e => e.textContent), first);
  await click('#gear-reverse'); await frame();
  assert.match((await cards())[0].text, /↻/); assert.match((await cards())[1].text, /↺/);
  await click('#gear-play'); await frame();
  assert.deepEqual(await page.$$eval('.readout-speed strong', es => es.map(e => e.textContent)), ['0', '0']);
  await page.click('#toggle-telemetry'); assert.equal(await page.$eval('#gear-telemetry', e => e.hidden), true);
  await page.click('#toggle-telemetry'); await frame(); assert.equal((await cards()).length, 2);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  for (const width of [1280, 390, 320]) {
    await page.setViewport({ width, height: width === 1280 ? 900 : 780, isMobile: true, hasTouch: true });
    await close(); await frame();
    const headerControls = await page.$$eval('#header .header-actions button', es => es.filter(e => e.getClientRects().length && getComputedStyle(e).display !== 'none').map(e => e.getBoundingClientRect().toJSON()));
    for (const control of headerControls) assert.ok(control.left >= 0 && control.right <= width, 'header control inside viewport at ' + width);
    const labels = await cards(); assert.equal(labels.length, 2, 'two readable labels at ' + width);
    assert.equal(overlap(labels[0].rect, labels[1].rect), 0, 'labels do not overlap');
    for (const label of labels) {
      assert.ok(label.rect.left >= 0 && label.rect.right <= width && label.rect.top >= 0 && label.rect.bottom <= (width === 1280 ? 900 : 780));
      const obstacles = await page.evaluate(() => ['header', 'bar', 'gear-transport'].map(id => document.getElementById(id)).filter(e => !e.hidden).map(e => e.getBoundingClientRect().toJSON()));
      for (const obstacle of obstacles) assert.equal(overlap(label.rect, obstacle), 0);
    }
    const connectors = await page.$$eval('#gear-telemetry-lines path', es => es.map(e => e.getAttribute('d')));
    await page.evaluate(() => { __app.state.viewState.y += 25; __app.loop.renderFrame(); });
    const changed = await page.$$eval('#gear-telemetry-lines path', es => es.map(e => e.getAttribute('d')));
    assert.notDeepEqual(changed, connectors, 'connectors follow 3D view rotation');
    const audit = await page.evaluate(async () => (await axe.run('#gear-telemetry')).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    assert.deepEqual(audit, []);
    await page.evaluate(() => { __app.gearClass.run(); __app.loop.renderFrame(); });
    await page.screenshot({ path: path.join(artifacts, 'gear-hud-' + width + '.png') });
    await page.evaluate(() => { __app.gearClass.run(); __app.loop.renderFrame(); });
    await page.evaluate(() => __app.gearClass.open()); await frame();
    if (width < 1100) assert.equal(await page.$eval('#gear-telemetry', e => e.hidden), true, 'modal panels hide overlays');
  }
  await close();
  const isolation = await page.evaluate(() => {
    const item = __app.state.chosen;
    __app.gears.restore(item, { ...item.mechanism.state, isolated: 1, separation: 1 }); __app.loop.renderFrame();
    return [...document.querySelectorAll('.gear-readout')].map(e => e.hidden);
  }); assert.deepEqual(isolation, [true, false]);
  await page.evaluate(() => { __app.interface.select(null); __app.loop.renderFrame(); });
  assert.equal(await page.$eval('#gear-telemetry', e => e.hidden), true);
  console.log('PASS: model HUD actual vs set RPM, angular speed/angle and reversal, 3D connectors, label collision avoidance, isolation, visibility toggle, modal suppression, axe and 320/390/1280px.');
}).catch(error => { console.error(error); process.exitCode = 1; });
