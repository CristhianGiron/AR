const assert=require('node:assert/strict');
const path=require('node:path');
const {run}=require('./harness.cjs');
run(async({page,click,close,select,frame,artifacts})=>{
 await select('sensor-temperatura');await close();await click('#view-controls-toggle');await click('#open-surfaces');
 await page.waitForFunction(()=>!document.querySelector('#surface-message').textContent.includes('Comprobando'));
 assert.ok(await page.$eval('#surface-message',e=>e.textContent.length>10));
 assert.equal(await page.$eval('#surface-start',e=>e.disabled),true,'unsupported runtime cannot request an immersive session');
 await page.waitForFunction(()=>!__app.spatial.pending);
 assert.equal(await page.evaluate(()=>__app.spatial.active),false,'unsupported browser retains lab');
 const originals=await page.evaluate(()=>__app.projects.capture());
 await page.evaluate(()=>{
  const renderer=__app.engine.renderer;
  window.__originalXR={setSession:renderer.xr.setSession,getReferenceSpace:renderer.xr.getReferenceSpace,setAnimationLoop:renderer.setAnimationLoop,render:renderer.render};
  renderer.xr.setSession=async session=>{window.__xrAttached=session;};window.__localSpace=new EventTarget();renderer.xr.getReferenceSpace=()=>__localSpace;
  renderer.setAnimationLoop=callback=>{window.__arCallback=callback;};
  renderer.render=(scene,camera)=>{window.__arScene=scene;__originalXR.render.call(renderer,scene,camera);};
  window.__xrSessions=[];window.__xrOptions=[];window.__xrMode='ok';
  const xr=new EventTarget();xr.isSessionSupported=async()=>true;
  xr.requestSession=async(mode,options)=>{
   __xrOptions.push({mode,required:options.requiredFeatures,overlay:options.domOverlay.root.id});
   if(__xrMode==='no-runtime')throw new DOMException('Could not create a session because: No runtimes supported the requested configuration','NotSupportedError');
   if(__xrMode==='denied')throw new DOMException('Denied','NotAllowedError');
   if(__xrMode==='late')await new Promise(resolve=>window.__resolveXR=resolve);
   const session=new EventTarget();session.visibilityState='visible';session.domOverlayState=__xrMode==='no-overlay'?null:{type:'screen'};session.endCount=0;
   session.end=async()=>{session.endCount++;session.dispatchEvent(new Event('end'));};
   session.requestReferenceSpace=async()=>({type:'viewer'});
   session.source={cancelled:0,cancel(){this.cancelled++;}};
   session.requestHitTestSource=async()=>{if(__xrMode==='source-error')throw Error('Source unavailable');if(__xrMode==='late-source')await new Promise(resolve=>window.__resolveSource=resolve);return session.source;};
   __xrSessions.push(session);return session;
  };
  Object.defineProperty(navigator,'xr',{configurable:true,value:xr});
  window.__surfaceFrame=(kind='flat',tracked=true)=>{
   const matrix=new __THREE.Matrix4();matrix.setPosition(1,0,-2);if(kind==='wall')matrix.makeRotationX(Math.PI/2);
   const session=__xrSessions.at(-1);
   __arCallback?.(performance.now(),{getViewerPose:()=>tracked?{}:null,getHitTestResults:()=>kind==='none'?[]:[{getPose:()=>({transform:{matrix:matrix.toArray()}})}]});
  };
 });
 await page.evaluate(async()=>{__app.loop.start();await __app.spatial.support();});await click('#surface-start');await page.waitForFunction(()=>__app.spatial.active);
 assert.deepEqual(await page.evaluate(()=>__xrOptions.at(-1)),{mode:'immersive-ar',required:['local','hit-test'],overlay:'surface-overlay'});
 assert.equal(await page.$eval('#surface-place',e=>e.disabled),true);
 await page.evaluate(()=>__surfaceFrame('wall'));assert.equal(await page.$eval('#surface-place',e=>e.disabled),true,'wall rejected');
 await page.evaluate(()=>__surfaceFrame('flat'));assert.equal(await page.$eval('#surface-place',e=>e.disabled),false);
 await click('#surface-place');
 await page.evaluate(()=>__surfaceFrame('flat'));
 assert.deepEqual(await page.evaluate(()=>__arScene.children.find(n=>n.type==='Group').position.toArray()),[1,0,-2],'placement uses hit pose');
 assert.equal(await page.evaluate(()=>__app.spatial.placed),true);
 await click('#surface-larger');await click('#surface-right');assert.equal(await page.$eval('#surface-size',e=>e.textContent),'110% · 15°');
 await page.evaluate(()=>__surfaceFrame('none',false));assert.ok(await page.$eval('#surface-live',e=>e.textContent.includes('seguimiento')));
 await click('#surface-reposition');await page.evaluate(()=>__surfaceFrame('none'));assert.equal(await page.$eval('#surface-place',e=>e.disabled),true,'stale hit cannot place');
 await page.evaluate(()=>__surfaceFrame('flat'));await page.evaluate(()=>__xrSessions.at(-1).dispatchEvent(new Event('select')));assert.equal(await page.evaluate(()=>__app.spatial.placed),true,'native select placement without HTML overlay');
 await page.evaluate(()=>__localSpace.dispatchEvent(new Event('reset')));assert.equal(await page.evaluate(()=>__app.spatial.placed),false,'reference reset requires new placement');
 await page.evaluate(()=>{__surfaceFrame('flat');__xrSessions.at(-1).dispatchEvent(new Event('select'));__surfaceFrame('flat');});
 const beforeSelect=await page.evaluate(()=>{const event=new Event('beforexrselect',{cancelable:true,bubbles:true});document.querySelector('#surface-place').dispatchEvent(event);return event.defaultPrevented;});assert.equal(beforeSelect,true,'overlay does not place accidentally');
 await page.evaluate(()=>__surfaceFrame('flat'));
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});assert.deepEqual(audit,[]);
 await page.screenshot({path:path.join(artifacts,'surface-controls-simulated.png')});
 await click('#surface-exit');await page.waitForFunction(()=>!__app.spatial.active);
 assert.equal(await page.evaluate(()=>__xrSessions[0].source.cancelled),1);assert.equal(await page.$eval('#surface-overlay',e=>e.hidden),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'view-controls-toggle','focus returns to visible control');
 assert.equal(await page.evaluate(()=>__app.loop.running),true,'normal loop resumes after XR');await page.evaluate(()=>__app.loop.stop());
 assert.deepEqual(await page.evaluate(()=>__app.projects.capture()),originals,'AR does not change saved transforms or learning');
 await page.evaluate(async()=>{navigator.xr.isSessionSupported=async()=>false;await __app.spatial.support();});
 assert.equal(await page.$eval('#surface-start',e=>e.disabled),true,'negative preflight disables entry');
 const requestsBefore=await page.evaluate(()=>__xrOptions.length);await page.evaluate(()=>__app.spatial.start());
 assert.equal(await page.evaluate(()=>__xrOptions.length),requestsBefore,'unsupported runtime is never requested');
 await page.evaluate(async()=>{navigator.xr.isSessionSupported=async()=>true;__xrMode='no-runtime';if(__app.state.hudSurface!=='surfaces')__app.hud.open('surfaces');await __app.spatial.support();});
 await click('#surface-start');await page.waitForFunction(()=>!__app.spatial.pending);
 assert.ok(await page.$eval('#surface-message',e=>e.textContent.includes('sistema AR compatible')),'exact Chromium error has a natural explanation');
 assert.equal(await page.$eval('#surface-start',e=>e.disabled),true,'failed runtime requires compatibility recheck');
 await click('#surface-check');await page.waitForFunction(()=>!document.querySelector('#surface-start').disabled);
 for(const mode of ['denied','source-error']){
  await page.evaluate(mode=>{__xrMode=mode;if(__app.state.hudSurface!=='surfaces')__app.hud.open('surfaces');},mode);await click('#surface-start');await page.waitForFunction(()=>!__app.spatial.pending&&!__app.spatial.active);
  assert.equal(await page.$eval('body',e=>e.classList.contains('surface-active')),false);assert.equal(await page.evaluate(()=>__app.engine.renderer.xr.enabled),false);
 }
 await page.evaluate(()=>{__xrMode='late';if(__app.state.hudSurface!=='surfaces')__app.hud.open('surfaces');});await click('#surface-start');await click('#surface-cancel');
 await page.evaluate(()=>__resolveXR());await page.waitForFunction(()=>!__app.spatial.pending);
 assert.equal(await page.evaluate(()=>__app.spatial.active),false);assert.equal(await page.evaluate(()=>__xrSessions.at(-1).endCount),1,'late permission closed');
 await page.evaluate(()=>{__xrMode='ok';if(__app.state.hudSurface!=='surfaces')__app.hud.open('surfaces');});await click('#surface-start');await page.waitForFunction(()=>__app.spatial.active);
 await page.evaluate(()=>__xrSessions.at(-1).end());await page.waitForFunction(()=>!__app.spatial.active);assert.equal(await page.$eval('#workspace',e=>e.inert),false,'native end restores interface');
 await page.evaluate(()=>{__xrMode='late-source';__app.hud.open('surfaces');});await click('#surface-start');await page.waitForFunction(()=>!!window.__resolveSource);
 await page.evaluate(()=>__xrSessions.at(-1).end());await page.waitForFunction(()=>!__app.spatial.pending);
 await page.evaluate(()=>__xrMode='late');await click('#surface-start');
 await page.evaluate(async()=>{__resolveSource();await new Promise(resolve=>setTimeout(resolve,0));});
 assert.equal(await page.evaluate(()=>__app.spatial.pending),true,'old source completion cannot cancel the new request');
 await page.evaluate(()=>__resolveXR());await page.waitForFunction(()=>__app.spatial.active);await click('#surface-exit');await page.waitForFunction(()=>!__app.spatial.active);
 await page.evaluate(()=>{__xrMode='no-overlay';__app.hud.open('surfaces');document.querySelector('#surface-scope').value='visible';});await click('#surface-start');await page.waitForFunction(()=>__app.spatial.active);
 await page.evaluate(()=>__surfaceFrame('flat'));assert.ok(await page.$eval('#surface-live',e=>e.textContent.includes('Toca la pantalla')));
 await page.evaluate(()=>{__xrSessions.at(-1).dispatchEvent(new Event('select'));__surfaceFrame('flat');});
 assert.equal(await page.evaluate(()=>__arScene.children.find(n=>n.type==='Group').children[0].children[0].children.length),6,'visible collection cloned for AR');
 await page.evaluate(()=>__xrSessions.at(-1).end());await page.waitForFunction(()=>!__app.spatial.active);await page.evaluate(()=>__xrMode='ok');
 for (const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]) {
  await page.setViewport({...viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});await frame();
  await page.evaluate(()=>{if(__app.state.hudSurface!=='surfaces')__app.hud.open('surfaces');});
  const count=await page.$eval('#surfaces',e=>+e.dataset.pageCount);
  for(let i=0;i<count;i++){
   const clipped=await page.$eval('#surfaces',e=>{const clip=e.querySelector('.page-clip').getBoundingClientRect();return [...e.querySelectorAll('.page-content button,.page-content select')].filter(n=>!n.closest('[inert],[hidden]')&&n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.top<clip.top-1||r.bottom>clip.bottom+1}).map(n=>n.id);});assert.deepEqual(clipped,[],JSON.stringify({viewport,i}));
   if(i<count-1)await page.click('#surfaces > .page-navigation > button:last-child');
  }
  await click('#surface-start');await page.waitForFunction(()=>__app.spatial.active);await page.evaluate(()=>__surfaceFrame('flat'));await click('#surface-place');
  const geometry=await page.evaluate(()=>{const header=document.querySelector('.surface-card').getBoundingClientRect(),controls=document.querySelector('.surface-controls').getBoundingClientRect();return {overlap:header.bottom>controls.top,small:[...document.querySelectorAll('#surface-overlay button')].filter(n=>{const r=n.getBoundingClientRect();return r.width<43.9||r.height<43.9||r.left<0||r.right>innerWidth||r.bottom>innerHeight}).map(n=>n.id)};});assert.deepEqual(geometry,{overlap:false,small:[]},JSON.stringify(viewport));
  await click('#surface-exit');await page.waitForFunction(()=>!__app.spatial.active);
 }
 await page.evaluate(()=>{const r=__app.engine.renderer;r.xr.setSession=__originalXR.setSession;r.xr.getReferenceSpace=__originalXR.getReferenceSpace;r.setAnimationLoop=__originalXR.setAnimationLoop;r.render=__originalXR.render;});await frame();
 console.log('PASS: simulated XR lifecycle, required hit-test, horizontal placement, stale/lost tracking, resize/rotation controls, native select, overlay protection, cancellation, permission/source errors and original scene restored. Physical XR device validation pending.');
}).catch(error=>{console.error(error);process.exitCode=1});
