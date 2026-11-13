const assert = require('node:assert/strict');
const {run}=require('./harness.cjs');
run(async({page,click})=>{
 await page.evaluate(()=>{
  window.cameraStreams=[]; window.cameraRequests=[];
  const video=document.getElementById('video');
  video.play=async()=>{};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:(constraints)=>{
   window.cameraRequests.push(constraints);
   return new Promise((resolve,reject)=>{window.cameraResolve=()=>{
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=16;
    const stream=canvas.captureStream(1); window.cameraStreams.push(stream); resolve(stream);
   };window.cameraReject=reject;});
  }}});
 });
 const off=async()=>{
  assert.equal(await page.$eval('#quick-camera',e=>e.getAttribute('aria-pressed')),'false');
  assert.equal(await page.$eval('#video',e=>e.srcObject),null);
  assert.ok(await page.evaluate(()=>cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
 };
 await click('#quick-camera'); await click('#quick-camera');
 await page.evaluate(()=>cameraResolve()); await off();
 await click('#quick-camera'); await page.evaluate(()=>cameraResolve());
 await page.waitForFunction(()=>document.getElementById('quick-camera').getAttribute('aria-pressed')==='true');
 assert.deepEqual(await page.evaluate(()=>cameraRequests.at(-1)),{video:{facingMode:{ideal:'environment'}},audio:false});
 await click('#view'); await off();
 await page.evaluate(()=>{document.getElementById('video').play=async()=>{throw new DOMException('blocked','NotAllowedError')};});
 await click('#quick-camera'); await page.evaluate(()=>cameraResolve());
 await page.waitForFunction(()=>document.getElementById('quick-camera').getAttribute('aria-busy')==='false'); await off();
 await page.evaluate(()=>{document.getElementById('video').play=async()=>{};});
 await click('#quick-camera'); await page.evaluate(()=>cameraResolve());
 await page.waitForFunction(()=>document.getElementById('quick-camera').getAttribute('aria-pressed')==='true');
 await page.evaluate(()=>cameraStreams.at(-1).getVideoTracks()[0].dispatchEvent(new Event('ended'))); await off();
 await click('#quick-camera'); await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
 await page.evaluate(()=>cameraResolve()); await off();
 console.log('PASS: cámara cancelada con permiso pendiente, activación sin audio, apagado, fallo de reproducción, pista interrumpida y salida de página; todas las pistas liberadas. Simulación, no cámara física.');
}).catch(e=>{console.error(e);process.exitCode=1});
