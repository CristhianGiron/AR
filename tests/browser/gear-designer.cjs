const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');

run(async ({ page, click, artifacts, load, close }) => {
  await page.evaluate(() => { document.body.classList.remove('classroom-mode'); __app.hud.close(false); __app.gears.open(); });
  const fill = async (id, value) => page.$eval('#gear-' + id, (input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, String(value));
  const waitForDesign = () => page.waitForFunction(() => __app.state.pendingLoads === 0 && !!__app.state.chosen?.mechanism.design);
  await page.evaluate(() => {
    const item = __app.state.chosen; __app.editor.rename(item, 'Mi transmisión'); item.anchor.position.set(-1.2, 0, .7); item.rot = [-15, 22, 5]; item.size = 1.1; __app.editor.applyTransform(item);
  });
  const before = await page.evaluate(() => { const i = __app.state.chosen; return { name: i.name, position: i.anchor.position.toArray(), rotation: i.rot, size: i.size }; });
  await page.evaluate(() => __app.gearDesigner.open());
  await fill('teeth-1', 24); await fill('teeth-2', 36);
  await click('#gear-design-form details summary');
  await fill('module', 2); await fill('width', 8); await fill('bore', 5);
  assert.match(await page.$eval('#gear-draft-reading', (e) => e.textContent), /Entre ejes: 60.00 mm/);
  await click('#gear-generate'); await waitForDesign();
  const generated = await page.evaluate(() => {
    const i = __app.state.chosen, m = i.mechanism;
    const countTeeth = (geometry) => {
      const points = geometry.parameters.shapes.extractPoints().shape;
      const radii = points.map((p) => p.length()), maximum = Math.max(...radii);
      return radii.filter((r, index) => Math.abs(r - maximum) < 1e-6 && Math.abs(radii[(index + radii.length - 1) % radii.length] - maximum) >= 1e-6).length;
    };
    return { name: i.name, position: i.anchor.position.toArray(), rotation: i.rot, size: i.size, design: m.design,
      teeth: m.parts.map((p) => countTeeth(p.pivot.children[0].geometry)), holes: m.parts.map((p) => p.pivot.children[0].geometry.parameters.shapes.holes.length),
      center: m.parts[1].home.x, rpm: document.querySelector('#gear-reading').textContent,
      facts: i.definition.datos, running: m.state.running };
  });
  assert.deepEqual({ name: generated.name, position: generated.position, rotation: generated.rotation, size: generated.size }, before);
  assert.deepEqual(generated.teeth, [24, 36]); assert.deepEqual(generated.holes, [1, 1]); assert.equal(generated.center, 60);
  assert.match(generated.rpm, /Salida: 8.0 rpm/); assert.equal(generated.running, false);
  assert.deepEqual(generated.facts[0], { etiqueta: 'Dientes', valor: '24 y 36' });
  await page.evaluate(() => { __app.learning.ensureFocused(); __app.state.viewState.zoom = 1; __app.loop.renderFrame(); });
  const stable = await page.evaluate(() => {
    const item = __app.state.chosen, m = item.mechanism, positions = [];
    for (let i = 0; i < 16; i++) { __app.gears.restore(item, { ...m.state, angle: i * Math.PI / 8 }); __app.loop.renderFrame(); positions.push(__app.engine.camera.position.clone()); }
    return Math.max(...positions.map((p) => p.distanceTo(positions[0])));
  }); assert.ok(stable < 1e-9, 'parametric motion keeps the framing stable');
  const saved = await page.evaluate(() => __app.projects.capture());
  await page.evaluate(async (data) => __app.projects.restore(data), JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(await page.evaluate(() => __app.projects.capture()), saved);
  await load(); await page.evaluate(async (data) => __app.projects.restore(data), saved);
  assert.deepEqual(await page.evaluate(() => __app.projects.capture()), saved, 'parameters regenerate geometry after reload');
  await page.evaluate(() => { __app.gears.open(); }); await page.evaluate(() => __app.gearDesigner.open());
  const originals = await page.evaluate(() => { window.__unchanged = [...__app.state.entries]; return __app.state.entries.length; });
  await fill('teeth-1', 12); await click('#gear-generate');
  await page.waitForFunction(() => !document.querySelector('#gear-design-error').hidden);
  assert.match(await page.$eval('#gear-design-error', (e) => e.textContent), /18 y 120/);
  assert.equal(await page.evaluate(() => __unchanged.every((entry, index) => entry === __app.state.entries[index])), true);
  assert.equal(await page.evaluate(() => __app.state.entries.length), originals);
  await fill('teeth-1', 18); await fill('module', .5); await fill('bore', 8); await click('#gear-generate');
  assert.match(await page.$eval('#gear-design-error', (e) => e.textContent), /agujero es demasiado grande/);
  await click('#gear-use-original');
  await page.waitForFunction(() => __app.state.pendingLoads === 0 && !__app.state.chosen.mechanism.design);
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.system.teeth), [15, 30]);
  assert.equal(await page.evaluate(() => __app.state.chosen.name), before.name);
  await page.evaluate(() => __app.gearDesigner.open());
  await fill('teeth-1', 40); await fill('teeth-2', 20); await click('#gear-generate'); await waitForDesign();
  assert.match(await page.$eval('#gear-reading', (e) => e.textContent), /Salida: 24.0 rpm/);
  await close(); await page.evaluate(() => __app.loop.renderFrame());
  await page.screenshot({ path: path.join(artifacts, 'gear-design-scene.png') });
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1280, 390, 320]) {
    await page.setViewport({ width, height: width === 1280 ? 900 : 780, isMobile: true, hasTouch: true });
    await page.evaluate(() => { __app.loop.renderFrame(); __app.gears.open(); }); await page.evaluate(() => __app.gearDesigner.open());
    const audit = await page.evaluate(async () => (await axe.run('#gear-designer', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })));
    assert.deepEqual(audit, []); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'gear-designer-' + width + '.png') });
    await click('#gear-generate'); await waitForDesign();
    assert.equal(await page.$eval('#gear-center', (e) => e.open), true, 'applying keeps the unified workspace open');
    await close();
  }
  // A failed preparation leaves both the old instance and the scene intact.
  const failure = await page.evaluate(async () => {
    const item = __app.state.chosen, original = __app.models.loadModel;
    __app.models.loadModel = async () => { throw new Error('Fallo de preparación simulado'); };
    let rejected = false;
    try { await __app.gearDesigner.replace(item.mechanism.design); } catch { rejected = true; }
    finally { __app.models.loadModel = original; }
    return { rejected, preserved: item === __app.state.chosen && __app.state.entries.includes(item), pending: __app.state.pendingLoads };
  }); assert.deepEqual(failure, { rejected: true, preserved: true, pending: 0 });
  const extremes = await page.evaluate(async () => {
    const { createParametricGears } = await import('/src/models/parametric-gears.js');
    const results = [];
    for (const design of [{ version: 1, teeth: [18, 120], module: .5, width: 1, bore: 0 }, { version: 1, teeth: [120, 120], module: 5, width: 20, bore: 40 }]) {
      const model = createParametricGears(design);
      results.push(model.scene.children.every((mesh) => mesh.geometry.getAttribute('position').count > 0 && [...mesh.geometry.getAttribute('position').array].every(Number.isFinite)));
      __app.assets.disposeResources(model.scene);
    }
    return results;
  }); assert.deepEqual(extremes, [true, true]);
  console.log('PASS: real 24/36 and 40/20 involute geometry, dimensions, bore, RPM, preserved transforms, atomic errors, original OBJ recovery, scene regeneration, camera stability and accessible 320/390/1280px designer.');
}).catch((error) => { console.error(error); process.exitCode = 1; });
