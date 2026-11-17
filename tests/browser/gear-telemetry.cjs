const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');

run(async ({ page, frame, close, artifacts }) => {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const cards = () => page.evaluate(() => [...document.querySelectorAll('.gear-readout')].filter(e => !e.hidden).map(e => {
    const dot = document.querySelector('#gear-telemetry-lines circle[data-wheel="' + e.dataset.wheel + '"]');
    return { index: +e.dataset.wheel, density: e.dataset.density, text: e.textContent, bounds: e.getBoundingClientRect().toJSON(), anchor: { x: +dot.getAttribute('cx'), y: +dot.getAttribute('cy') } };
  }));
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const verify = async minimum => {
    const records = await cards(), width = await page.evaluate(() => innerWidth);
    assert.ok(records.length >= minimum, 'expected nearby readable labels: ' + records.length);
    const obstacles = await page.evaluate(() => ['header', 'workspace-panel', 'bar', 'gear-transport', 'gear-model-switcher', 'gear-inline', 'gear-context', 'tools', 'class-return', 'notice', 'gear-center'].map(id => document.getElementById(id)).filter(e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(e => e.getBoundingClientRect().toJSON()));
    const name = await page.evaluate(() => {
      const tag = __app.state.chosen.tag, point = new __THREE.Vector3(), canvas = __app.engine.canvas.getBoundingClientRect();
      if (!tag.visible) return null;
      tag.updateWorldMatrix(true, false);
      const corners = [0, 1, 2, 3].map(i => {
        point.set((i & 1) - .5, (i >> 1) - .5, 0).applyMatrix4(tag.matrixWorld).project(__app.engine.camera);
        return { x: canvas.left + (point.x + 1) * canvas.width / 2, y: canvas.top + (1 - point.y) * canvas.height / 2 };
      });
      return { left: Math.min(...corners.map(p => p.x)) - 4, right: Math.max(...corners.map(p => p.x)) + 4, top: Math.min(...corners.map(p => p.y)) - 4, bottom: Math.max(...corners.map(p => p.y)) + 4 };
    });
    if (name) obstacles.push(name);
    for (const record of records) {
      const b = record.bounds, p = record.anchor;
      assert.ok(b.left >= 0 && b.right <= width + 1 && b.top >= 0 && b.bottom <= await page.evaluate(() => innerHeight) + 1);
      const geometry = await page.evaluate(index => ({ own: __app.gearTelemetry.layout.input.labels.find(label => label.index === index).footprint, models: __app.gearTelemetry.layout.input.modelBounds }), record.index);
      const own = geometry.own;
      const distance = Math.hypot(Math.max(b.left - own.right, own.left - b.right, 0), Math.max(b.top - own.bottom, own.top - b.bottom, 0));
      assert.ok(distance <= (width <= 600 ? 113 : 129), 'callout remains near the model edge: ' + record.index + ': ' + distance);
      for (const model of geometry.models) assert.ok(overlap(b, model) < 1, 'callout must leave every projected wheel clear');
      const route = await page.$eval('#gear-telemetry-lines path[data-wheel="' + record.index + '"]', e => e.getAttribute('d').match(/[-+]?[0-9]*\.?[0-9]+/g).map(Number));
      assert.ok(route.length >= 6, 'the rendered leader has elbows');
      let bent = false;
      for (let i = 4; i < route.length; i += 2) if (Math.abs((route[i - 2] - route[i - 4]) * (route[i + 1] - route[i - 1]) - (route[i - 1] - route[i - 3]) * (route[i] - route[i - 2])) > .1) bent = true;
      assert.ok(bent, 'rendered elbows change direction');
      for (const other of records) if (record.index !== other.index) assert.ok(overlap(b, other.bounds) < 1, 'labels stay separate');
      for (const obstacle of obstacles) assert.ok(overlap(b, obstacle) < 1, 'labels avoid tools');
      assert.match(record.text, /ω.*rad\/s.*θ/);
      assert.match(record.text, /Ajuste|simulación/);
    }
    return records;
  };
  await frame(); await verify(2);
  await page.click('#gear-quick'); await page.click('#gear-hub-rpm');
  await page.$eval('#class-rpm', e => { e.value = '100'; e.dispatchEvent(new Event('input')); });
  await page.click('#gear-hub-play'); await close(); await frame();
  assert.deepEqual(await page.$$eval('.readout-speed strong', es => es.map(e => e.textContent)), ['100', '50']);
  assert.match((await cards())[0].text, /10,47 rad\/s/);
  const stationary = await cards();
  for (let n = 1; n <= 6; n++) {
    await page.evaluate(n => { __app.gears.suspend(); __app.gears.updateFrame(n * 1000); __app.gears.updateFrame(n * 1000 + 80); __app.loop.renderFrame(); }, n);
    const next = await cards();
    assert.deepEqual(next.map(c => [c.index, c.bounds.left, c.bounds.top, c.density]), stationary.map(c => [c.index, c.bounds.left, c.bounds.top, c.density]), 'the motor does not reshuffle labels');
  }
  await page.click('#gear-quick'); await page.click('#gear-hub-more'); await page.click('#gear-hub-reverse'); await close(); await frame();
  assert.match((await cards())[0].text, /↻/); assert.match((await cards())[1].text, /↺/);
  await page.click('#gear-toggle'); await frame();
  assert.deepEqual(await page.$$eval('.readout-speed strong', es => es.map(e => e.textContent)), ['0', '0']);
  await page.click('#toggle-telemetry'); assert.equal(await page.$eval('#gear-telemetry', e => e.hidden), true);
  await page.click('#toggle-telemetry'); await frame(); await verify(2);
  for (const type of ['rectos', 'conicos', 'helicoidales', 'transmision']) {
    await close(); await page.evaluate(async type => __app.gears.selectModel('engranajes-' + type), type);
    for (const [width, height] of [[1280, 900], [390, 780], [320, 780], [844, 390]]) {
      await page.setViewport({ width, height, isMobile: true, hasTouch: true });
      await page.evaluate(() => { __app.state.viewState.y = 0; __app.state.viewState.zoom = 1; __app.loop.renderFrame(); });
      const count = type === 'transmision' ? 4 : 2;
      const initial = await verify(width === 844 ? 1 : count);
      if (type === 'transmision' && width === 320) assert.ok(initial.some(c => c.density === 'compact'), 'crowded axes use compact cards before moving away');
      const audit = await page.evaluate(async () => (await axe.run('#gear-telemetry')).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
      assert.deepEqual(audit, []);
      await page.screenshot({ path: path.join(artifacts, 'gear-hud-' + type + '-' + width + '.png') });
      for (const [rotation, zoom] of [[35, .7], [-40, 1.4]]) {
        await page.evaluate(([y, zoom]) => { Object.assign(__app.state.viewState, { y, zoom }); __app.loop.renderFrame(); }, [rotation, zoom]);
        await verify(0);
      }
      await page.evaluate(() => { Object.assign(__app.state.viewState, { y: 0, zoom: 1 }); __app.loop.renderFrame(); });
      await page.click('#gear-quick'); await page.click('#gear-hub-more'); await page.click('#gear-hub-separate'); await frame();
      await verify(0);
      await page.$eval('#gear-separation', e => { e.value = '55'; e.dispatchEvent(new Event('input')); }); await frame(); await verify(0);
      await page.click('#gear-context-close'); await page.click('#gear-hub-assemble'); await close(); await frame();
    }
  }
  const lastIndex = await page.evaluate(() => __app.state.chosen.mechanism.parts.length - 1);
  await page.evaluate(index => { const item = __app.state.chosen; __app.gears.restore(item, { ...item.mechanism.state, isolated: index, separation: .5 }); __app.loop.renderFrame(); }, lastIndex);
  assert.deepEqual((await cards()).map(c => c.index), [lastIndex]);
  await page.evaluate(() => { __app.interface.select(null); __app.loop.renderFrame(); });
  assert.equal(await page.$eval('#gear-telemetry', e => e.hidden), true);
  console.log('PASS: exterior callouts leave wheels clear, bounded model-edge distances, real elbow leaders, compact four-axis packing, stable motor, camera/zoom/separation, HUD values and axe at 320/390/844/1280px.');
}).catch(error => { console.error(error); process.exitCode = 1; });
