const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');
run(async ({ page, frame, close, artifacts }) => {
  const arrows = () => page.$$eval('#gear-direction-arrows > g', groups => groups.filter(g => getComputedStyle(g).display !== 'none').map(g => ({ index: +g.dataset.gear, sign: +g.dataset.sign, arcs: [...g.querySelectorAll('.direction-arc')].map(p => p.getAttribute('d')), heads: [...g.querySelectorAll('.direction-head')].map(p => p.getAttribute('d')) })));
  assert.equal(await page.evaluate(() => __app.gearDirections.enabled), false, 'direction arrows start hidden');
  assert.equal(await page.$eval('#gear-direction-arrows', e => getComputedStyle(e).display), 'none');
  await page.click('#gear-quick'); await page.click('#gear-hub-more');
  assert.equal(await page.$eval('#gear-hub-direction', e => e.getAttribute('aria-pressed')), 'false');
  await page.click('#gear-hub-direction'); await close(); await frame();
  for (const type of ['rectos', 'conicos', 'helicoidales', 'transmision']) {
    await close(); await page.evaluate(async type => __app.gears.selectModel('engranajes-' + type), type); await frame();
    const records = await arrows(), expected = type === 'transmision' ? [1, -1, 1, -1] : [1, -1];
    assert.deepEqual(records.map(r => r.sign), expected);
    for (const record of records) {
      assert.equal(record.arcs.length, 2); assert.equal(record.heads.length, 2);
      for (const d of [...record.arcs, ...record.heads]) assert.ok(d && !/NaN|Infinity/.test(d));
      const nums = record.arcs[0].match(/[-+]?[0-9]*\.?[0-9]+/g).map(Number);
      assert.ok(Math.max(...nums.filter((_, i) => !(i % 2))) - Math.min(...nums.filter((_, i) => !(i % 2))) > 12, 'arrow visible at model scale');
    }
    await page.screenshot({ path: path.join(artifacts, 'giro-' + type + '.png') });
    await page.click('#gear-toggle');
    await page.evaluate(() => { __app.gears.suspend(); __app.gears.updateFrame(1000); __app.gears.updateFrame(1100); __app.loop.renderFrame(); });
    assert.notDeepEqual((await arrows()).map(r => r.arcs), records.map(r => r.arcs), 'arrows follow actual gear phase');
    await page.click('#gear-toggle');
    const paused = await arrows(); await frame(); assert.deepEqual(await arrows(), paused, 'paused arrows stay still');
    await page.click('#gear-quick'); await page.click('#gear-hub-more'); await page.click('#gear-hub-reverse'); await close(); await frame();
    assert.deepEqual((await arrows()).map(r => r.sign), expected.map(sign => -sign));
  }
  await page.click('#gear-quick'); await page.click('#gear-hub-more');
  await page.click('#gear-hub-direction'); assert.equal(await page.$eval('#gear-direction-arrows', e => getComputedStyle(e).display), 'none');
  await page.click('#gear-hub-direction'); await close(); await frame();
  await page.click('#toggle-telemetry'); await frame();
  assert.notEqual(await page.$eval('#gear-direction-arrows', e => getComputedStyle(e).display), 'none', 'direction indicators are independent of numeric HUD');
  await page.click('#toggle-telemetry');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await frame();
  const still = await arrows(); await page.click('#gear-toggle');
  await page.evaluate(() => { __app.gears.suspend(); __app.gears.updateFrame(2000); __app.gears.updateFrame(2100); __app.loop.renderFrame(); });
  assert.deepEqual(await arrows(), still, 'reduced-motion mode keeps directional guides static');
  await page.click('#gear-toggle'); await page.emulateMediaFeatures([]);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1280, 390, 320]) {
    await page.setViewport({ width, height: width === 1280 ? 900 : 780, isMobile: true, hasTouch: true }); await frame();
    assert.equal((await arrows()).length, 4);
    const audit = await page.evaluate(async () => (await axe.run('#gear-direction-arrows')).violations.map(v => v.id)); assert.deepEqual(audit, []);
    await page.screenshot({ path: path.join(artifacts, 'giro-' + width + '.png') });
  }
  await page.evaluate(() => { const item = __app.state.chosen; __app.gears.restore(item, { ...item.mechanism.state, isolated: 3, separation: .4 }); __app.loop.renderFrame(); });
  assert.deepEqual((await arrows()).map(r => r.index), [3]);
  await page.click('#hud-toggle'); await frame(); assert.equal(await page.$eval('#gear-direction-arrows', e => getComputedStyle(e).display), 'none');
  console.log('PASS: large local-axis arrows, actual motion and reversal, conical planes, four-axis train, independent visibility, pause, isolation, reduced motion and accessible 320/390/1280px display.');
}).catch(e => { console.error(e); process.exitCode = 1; });
