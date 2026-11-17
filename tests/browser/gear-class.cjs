const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--gears')) process.argv.push('--gears');
run(async ({ page, click, artifacts, close, frame }) => {
  const closeCard = async () => { if (!await page.$eval('#gear-context', e => e.hidden)) await page.click('#gear-context-close'); };
  const lesson = async key => { await closeCard(); await click('#center-learn-tab'); await click('#gear-hub-' + key); };
  const editTeeth = async () => { await closeCard(); await click('#center-controls-tab'); await click('#gear-hub-teeth'); };
  const waitTeeth = async expected => page.waitForFunction(expected => __app.state.pendingLoads === 0 && __app.state.chosen.mechanism.design?.teeth.join(',') === expected, {}, expected);
  assert.equal(await page.evaluate(() => __app.state.hudSurface), null);
  await page.click('#gear-quick'); await lesson('ratio');
  assert.match(await page.$eval('#class-ratio-diameters',e=>e.textContent),/d₁ = 37,5 mm · d₂ = 75 mm/,'original pitch diameters appear in the lesson');
  await editTeeth(); await click('[data-class-teeth="20,40"]'); await waitTeeth('20,40');
  await lesson('ratio'); assert.match(await page.$eval('#class-ratio-formula', e => e.textContent), /40 \/ 20 = 2/);
  await editTeeth(); await click('#gear-context-close'); await click('#gear-hub-rpm');
  await page.$eval('#class-rpm', e => { e.value = '100'; e.dispatchEvent(new Event('input')); });
  await click('#gear-hub-play'); assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.running), true);
  await click('#gear-hub-play'); assert.equal(await page.evaluate(() => __app.state.chosen.mechanism.state.running), false);
  await lesson('ratio');
  assert.match(await page.$eval('#class-ratio-diameters',e=>e.textContent),/d₁ = 50 mm · d₂ = 100 mm/);
  assert.match(await page.$eval('#class-ratio-rpm',e=>e.textContent),/n₁ = 100 rpm · n₂ = 50 rpm/);
  assert.match(await page.$eval('#class-ratio-radians',e=>e.textContent),/ω₁ = 10,472 rad\/s · ω₂ = 5,236 rad\/s/);
  assert.match(await page.$eval('#class-ratio-speed-note',e=>e.textContent),/configurada/);
  await lesson('speed'); assert.match(await page.$eval('#class-speed-formula', e => e.textContent), /100 \/ 2 = 50 rpm/);
  await click('#gear-context-close'); await click('#gear-hub-torque');
  assert.match(await page.$eval('#class-torque-result', e => e.textContent), /0,25 N·m/);
  assert.equal(await page.$eval('#class-radius', e => e.valueAsNumber), .025, 'parametric radius replaces the old unrelated example radius');
  assert.equal(await page.$eval('#gear-force-settings', e => e.hidden), false);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const width of [1280, 390, 320]) {
    await page.setViewport({ width, height: width === 1280 ? 900 : 780, isMobile: true, hasTouch: true });
    for (const topic of ['ratio', 'speed', 'torque']) {
      await lesson(topic);
      const audit = await page.evaluate(async () => (await axe.run('#gear-center', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
      assert.deepEqual(audit, []);
      await page.screenshot({ path: path.join(artifacts, 'class-' + topic + '-' + width + '.png') });
      if(topic==='ratio')for(const id of ['class-ratio-diameters','class-ratio-rpm','class-ratio-radians']){
        await page.evaluate(id=>__app.pagination.reveal(document.getElementById(id)),id);await frame();
        const readable=await page.$eval('#'+id,e=>{const r=e.getBoundingClientRect(),clip=e.closest('.page-clip').getBoundingClientRect();return r.top>=clip.top-1&&r.bottom<=clip.bottom+1&&r.left>=0&&r.right<=innerWidth;});
        assert.ok(readable,id+' stays complete at '+width);
        await page.screenshot({path:path.join(artifacts,id+'-'+width+'.png')});
      }

    }
    await closeCard(); await click('#center-controls-tab'); await click('#gear-hub-play');
    assert.equal(await page.evaluate(() => __app.state.hudSurface), 'gear-center'); await click('#gear-hub-play');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  for (const teeth of ['30,30', '40,20']) { await editTeeth(); await click('[data-class-teeth="' + teeth + '"]'); await waitTeeth(teeth); }
  await editTeeth(); await page.$eval('#class-teeth-1', e => e.value = '12'); await click('#class-apply');
  await page.waitForFunction(() => !document.querySelector('#class-error').hidden);
  assert.deepEqual(await page.evaluate(() => __app.state.chosen.mechanism.design.teeth), [40, 20]);
  await page.$eval('#class-teeth-1', e => e.value = '24'); await page.$eval('#class-teeth-2', e => e.value = '36'); await click('#class-apply'); await waitTeeth('24,36');
  await lesson('ratio');
  await page.evaluate(()=>{const m=__app.state.chosen.mechanism;m.state.drive={version:2,enabled:true,force:10};m.state.running=true;m.motion.omega=2;__app.gearForce.updateReading(performance.now(),true);});
  assert.match(await page.$eval('#class-ratio-radians',e=>e.textContent),/ω₁ = 2 rad\/s · ω₂ = 1,333 rad\/s/,'force-mode updates both angular velocities live');
  await page.evaluate(()=>{__app.state.chosen.mechanism.state.running=false;__app.gearForce.updateReading(performance.now(),true);});
  assert.match(await page.$eval('#class-ratio-rpm',e=>e.textContent),/n₁ = 0 rpm · n₂ = 0 rpm/);
  assert.match(await page.$eval('#class-ratio-speed-note',e=>e.textContent),/0\/0 no define R/);
  assert.match(await page.$eval('#class-ratio-formula',e=>e.textContent),/36 \/ 24 = 1,5/,'stopping never changes the geometric ratio');
  await close();
  console.log('PASS: classroom buttons, tooth presets/validation, 100→50 rpm, physical pitch radius and torque, preserved fixed-speed mode, mobile controls and axe.');
}).catch(error => { console.error(error); process.exitCode = 1; });
