const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');

run(async ({ page, click, artifacts, load, close }) => {
  await page.evaluate(() => { document.body.classList.remove('classroom-mode'); __app.hud.close(false); __app.gears.open(); });
  assert.deepEqual(await page.evaluate(() => __app.state.catalog.map((m) => m.id)), ['engranajes-rectos', 'engranajes-conicos', 'engranajes-helicoidales', 'engranajes-transmision']);
  assert.deepEqual(await page.evaluate(() => __app.state.entries.map((m) => m.type)), ['engranajes-rectos']);
  assert.equal(await page.$eval('#gear-center', (e) => e.open), true);
  await click('#gear-play');
  const motion = await page.evaluate(() => {
    const m = __app.state.chosen.mechanism, before = m.state.angle;
    const centers = m.parts.map((p) => p.pivot.position.toArray());
    __app.gears.suspend(); __app.gears.updateFrame(1000); __app.gears.updateFrame(1100);
    return { delta: m.state.angle - before, centers, afterCenters: m.parts.map((p) => p.pivot.position.toArray()), angles: m.parts.map((p) => p.pivot.rotation.z), running: m.state.running };
  });
  assert.equal(motion.running, true); assert.ok(Math.abs(motion.delta - .1 * 12 * Math.PI / 30) < 1e-9); assert.deepEqual(motion.centers, motion.afterCenters);
  assert.ok(Math.abs(motion.angles[1] / motion.angles[0] + .5) < 1e-7);
  await click('#gear-play');
  await click('#gear-explode');
  const separated = await page.evaluate(() => { const m = __app.state.chosen.mechanism; return { running: m.state.running, separation: m.state.separation, positions: m.parts.map((p) => p.pivot.position.toArray()) }; });
  assert.equal(separated.separation, 1); assert.equal(separated.running, false); assert.notDeepEqual(separated.positions, motion.centers);
  assert.equal(await page.$eval('#gear-play', (e) => e.disabled), true);
  const before = await page.evaluate(() => [...__app.state.chosen.mechanism.state.offsets]);
  await click('#gear-step');
  const after = await page.evaluate(() => [...__app.state.chosen.mechanism.state.offsets]);
  assert.notEqual(after[0], before[0]); assert.equal(after[1], before[1]);
  await click('#gear-assemble');
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.parts.map((p) => p.pivot.position.toArray())), motion.centers);
  await click('#gear-reverse'); await click('#gear-step');
  assert.ok(await page.evaluate(() => __app.state.chosen.mechanism.state.angle < 0));
  for (const type of ['engranajes-conicos', 'engranajes-helicoidales']) {
    await page.select('#gear-system', type);
    await page.waitForFunction((type) => __app.state.pendingLoads === 0 && __app.state.chosen?.type === type, {}, type);
    assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.parts.length), 2);
    const stability = await page.evaluate(() => {
      const item = __app.state.chosen, mechanism = item.mechanism;
      const samples = [];
      // Two input turns include a full output turn of the 2:1 helical pair.
      for (let frame = 0; frame <= 48; frame++) {
        __app.gears.restore(item, { ...mechanism.state, angle: frame * Math.PI / 12 });
        __app.loop.renderFrame();
        samples.push({ camera: __app.engine.camera.position.clone(), orientation: __app.engine.camera.quaternion.clone(),
          centers: mechanism.parts.map((part) => part.pivot.getWorldPosition(new __THREE.Vector3())) });
      }
      const first = samples[0];
      __app.gears.reset(item); __app.loop.renderFrame();
      return {
        cameraDrift: Math.max(...samples.map((sample) => sample.camera.distanceTo(first.camera))),
        orientationDrift: Math.max(...samples.map((sample) => sample.orientation.angleTo(first.orientation))),
        axisDrift: Math.max(...samples.flatMap((sample) => sample.centers.map((center, i) => center.distanceTo(first.centers[i])))),
      };
    });
    assert.ok(stability.cameraDrift < 1e-9, type + ': el motor no debe desplazar la cámara: ' + stability.cameraDrift);
    assert.ok(stability.orientationDrift < 1e-7, type + ': encuadre estable durante dos vueltas');
    assert.ok(stability.axisDrift < 1e-9, type + ': ejes fijos durante el giro');
    if (type === 'engranajes-helicoidales') {
      const native = await page.evaluate(() => {
        const m = __app.state.chosen.mechanism, meshes = [];
        __app.state.chosen.mesh.traverse((node) => { if (node.isMesh) meshes.push({ name: node.name, scale: node.scale.toArray() }); });
        return { meshes, centers: m.parts.map((p) => p.home.toArray()), teeth: m.system.teeth, phase: m.system.phase, reading: document.querySelector('#gear-reading').textContent };
      });
      assert.deepEqual(native.meshes, [{ name: 'pinion', scale: [1, 1, 1] }, { name: 'gear', scale: [1, 1, 1] }]);
      assert.deepEqual(native.centers, [[0, 0, 7.5], [56.25, 0, 7.5]]);
      assert.deepEqual(native.teeth, [15, 30]); assert.deepEqual(native.phase, [0, 0]);
      assert.match(native.reading, /Salida: 6.0 rpm/);
    }
    await click('#gear-step'); await click('#gear-explode');
    const geometry = await page.evaluate(() => { const item = __app.state.chosen; return new __THREE.Box3().setFromObject(item.mesh).getSize(new __THREE.Vector3()).toArray(); });
    assert.ok(geometry.every(Number.isFinite));
    await page.screenshot({ path: path.join(artifacts, type + '.png') });
    await click('#gear-assemble');
  }
  await click('#gear-explode');
  await page.evaluate(() => document.querySelector('#gear-piece').closest('details').open = true);
  await page.select('#gear-piece', '1'); await click('#gear-isolate');
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.parts.map((p) => p.pivot.visible)), [false, true]);
  await click('#gear-step');
  const data = await page.evaluate(() => __app.projects.capture());
  await page.evaluate(async (data) => __app.projects.restore(data), data);
  assert.deepEqual(await page.evaluate(() => __app.projects.capture()), data);
  assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.running), false);
  await load(); await page.evaluate(async (data) => __app.projects.restore(data), data);
  assert.deepEqual(await page.evaluate(() => __app.projects.capture()), data);
  // Check the new surface, including compact paging and keyboard reachable controls.
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1280, 390, 320]) {
    await page.setViewport({ width, height: width === 1280 ? 900 : 780, isMobile: true, hasTouch: true });
    await page.evaluate(() => { __app.gears.open(); __app.pagination.refresh(document.querySelector('#gears')); });
    await click('#gear-assemble');
    if (width < 1100) {
      assert.equal(await page.$eval('#gear-center', (e) => e.open), true);
      await close();
      await page.click('#gear-toggle'); assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.running), true);
      await page.click('#gear-toggle');
      await page.screenshot({ path: path.join(artifacts, 'gears-scene-' + width + '.png') });
      await page.click('#gear-quick');
    } else { await click('#gear-play'); await click('#gear-play'); }
    const audit = await page.evaluate(async () => (await axe.run('#gears', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })));
    assert.deepEqual(audit, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'gears-' + width + '.png') }); await close();
  }
  // An empty workspace must still allow choosing the first mechanism again.
  await page.evaluate(() => {
    __app.learning.showAll(); __app.interface.select(null);
    __app.state.entries.forEach(__app.models.disposeItem); __app.state.entries.length = 0;
    __app.interface.rebuild(); __app.gears.open();
  });
  assert.equal(await page.$eval('#gear-system', (e) => e.value), '');
  await page.select('#gear-system', 'engranajes-rectos');
  await page.waitForFunction(() => __app.state.pendingLoads === 0 && __app.state.chosen?.type === 'engranajes-rectos');
  assert.equal(await page.evaluate(() => __app.state.entries.length), 1);
  console.log('PASS: gear-only workspace; three real OBJ mechanisms; own-axis motor, ratio, reverse, separation, independent steps, assembly, isolation, save/reload, axe and 320/390/1280px controls.');
}).catch((error) => { console.error(error); process.exitCode = 1; });
