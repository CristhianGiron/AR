const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');
run(async ({ page, click, close, artifacts, load }) => {
  const actual = () => page.evaluate(() => __app.state.chosen.mechanism.parts.map(part => {
    const colors = []; part.pivot.traverse(node => { for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) if (material.color) colors.push('#' + material.color.getHexString()); });
    return [...new Set(colors)];
  }));
  const open = async () => { await close(); await page.click('#gear-quick'); await page.click('#gear-hub-more'); await page.click('#gear-hub-colors'); };
  const paint = async (target, color) => {
    await page.select('#gear-color-target', target);
    await page.$eval('#gear-part-color', (e, value) => { e.value = value; e.dispatchEvent(new Event('input')); }, color);
  };
  const original = await actual(); await open();
  await paint('0', '#27d5ed'); let values = await actual();
  assert.deepEqual(values[0], ['#27d5ed']); assert.deepEqual(values[1], original[1]);
  await paint('1', '#e84ebd'); values = await actual();
  assert.deepEqual(values, [['#27d5ed'], ['#e84ebd']]);
  // Unrelated editor updates and mechanical resets must preserve per-part colors.
  await page.$eval('#size', e => { e.value = '1.1'; e.dispatchEvent(new Event('input')); });
  await page.evaluate(() => __app.gears.reset()); assert.deepEqual(await actual(), values);
  await page.evaluate(async () => __app.gearDesigner.replace({ version: 1, teeth: [24, 36], module: 2, width: 8, bore: 4 }, false));
  assert.deepEqual(await actual(), values, 'regenerated gears retain their individual colors');
  await open(); await page.select('#gear-color-target', '0'); await click('#gear-color-reset');
  assert.deepEqual((await actual())[1], ['#e84ebd']);
  await paint('all', '#88bbff');
  assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.colors === undefined), true, 'whole-object recoloring replaces part overrides');
  await click('#gear-color-reset'); assert.equal(await page.evaluate(() => __app.state.chosen.color), '#ffffff');
  await close(); await page.evaluate(async () => __app.gears.selectModel('engranajes-transmision'));
  const transmissionOriginal = await actual(); await open();
  assert.equal(await page.$$eval('#gear-color-target option', es => es.length), 5);
  for (const [index, color] of ['#ff3040', '#20dd60', '#3050ff', '#ffce20'].entries()) await paint(String(index), color);
  const colored = await actual(); assert.deepEqual(colored, [['#ff3040'], ['#20dd60'], ['#3050ff'], ['#ffce20']]);
  const saved = await page.evaluate(() => __app.projects.capture());
  await close(); await load(); await page.evaluate(async data => __app.projects.restore(data), saved);
  assert.deepEqual(await actual(), colored, 'four individual colors survive JSON restore and page reload');
  await open(); await page.select('#gear-color-target', '1');
  assert.match(await page.$eval('#gear-color-note', e => e.textContent), /una sola pieza/);
  await click('#gear-color-reset'); assert.deepEqual((await actual())[1], transmissionOriginal[1]);
  assert.deepEqual((await actual())[3], ['#ffce20']);
  // Shared source materials must become independent without changing either original color.
  const shared = await page.evaluate(() => {
    const material = new __THREE.MeshStandardMaterial({ color: '#aabbcc' }), scene = new __THREE.Group();
    for (const name of ['pinion', 'gear']) { const mesh = new __THREE.Mesh(new __THREE.BoxGeometry(), material); mesh.name = name; scene.add(mesh); }
    const mechanism = __app.gears.prepare({ scene }, { mecanismo: { tipo: 'rectos' } });
    const first = mechanism.parts[0].pivot.children[0].material, second = mechanism.parts[1].pivot.children[0].material;
    first.color.set('#ff0000'); const result = { independent: first !== second, second: second.color.getHexString() };
    scene.traverse(n => { n.geometry?.dispose(); n.material?.dispose(); }); material.dispose(); return result;
  }); assert.deepEqual(shared, { independent: true, second: 'aabbcc' });
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1280, 390, 320]) {
    await page.setViewport({ width, height: width === 1280 ? 900 : 780, isMobile: true, hasTouch: true }); await open();
    const audit = await page.evaluate(async () => (await axe.run('#gear-context', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    assert.deepEqual(audit, []);
    await page.screenshot({ path: path.join(artifacts, 'gear-colors-' + width + '.png') });
  }
  console.log('PASS: independent part colors, shared-material isolation, whole-object color, individual reset, design regeneration, four-part save/reload and accessible floating color controls.');
}).catch(error => { console.error(error); process.exitCode = 1; });
