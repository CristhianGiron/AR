const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { run } = require('./harness.cjs');
run(async ({ page, artifacts, close, click, openMenuAction, select, advanced, frame }) => {
  const reports = [];
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  async function audit(name) {
    const result = await page.evaluate(async () => {
      const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
      return { violations: result.violations, incomplete: result.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })) };
    });
    const targets = await page.evaluate(() => [...document.querySelectorAll('button, input, select, textarea, summary')].filter((element) => element.getClientRects().length && !element.closest('[inert]') && (!document.querySelector('dialog[open]') || element.closest('dialog[open]'))).map((element) => {
      const target = element.type === 'checkbox' ? element.closest('label') || element : element;
      const rect = target.getBoundingClientRect();
      return { id: element.id || element.textContent.trim().slice(0, 35), width: rect.width, height: rect.height };
    }).filter((target) => target.width < 43.9 || target.height < 43.9));
    if (targets.length) console.error(name, 'targets', targets);
    reports.push({ name, ...result, smallTargets: targets });
    for (const violation of result.violations) console.error(name, violation.id, violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })));
  }
  await audit('initial-desktop');
  await audit('integrated-navigation');
  await click('#workspace-toggle'); await audit('navigation-collapsed');
  await openMenuAction('explore'); await audit('library');
  await page.$eval('#manual-upload', (element) => { element.open = true; }); await audit('local-import');
  await openMenuAction('my-scene'); await audit('scene-list');
  await close(); await click('#help'); await audit('help');
  await select('sensor-luz-ldr'); await audit('selected');
  await click('#object-inspect'); await audit('direct-learning');
  await click('#open-technical'); await audit('technical-data');
  await page.keyboard.press('Escape');
  await click('#open-challenge'); await audit('challenge-observation');
  await close();
  await advanced(); await audit('advanced');
  for (const selector of ['#precision-details', '#numeric-controls', '#backup-controls', '#scene-maintenance']) {
    await page.$eval(selector, (element) => { element.open = true; });
  }
  await audit('advanced-expanded');
  await click('#mobile-inspect'); await audit('learning');
  await click('#learning-quiz-tab'); await audit('quiz');
  await click('.learning-choice'); await audit('quiz-feedback');
  await close(); await click('#view-controls-toggle'); await audit('collection');
  await click('#collection-rotate'); await audit('collection-angles');
  await click('#collection-mode');
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewport({ ...viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await close(); await frame(); await audit('mobile-' + viewport.width);
    if (viewport.width <= 700) {
      await click('#workspace-toggle'); await audit('mobile-navigation-' + viewport.width);
      await page.keyboard.press('Escape');
    }
    await advanced(); await audit('advanced-' + viewport.width);
    const reflow = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      return { scroll: dialog.scrollWidth, client: dialog.clientWidth };
    });
    assert.ok(reflow.scroll <= reflow.client + 1, 'Panel sin desbordamiento horizontal: ' + JSON.stringify(reflow));
  }
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#workspace-toggle')).animationName), 'none');
  fs.writeFileSync(path.join(artifacts, 'accessibility.json'), JSON.stringify(reports, null, 2));
  assert.equal(reports.flatMap((report) => report.smallTargets).length, 0, 'Controles de al menos 44×44 CSS px');
  assert.equal(reports.reduce((sum, report) => sum + report.violations.length, 0), 0, 'Violaciones axe; ver accessibility.json');
  console.log('PASS: axe WCAG 2.2 A/AA y buenas prácticas en ' + reports.length + ' estados; reflujo a 320/390/844 px y movimiento reducido. Revisiones manuales pendientes en docs/accesibilidad.md.');
}).catch((error) => { console.error(error); process.exitCode = 1; });
