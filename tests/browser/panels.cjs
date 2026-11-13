const assert = require('node:assert/strict');
const path = require('node:path');
const {run}=require('./harness.cjs');
run(async({page,artifacts,select,click,frame,close})=>{
 await page.setViewport({width:1280,height:900,isMobile:true,hasTouch:true}); await frame(); await select('sensor-luz-ldr');
 for(const name of ['inspector','technical','challenge']) {
  await close(); await click('#object-inspect');
  if(name!=='inspector') await click(name==='technical'?'#open-technical':'#open-challenge');
  await frame();
  const desktop=await page.$eval('#'+name,e=>({modal:e.matches(':modal'),rect:e.getBoundingClientRect().toJSON(),max:parseFloat(getComputedStyle(e).maxHeight),padding:parseFloat(getComputedStyle(e).paddingTop)}));
  assert.equal(desktop.modal,false); assert.equal(await page.evaluate(()=>__app.hud.isBlocking()),false);
  assert.equal(await page.evaluate(()=>__app.hud.dockedPanel().id),name);
  assert.ok(desktop.max>=675,'Más altura útil en 900 px'); assert.equal(desktop.padding,14);
  await click('[data-mode="move"]'); assert.equal(await page.evaluate(()=>__app.state.mode),'move');
  await page.screenshot({path:path.join(artifacts,'panel-desktop-'+name+'.png')});
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); await frame();
  await page.waitForFunction(name=>document.getElementById(name).matches(':modal'),{},name);
  assert.equal(await page.evaluate(()=>__app.hud.isBlocking()),true);
  const mobile=await page.$eval('#'+name,e=>({rect:e.getBoundingClientRect().toJSON(),padding:parseFloat(getComputedStyle(e).paddingTop)}));
  assert.equal(mobile.padding,12); assert.ok(mobile.rect.top>=0&&mobile.rect.bottom<=844);
  await page.screenshot({path:path.join(artifacts,'panel-mobile-'+name+'.png')});
  await page.setViewport({width:1280,height:900,isMobile:true,hasTouch:true}); await frame();
  await page.waitForFunction(name=>document.getElementById(name).open&&!document.getElementById(name).matches(':modal'),{},name);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>__app.state.hudSurface),name==='inspector'?null:'inspector');
 }
 console.log('PASS: ficha, datos y reto comparten panel lateral no modal, encuadre y acciones en escritorio; transición a modal móvil, regreso con Escape, altura útil y espaciado compacto.');
}).catch(e=>{console.error(e);process.exitCode=1});
