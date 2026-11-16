const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');
run(async ({ page, click, close, frame, artifacts }) => {
  const panel = '#class-model-options ', quick = '#gear-model-switcher ';
  const button = (prefix, type) => prefix + '[data-gear-select="engranajes-' + type + '"]';
  const ready = (type) => page.waitForFunction(type => __app.state.pendingLoads === 0 && __app.state.chosen?.type === 'engranajes-' + type, {}, type);
  // A failed first download must keep the original selection and entries.
  const failure = await page.evaluate(async () => {
    const item = __app.state.chosen, loader = __app.models.loadModel, generation = __app.state.sceneGeneration;
    __app.models.loadModel = async () => { throw new Error('Carga de prueba fallida'); };
    let rejected = false;
    try { await __app.gears.selectModel('engranajes-conicos'); } catch { rejected = true; }
    finally { __app.models.loadModel = loader; }
    return { rejected, chosen: item === __app.state.chosen, count: __app.state.entries.length, generation: generation === __app.state.sceneGeneration, pending: __app.state.pendingLoads };
  }); assert.deepEqual(failure, { rejected: true, chosen: true, count: 1, generation: true, pending: 0 });
  // Personalize the spur pair before changing models.
  await page.evaluate(async () => {
    await __app.gearDesigner.replace({ version: 1, teeth: [24, 36], module: 2, width: 8, bore: 4 });
    __app.gearClass.open();
    const item = __app.state.chosen; item.mechanism.state.rpm = 30; __app.gears.restore(item, { ...item.mechanism.state, angle: .9 });
    window.__originalSpur = item; __app.loop.renderFrame();
  });
  assert.equal(await page.$eval(button(panel, 'conicos'), e => e.disabled), false, 'selectors re-enable after generating teeth');
  await click('#class-speed-tab');
  await click(button(panel, 'conicos')); await ready('conicos');
  assert.equal(await page.evaluate(() => __app.state.hudSurface), 'gear-center');
  assert.equal(await page.$eval('#class-speed-tab', e => e.getAttribute('aria-pressed')), 'true');
  assert.match(await page.$eval('#class-direction', e => e.textContent), /perpendiculares/);
  await click(button(panel, 'helicoidales')); await ready('helicoidales');
  await click(button(panel, 'rectos')); await ready('rectos');
  const restored = await page.evaluate(() => ({ same: __app.state.chosen === __originalSpur, teeth: __app.state.chosen.mechanism.design.teeth, rpm: __app.state.chosen.mechanism.state.rpm, angle: __app.state.chosen.mechanism.state.angle, count: __app.state.entries.length }));
  assert.deepEqual(restored, { same: true, teeth: [24, 36], rpm: 30, angle: .9, count: 3 });
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1280, 390, 320]) {
    await page.setViewport({ width, height: width === 1280 ? 900 : 780, isMobile: true, hasTouch: true });
    await close(); await frame();
    for (const type of ['conicos', 'helicoidales', 'rectos']) {
      await page.click(button(quick, type)); await ready(type); await frame();
      assert.equal(await page.evaluate(() => __app.state.hudSurface), null, 'switches without opening menus');
      assert.equal(await page.$$eval('#gear-model-switcher [aria-pressed=true]', es => es.length), 1);
    }
    const rects = await page.$$eval('#gear-model-switcher button', es => es.map(e => e.getBoundingClientRect().toJSON()));
    for (const r of rects) assert.ok(r.left >= 0 && r.right <= width && r.height >= 44, 'visible touch targets at ' + width);
    assert.equal(await page.evaluate(() => __app.state.entries.length), 3, 'switching reuses existing models');
    const audit = await page.evaluate(async () => (await axe.run('#gear-model-switcher')).violations.map(v => v.id)); assert.deepEqual(audit, []);
    await page.screenshot({ path: path.join(artifacts, 'gear-switcher-' + width + '.png') });
    await page.evaluate(() => __app.gearClass.open()); await click(button(panel, 'conicos')); await ready('conicos');
    assert.equal(await page.evaluate(() => __app.state.hudSurface), 'gear-center');
  }
  console.log('PASS: one-touch model switches in classroom/canvas at 320/390/1280px; preserves custom teeth, speed, phase and lesson; no duplicates; failure preserves scene; accessible controls.');
}).catch(error => { console.error(error); process.exitCode = 1; });
