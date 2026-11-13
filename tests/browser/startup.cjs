const assert = require('node:assert/strict');
const {run}=require('./harness.cjs');
run(async({browser,origin})=>{
 const page=await browser.newPage(),errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:original.call(this,type,...args)};
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('No se pudo iniciar la vista 3D'));
 assert.equal(await page.$eval('#loading-indicator',e=>e.hidden),true); assert.deepEqual(errors,[]);
 await page.close(); console.log('PASS: mensaje legible de arranque sin WebGL y sin error JavaScript sin manejar. WebGL deshabilitado por simulación.');
}).catch(e=>{console.error(e);process.exitCode=1});
