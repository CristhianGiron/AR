const assert = require('node:assert/strict');
const path = require('node:path');
const {run}=require('./harness.cjs');
run(async({page,artifacts,select,click,close,frame})=>{
 for(const viewport of [{width:1280,height:900},{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
  await close(); await page.setViewport({...viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1}); await frame();
  const ids = await page.evaluate(()=>__app.state.entries.map(item=>item.type));
  for (const id of ids) {
    await select(id); await click('#object-inspect');
    assert.equal(await page.$eval('#inspector',e=>+e.dataset.pageCount),1,viewport.width+': ficha completa de '+id);
  }
  await select('sensor-luz-ldr'); await click('#object-inspect');
  const overview=await page.$eval('#inspector',e=>({pages:+e.dataset.pageCount,footer:e.querySelector('.page-navigation').hidden,buttons:[...e.querySelectorAll('#focus-component,#open-challenge,#open-technical')].every(b=>!b.closest('[inert]'))}));
  assert.equal(overview.pages,1,JSON.stringify(viewport)+': ficha en una vista'); assert.ok(overview.footer&&overview.buttons);
  await page.screenshot({path:path.join(artifacts,'overview-'+viewport.width+'.png')});
  await click('#open-challenge'); assert.equal(await page.evaluate(()=>__app.state.hudSurface),'challenge');
  await click('#learning-quiz-tab'); assert.equal(await page.$eval('#learning-check',e=>e.hidden),false);
  await page.keyboard.press('Escape'); assert.equal(await page.evaluate(()=>__app.state.hudSurface),'inspector');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'open-challenge');
  await click('#open-technical'); assert.equal(await page.evaluate(()=>__app.state.hudSurface),'technical');
  await click('#technical [data-return-card]'); assert.equal(await page.evaluate(()=>__app.state.hudSurface),'inspector');
 }
 console.log('PASS: ficha en una página, tres acciones visibles, reto y datos independientes con regreso a la ficha a 320/390/844/1280 px.');
}).catch(e=>{console.error(e);process.exitCode=1});
