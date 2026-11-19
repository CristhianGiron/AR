const assert=require('node:assert/strict');
const path=require('node:path');
const {run}=require('./harness.cjs');
if(!process.argv.includes('--gears'))process.argv.push('--gears');
run(async({page,click,close,frame,artifacts})=>{
 await close();
 const original=await page.evaluate(()=>({scene:__app.projects.capture(),shadows:__app.engine.renderer.shadowMap.enabled,type:__app.engine.renderer.shadowMap.type,auto:__app.engine.renderer.shadowMap.autoUpdate,casters:__app.state.chosen.mesh.children.map(n=>n.castShadow)}));
 await page.evaluate(()=>{
  const r=__app.engine.renderer;
  window.__effectsOriginal={setSession:r.xr.setSession,getReferenceSpace:r.xr.getReferenceSpace,updateCamera:r.xr.updateCamera,setAnimationLoop:r.setAnimationLoop,render:r.render};
  r.xr.setSession=async()=>{};window.__effectsSpace=new EventTarget();r.xr.getReferenceSpace=()=>__effectsSpace;
  r.setAnimationLoop=cb=>window.__effectsLoop=cb;
  r.xr.updateCamera=camera=>{camera.position.set(.35,.65,.2);camera.lookAt(0,.1,-1);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);};
  r.render=(scene,camera)=>{window.__effectsScene=scene;window.__effectsCamera=camera;__effectsOriginal.render.call(r,scene,camera);};
  const xr=new EventTarget();xr.isSessionSupported=async()=>true;
  xr.requestSession=async()=>{
   const session=new EventTarget();session.visibilityState='visible';session.domOverlayState={type:'screen'};
   session.end=async()=>session.dispatchEvent(new Event('end'));
   session.requestReferenceSpace=async()=>({});session.requestHitTestSource=async()=>({cancel(){}});
   return session;
  };
  Object.defineProperty(navigator,'xr',{configurable:true,value:xr});
  window.__effectsTime=0;window.__anchorMatrix=new __THREE.Matrix4().makeTranslation(0,0,-1).toArray();
  window.__effectsFrame=(matrix=null,tracked=true,step=80)=>{
   __effectsTime+=step;
   __effectsLoop(__effectsTime,{getViewerPose:()=>tracked?{}:null,
    getHitTestResults:()=>matrix?[{getPose:()=>({transform:{matrix}}),createAnchor:()=>Promise.resolve({anchorSpace:{},delete(){}})}]:[],
    getPose:()=>({transform:{matrix:__anchorMatrix}})});
  };
  window.__floor=(x=0,y=0,z=-1)=>new __THREE.Matrix4().makeTranslation(x,y,z).toArray();
  window.__trail=()=>__effectsScene.getObjectByName('Rastro de escaneo AR');
  window.__shadow=()=>__effectsScene.getObjectByName('Sombra sobre superficie AR');
  document.documentElement.style.background='#d8e4eb';
 });
 await page.evaluate(async()=>{__app.hud.open('surfaces');await __app.spatial.support();});await click('#surface-start');await page.waitForFunction(()=>__app.spatial.active);
 await page.evaluate(()=>__effectsFrame());
 assert.equal(await page.evaluate(()=>__trail().visible),false,'no synthetic scan mesh before a measured hit');
 await page.evaluate(()=>__effectsFrame(new __THREE.Matrix4().makeRotationX(Math.PI/2).toArray()));
 assert.equal(await page.evaluate(()=>__trail().userData.samples||0),0,'walls rejected');
 await page.evaluate(()=>{__effectsFrame(__floor(-.2));__effectsFrame(__floor(.2));__effectsFrame(__floor(0,.45));});
 assert.equal(await page.evaluate(()=>__trail().userData.samples),3,'trace retains sampled floor and higher surface');
 const levels=await page.evaluate(()=>[...new Set(Array.from(__trail().geometry.attributes.position.array.slice(0,__trail().geometry.drawRange.count*3)).filter((_,i)=>i%3===1).map(y=>Math.round(y*1000)))]);
 assert.deepEqual(levels.sort((a,b)=>a-b),[2,452],'separate flat patches do not bridge different surface heights');
 await page.evaluate(()=>__effectsFrame(null,true,7100));
 assert.equal(await page.evaluate(()=>__trail().visible),false,'old trace expires');
 await page.evaluate(()=>{for(let i=0;i<80;i++)__effectsFrame(__floor(i*.12));});
 assert.equal(await page.evaluate(()=>__trail().userData.samples),48,'scan memory and geometry are bounded');
 await page.evaluate(()=>__effectsSpace.dispatchEvent(new Event('reset')));
 assert.equal(await page.evaluate(()=>__trail().userData.samples),0,'origin reset removes old coordinates');
 await page.evaluate(()=>{__effectsFrame(__floor(-.2));__effectsFrame(__floor(.2));for(let i=0;i<4;i++)__effectsFrame(__floor());});
 assert.equal(await page.evaluate(()=>__trail().visible),true);
 await page.screenshot({path:path.join(artifacts,'ar-rastro-malla.png')});
 await click('#surface-place');await page.evaluate(()=>__effectsFrame(__floor()));await page.evaluate(()=>{for(let i=0;i<4;i++)__effectsFrame();});
 assert.equal(await page.evaluate(()=>__trail().visible),false,'scan trace hidden once anchored');
 assert.equal(await page.evaluate(()=>__app.engine.renderer.shadowMap.enabled),true);
 assert.deepEqual(await page.evaluate(()=>{const s=__shadow();return {height:s.position.y,receiver:s.receiveShadow,material:s.material.type,transparent:s.material.transparent,parent:s.parent===__effectsScene.children.find(n=>n.type==='Group')};}),{height:.001,receiver:true,material:'ShadowMaterial',transparent:true,parent:true});
 await page.evaluate(()=>{__shadow().visible=false;__effectsOriginal.render.call(__app.engine.renderer,__effectsScene,__effectsCamera);});
 const reference=await page.screenshot({encoding:'base64'});
 await page.evaluate(()=>{__shadow().visible=true;__effectsOriginal.render.call(__app.engine.renderer,__effectsScene,__effectsCamera);});
 const shaded=await page.screenshot({encoding:'base64'});
 require('node:fs').writeFileSync(path.join(artifacts,'ar-sombra-superficie.png'),Buffer.from(shaded,'base64'));
 const darker=await page.evaluate(async([before,after])=>{
  const decode=async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
  const a=await decode(before),b=await decode(after);let count=0;
  for(let i=0;i<a.length;i+=4)if(a[i]+a[i+1]+a[i+2]-b[i]-b[i+1]-b[i+2]>25)count++;
  return count;
 },[reference,shaded]);
 assert.ok(darker>30,'receiver paints a visible shadow without an opaque floor: '+darker);
 const planeBefore=await page.evaluate(()=>{const s=__shadow();return {position:s.getWorldPosition(new __THREE.Vector3()).toArray(),orientation:s.getWorldQuaternion(new __THREE.Quaternion()).toArray()};});
 await page.evaluate(()=>{const root=__effectsScene.children.find(n=>n.type==='Group');root.children[0].rotation.set(.4,.5,.2);__effectsFrame();});
 assert.deepEqual(await page.evaluate(()=>{const s=__shadow();return {position:s.getWorldPosition(new __THREE.Vector3()).toArray(),orientation:s.getWorldQuaternion(new __THREE.Quaternion()).toArray()};}),planeBefore,'shadow receiver remains flush with anchor when content rotates');
 await page.evaluate(()=>__effectsFrame(null,false));assert.equal(await page.evaluate(()=>__shadow().parent.visible),false,'lost tracking hides shadow with the model');
 await page.evaluate(()=>{for(let i=0;i<4;i++)__effectsFrame();});
 assert.equal(await page.evaluate(()=>__shadow().parent.visible),true,'same anchor recovers its shadow');
 await page.evaluate(()=>{
  window.__disposedEffects={grid:false,plane:false,map:false};
  __trail().geometry.addEventListener('dispose',()=>__disposedEffects.grid=true);
  __shadow().geometry.addEventListener('dispose',()=>__disposedEffects.plane=true);
  __effectsScene.getObjectByName('Luz para sombra AR').shadow.map.addEventListener('dispose',()=>__disposedEffects.map=true);
 });
 await click('#surface-exit');await page.waitForFunction(()=>!__app.spatial.active);
 assert.deepEqual(await page.evaluate(()=>__disposedEffects),{grid:true,plane:true,map:true},'AR-owned GPU resources released');
 assert.deepEqual(await page.evaluate(()=>({scene:__app.projects.capture(),shadows:__app.engine.renderer.shadowMap.enabled,type:__app.engine.renderer.shadowMap.type,auto:__app.engine.renderer.shadowMap.autoUpdate,casters:__app.state.chosen.mesh.children.map(n=>n.castShadow)})),original,'lab scene and renderer restored');
 await page.evaluate(()=>{const r=__app.engine.renderer;r.xr.setSession=__effectsOriginal.setSession;r.xr.getReferenceSpace=__effectsOriginal.getReferenceSpace;r.xr.updateCamera=__effectsOriginal.updateCamera;r.setAnimationLoop=__effectsOriginal.setAnimationLoop;r.render=__effectsOriginal.render;});await frame();
 console.log('PASS: measured scan trail, different surface heights, expiry/cap/reset, transparent native-plane shadow with painted pixels, fixed receiver under object rotation, tracking recovery, GPU cleanup and lab restoration. Physical XR validation pending.');
}).catch(e=>{console.error(e);process.exitCode=1;});
