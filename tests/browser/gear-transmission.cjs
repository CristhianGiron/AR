const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');
run(async ({ page, click, close, frame, artifacts, load }) => {
  const choose = async id => {
    await page.click('#gear-model-switcher [data-gear-select="' + id + '"]');
    await page.waitForFunction(id => __app.state.pendingLoads === 0 && __app.state.chosen?.type === id, { timeout: 60000 }, id);
    await frame();
  };
  await choose('engranajes-transmision');
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.system.partTeeth), [[26], [26, 18], [13], [18]]);
  assert.deepEqual(await page.$$eval('#gear-piece option', es => es.map(e => e.value)), ['0', '1', '2', '3']);
  await page.click('#gear-quick');
  await page.click('#gear-hub-rpm');
  await page.$eval('#class-rpm', e => { e.value = '26'; e.dispatchEvent(new Event('input')); });
  await page.click('#gear-hub-play'); await frame();
  assert.equal(await page.$eval('#gear-context', e => e.hidden), true, 'another action dismisses the floating card');
  assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.running), true);
  await close(); await frame();
  assert.deepEqual(await page.$$eval('.readout-speed strong', es => es.map(e => e.textContent)), ['26', '26', '36', '26']);
  const stability = await page.evaluate(() => {
    const item = __app.state.chosen, mechanism = item.mechanism, samples = [];
    for (let n = 0; n <= 48; n++) {
      __app.gears.restore(item, { ...mechanism.state, angle: n * Math.PI / 12 }); __app.loop.renderFrame();
      samples.push({ camera: __app.engine.camera.position.clone(), axes: mechanism.parts.map(p => p.pivot.getWorldPosition(new __THREE.Vector3())) });
    }
    return { camera: Math.max(...samples.map(s => s.camera.distanceTo(samples[0].camera))), axes: Math.max(...samples.flatMap(s => s.axes.map((p, i) => p.distanceTo(samples[0].axes[i])))) };
  });
  assert.ok(stability.camera < 1e-9 && stability.axes < 1e-9, 'axes and camera stay fixed throughout two input turns');
  await page.click('#gear-quick'); await page.click('#gear-hub-more'); await page.click('#gear-hub-separate');
  await page.$eval('#gear-separation', e => { e.value = '65'; e.dispatchEvent(new Event('input')); });
  assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.separation), .65);
  assert.equal(await page.$eval('#gear-hub-play', e => e.disabled), true);
  const home = await page.evaluate(() => __app.state.chosen.mechanism.parts.map(p => p.pivot.position.toArray()));
  await page.screenshot({ path: path.join(artifacts, 'transmision-separada.png') });
  await page.click('#gear-context-close'); await page.click('#gear-hub-piece');
  await page.select('#gear-piece', '3'); await click('#gear-isolate'); await page.click('#gear-hub-step');
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.parts.map(p => p.pivot.visible)), [false, false, false, true]);
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.state.offsets.slice(0, 3)), [0, 0, 0]);
  assert.notEqual(await page.evaluate(() => __app.state.chosen.mechanism.state.offsets[3]), 0);
  const saved = await page.evaluate(() => __app.projects.capture());
  await page.evaluate(async data => __app.projects.restore(data), saved);
  assert.deepEqual(await page.evaluate(() => __app.projects.capture()), saved);
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.parts.map(p => p.pivot.position.toArray())), home);
  await close(); await load(); await page.evaluate(async data => __app.projects.restore(data), saved);
  assert.deepEqual(await page.evaluate(() => __app.projects.capture()), saved, 'four-axis state survives a page reload');
  await page.click('#gear-quick'); await page.click('#gear-hub-more'); await page.click('#gear-hub-assemble');
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.state.offsets), [0, 0, 0, 0]);
  assert.ok(await page.evaluate(() => __app.state.chosen.mechanism.parts.every(p => p.pivot.position.equals(p.home))));
  await page.click('#gear-hub-reverse'); await page.click('#gear-hub-play'); await frame();
  assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.direction), -1);
  await page.click('#gear-hub-play');
  await page.click('#center-learn-tab'); await page.click('#gear-hub-ratio');
  assert.match(await page.$eval('#class-ratio-formula', e => e.textContent), /26\/26.*13\/18.*18\/13/);
  await page.click('#gear-context-close'); await page.click('#gear-hub-speed');
  assert.match(await page.$eval('#class-direction', e => e.textContent), /sentido contrario/);
  assert.match(await page.$eval('#class-output', e => e.textContent), /26 rpm/);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const [width, height] of [[1280, 900], [390, 780], [320, 780], [844, 390]]) {
    await page.setViewport({ width, height, isMobile: true, hasTouch: true });
    await close(); await frame(); await page.click('#gear-quick');
    await page.click('#gear-hub-more'); await page.click('#gear-hub-separate');
    for (const selector of ['#gear-center', '#gear-context']) {
      const r = await page.$eval(selector, e => e.getBoundingClientRect().toJSON());
      assert.ok(r.left >= 0 && r.right <= width + 1 && r.top >= 0 && r.bottom <= height + 1, selector + ': ' + JSON.stringify(r));
    }
    assert.equal(await page.evaluate(() => __app.hud.isBlocking()), false, 'floating controls preserve canvas interaction');
    const audit = await page.evaluate(async () => (await axe.run('#gear-center', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    assert.deepEqual(audit, []);
    await page.screenshot({ path: path.join(artifacts, 'transmision-botones-' + width + '.png') });
    await page.click('#header .brand');
    assert.equal(await page.$eval('#gear-context', e => e.hidden), true);
    assert.equal(await page.$eval('#gear-more-actions', e => e.hidden), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await close(); await choose('engranajes-rectos');
  assert.equal(await page.$$eval('.gear-readout:not([hidden])', es => es.length), 2, 'returning to a pair hides the intermediate axis labels');
  await choose('engranajes-transmision');
  assert.equal(await page.evaluate(() => __app.state.entries.filter(i => i.type === 'engranajes-transmision').length), 1);
  console.log('PASS: compound OBJ, 26→26, 18→13 and 13→18 stages, four-axis HUD, stable motion, separation, isolation, independent step, reverse, assembly, save/reload, floating controls, outside close and responsive accessibility.');
}).catch(error => { console.error(error); process.exitCode = 1; });
