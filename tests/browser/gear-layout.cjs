const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');
run(async ({ page, close, frame, artifacts }) => {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const [width, height] of [[1280, 900], [390, 780], [320, 780], [320, 568], [320, 480], [844, 390]]) {
    await page.setViewport({ width, height, isMobile: true, hasTouch: true }); await close(); await frame();
    await page.click('#gear-quick'); await page.click('#gear-hub-more');
    const layout = await page.evaluate(() => {
      const group = document.getElementById('gear-center'), main = document.getElementById('gear-main-actions'), extra = document.getElementById('gear-more-actions');
      const buttons = [...group.querySelectorAll('button')].filter(e => e.getClientRects().length && !e.closest('[hidden]')).map(e => ({ id: e.id, text: e.textContent, ...e.getBoundingClientRect().toJSON(), scroll: e.scrollWidth, inner: e.clientWidth }));
      return { bounds: group.getBoundingClientRect().toJSON(), mainRows: new Set([...main.children].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().top))).size, rows: new Set([...extra.children].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().top))).size, buttons, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(layout.bounds.top >= 0 && layout.bounds.bottom <= height && layout.bounds.left >= 0 && layout.bounds.right <= width, 'palette inside viewport: ' + JSON.stringify({width,height,bounds:layout.bounds}));
    assert.equal(layout.mainRows, 1, 'primary actions fit one row');
    assert.ok(layout.rows <= (width > 700 && height < 621 ? 2 : 3), 'expanded tools use more columns and fewer rows');
    for (const b of layout.buttons) {
      assert.ok(b.width >= 44 && b.height >= 44, 'comfortable target: ' + b.id + ' ' + b.text + ': ' + b.width + 'x' + b.height);
      assert.ok(b.left >= 0 && b.right <= width && b.top >= 0 && b.bottom <= height, b.id + ' inside viewport');
      assert.ok(b.scroll <= b.inner + 1, 'caption fits: ' + b.id);
    }
    assert.equal(layout.overflow, false);
    assert.equal(await page.$eval('#gear-hub-direction', e => e.getAttribute('aria-pressed')), 'false');
    const audit = await page.evaluate(async () => (await axe.run('#gear-center', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    assert.deepEqual(audit, []);
    await page.screenshot({ path: path.join(artifacts, 'palette-' + width + '-' + height + '.png') });
    await page.click('#gear-hub-separate');
    const card = await page.$eval('#gear-context', e => e.getBoundingClientRect().toJSON());
    assert.ok(card.top >= 0 && card.bottom <= height && card.left >= 0 && card.right <= width, 'context control stays inside viewport');
    await page.click('#gear-context-close'); await page.click('#gear-hub-more');
    assert.equal(await page.$eval('#gear-more-actions', e => e.hidden), true);
  }
  console.log('PASS: arrows hidden by default, single primary row, expanded tools in 4/6 columns, touch targets, readable captions, no overflow, contextual control and axe at desktop/mobile/short/landscape sizes.');
}).catch(e => { console.error(e); process.exitCode = 1; });
