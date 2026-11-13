const assert = require('node:assert/strict');
const {run}=require('./harness.cjs');
run(async({page,origin,click,select,frame})=>{
 const failures=[], external=[];
 page.on('requestfailed',r=>failures.push(r.url()));
 page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:'))external.push(r.url());});
 // Reload to observe every request from the artifact, rather than relying on previous cache.
 await page.setCacheEnabled(false); await page.reload({waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{window.__app=(await import('/src/main.js')).app;await __app.ready;__app.loop.stop();__app.loop.renderFrame()});
 assert.equal(await page.evaluate(()=>__app.state.entries.length),2);
 await select('sensor-luz-ldr'); await click('#object-inspect'); await frame();
 assert.equal(await page.$eval('#inspector',e=>+e.dataset.pageCount),1);
 await click('#open-challenge'); await click('#learning-quiz-tab');
 assert.ok(await page.$$eval('#learning-choices button',buttons=>buttons.length>0));
 await page.keyboard.press('Escape'); await click('#open-parts');
 assert.ok(await page.$$eval('#parts-list button',buttons=>buttons.length>=2));
 await page.keyboard.press('Escape'); await click('#open-experiment'); await click('#more-light'); await click('#record-observation');
 assert.equal(await page.evaluate(()=>__app.projects.capture().entries.find(e=>e.source.catalog==='sensor-luz-ldr').activity.observations.length),1);
 assert.deepEqual(failures,[]); assert.deepEqual(external,[]);
 console.log('PASS: paquete servido por HTTP, GLB y módulos locales, ficha, reto y ausencia de dependencias de red externas.');
}).catch(e=>{console.error(e);process.exitCode=1});
