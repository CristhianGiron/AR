const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');
run(async ({ page, click, artifacts, close }) => {
  assert.equal(await page.evaluate(() => __app.state.hudSurface), null);
  await page.click('#gear-quick');
  await click('#class-custom-quantity');
  await click('[data-class-teeth="20,40"]');
  await page.waitForFunction(() => __app.state.pendingLoads === 0 && __app.state.chosen.mechanism.design?.teeth[0] === 20);
  await click('#center-learn-tab');
  assert.match(await page.$eval('#class-ratio-formula', e => e.textContent), /40 \/ 20 = 2/);
  await click('#center-controls-tab');
  await page.$eval('#class-rpm', e => { e.value = '100'; e.dispatchEvent(new Event('input')); });
  await click('#gear-play'); assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.running), true);
  await click('#gear-play'); assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.running), false);
  await click('#center-learn-tab'); await click('#class-speed-tab');
  assert.match(await page.$eval('#class-speed-formula', e => e.textContent), /100 \/ 2 = 50 rpm/);
  await click('#class-torque-tab');
  assert.match(await page.$eval('#class-torque-result', e => e.textContent), /5 N·m/);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1280, 390, 320]) {
    await page.setViewport({ width, height: width === 1280 ? 900 : 780, isMobile: true, hasTouch: true });
    for (const topic of ['ratio', 'speed', 'torque']) {
      await click('#class-' + topic + '-tab');
      const audit = await page.evaluate(async () => (await axe.run('#gear-center', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
      assert.deepEqual(audit, []);
      await page.screenshot({ path: path.join(artifacts, 'class-' + topic + '-' + width + '.png') });
    }
    await click('#center-controls-tab'); await click('#gear-play');
    assert.equal(await page.evaluate(() => __app.state.hudSurface), 'gear-center');
    await click('#gear-play'); await click('#center-learn-tab');
    assert.equal(await page.$eval('#class-torque-tab', e => e.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await click('#center-controls-tab');
  for (const teeth of ['30,30', '40,20']) {
    await click('[data-class-teeth="' + teeth + '"]');
    await page.waitForFunction(expected => __app.state.pendingLoads === 0 && __app.state.chosen.mechanism.design.teeth.join(',') === expected, {}, teeth);
  }
  await page.$eval('#class-teeth-1', e => e.value = '12'); await click('#class-apply');
  await page.waitForFunction(() => !document.querySelector('#class-error').hidden);
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.design.teeth), [40, 20]);
  await page.$eval('#class-teeth-1', e => e.value = '24'); await page.$eval('#class-teeth-2', e => e.value = '36'); await click('#class-apply');
  await page.waitForFunction(() => __app.state.pendingLoads === 0 && __app.state.chosen.mechanism.design.teeth.join(',') === '24,36');
  await close();
  console.log('PASS: unified classroom, presets, validation, 100→50 rpm, 5 N·m, persistent tabs and axe at 320/390/1280px.');
}).catch(error => { console.error(error); process.exitCode = 1; });
