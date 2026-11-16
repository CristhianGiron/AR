const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');

run(async ({ page, click, close, frame, artifacts }) => {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const centered = async () => {
    const results = await page.evaluate(() => [...document.querySelectorAll('#gear-transport button > svg, #gear-inline-close > svg, #header .round-button > svg, dialog[open] .round-button > svg')]
      .filter(svg => svg.getBoundingClientRect().width > 0)
      .map(svg => { const icon = svg.getBoundingClientRect(), button = svg.parentElement.getBoundingClientRect(); return { id: svg.parentElement.id, x: Math.abs((icon.left + icon.right - button.left - button.right) / 2), y: Math.abs((icon.top + icon.bottom - button.top - button.bottom) / 2) }; }));
    assert.ok(results.length >= 3);
    for (const r of results) assert.ok(r.x <= 1 && r.y <= 1, r.id + ' SVG centered: ' + JSON.stringify(r));
  };
  const audit = async selector => {
    const results = await page.evaluate(async selector => (await axe.run(selector, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), selector);
    assert.deepEqual(results, []);
  };
  for (const width of [1280, 390, 320]) {
    await page.setViewport({ width, height: width === 1280 ? 900 : 780, isMobile: true, hasTouch: true });
    await close(); await frame(); await centered();
    await page.click('#gear-toggle'); await frame(); await centered();
    await page.click('#gear-toggle');
    await page.click('#gear-quick'); await centered(); await audit('#gear-center');
    await page.screenshot({ path: path.join(artifacts, 'comic-inline-' + width + '.png') });
    await click('#center-learn-tab');
    for (const topic of ['ratio', 'speed', 'torque']) {
      await click('#class-' + topic + '-tab'); await audit('#gear-class'); await centered();
      await page.screenshot({ path: path.join(artifacts, 'comic-' + topic + '-' + width + '.png') });
    }
    await close();
    await page.evaluate(() => document.body.classList.remove('classroom-mode')); await frame();
    const button = await page.$eval('#class-return', e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; });
    assert.ok(button.width > 60 && button.width < 180, 'Mi clase keeps content width, not viewport width: ' + button.width);
    assert.ok(button.left >= 0 && button.right <= width && button.height >= 44);
    await centered();
    const floatingControls = await page.$$eval('#gear-transport button', buttons => buttons.filter(e => !e.hidden && getComputedStyle(e).display !== 'none').map(e => ({ id: e.id, ...e.getBoundingClientRect().toJSON() })));
    for (const control of floatingControls) assert.ok(control.left >= 0 && control.right <= width && control.width < 180, 'floating control stays compact: ' + control.id);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'comic-navigation-' + width + '.png') });
    await page.click('#class-return'); await close();
  }
  await page.setViewport({ width: 1280, height: 900, isMobile: true, hasTouch: true });
  await page.evaluate(() => { __app.gears.open(); });
  await page.evaluate(() => __app.gearDesigner.open()); await audit('#gear-designer');
  await page.screenshot({ path: path.join(artifacts, 'comic-designer.png') });
  console.log('PASS: comic panel and button styles, Mi clase content width, actual SVG centers before/after playback, contrast and full-width overflow at 320/390/1280px.');
}).catch(error => { console.error(error); process.exitCode = 1; });
