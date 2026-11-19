const assert = require('node:assert/strict');
const {run}=require('./harness.cjs');
run(async({browser,origin})=>{
 async function visit(prepare,route) {
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(prepare)await page.evaluateOnNewDocument(prepare);
  if(route){await page.setRequestInterception(true);page.on('request',req=>route(req));}
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  return {page,errors};
 }
 async function lab(page){
  await page.waitForFunction(()=>document.getElementById('loading-indicator').hidden,{timeout:30000});
  const loaded=await page.evaluate(async()=>{
   const {app}=await import('/src/main.js');await app.ready;app.loop.renderFrame();
   return {ready:app.state.startupReady,count:app.state.entries.length,canvas:!!document.querySelector('#stage canvas'),notice:document.getElementById('notice').textContent};
  });
  assert.equal(loaded.ready,true);assert.ok(loaded.count>0);assert.equal(loaded.canvas,true);
  assert.ok(!loaded.notice.includes('No se pudo completar la carga'));return loaded;
 }
 {
  const {page,errors}=await visit(()=>{
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:original.call(this,type,...args);};
  });
  await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('No se pudieron activar los gráficos'));
  assert.equal(await page.$eval('#loading-indicator',e=>e.hidden),true);assert.deepEqual(errors,[]);await page.close();
 }
 {
  const {page,errors}=await visit(()=>{
   const original=HTMLCanvasElement.prototype.getContext;window.__multisampleFailures=0;
   HTMLCanvasElement.prototype.getContext=function(type,options,...args){
    if(String(type).includes('webgl')&&options?.antialias){__multisampleFailures++;return null;}
    return original.call(this,type,options,...args);
   };
   Object.defineProperty(navigator,'xr',{configurable:true,value:undefined});
  });
  await lab(page);assert.ok(await page.evaluate(()=>__multisampleFailures)>0);
  assert.deepEqual(errors,[]);await page.close();
 }
 for(const kind of ['missing','false','reject','module-error','cached-html']){
  const {page,errors}=await visit(kind==='cached-html'?()=>{
   Object.defineProperty(navigator,'xr',{configurable:true,value:{isSessionSupported:async()=>true}});
   document.addEventListener('DOMContentLoaded',()=>{const button=document.querySelector('#quick-ar');if(button)button.id='quick-camera';},{once:true});
  }:()=>{
   const mode=location.search.slice(1);
   Object.defineProperty(navigator,'xr',{configurable:true,value:mode==='missing'?undefined:{isSessionSupported:async()=>{if(mode==='reject')throw new DOMException('Blocked','SecurityError');return mode==='module-error';}}});
  },req=>req.url().includes('/src/scene/spatial-ar.js')&&kind==='module-error'?req.abort():req.continue());
  // Inject mode before module execution through a fresh navigation.
  if(kind!=='cached-html')await page.goto(origin+'/?'+kind,{waitUntil:'domcontentloaded'});
  await lab(page);
  if(kind==='module-error')await page.waitForFunction(()=>document.getElementById('surface-message').textContent.includes('No se pudo cargar el modo AR'));
  if(kind==='cached-html')assert.ok(await page.$('#quick-ar'),'cached entry id normalized');
  assert.deepEqual(errors,[],kind);await page.close();
 }
 {
  const {page,errors}=await visit(null,req=>req.url().includes('/src/scene/engine.js')?req.abort():req.continue());
  await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('No se pudo completar la carga'));
  assert.ok(!await page.$eval('#notice',e=>e.textContent.includes('navegador actualizado')),'module loading errors do not blame device');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: 3D starts without XR, unsupported/rejected XR, missing AR module, cached entry markup and antialias fallback; real graphics failure and module download errors are distinguished.');
}).catch(e=>{console.error(e);process.exitCode=1});
