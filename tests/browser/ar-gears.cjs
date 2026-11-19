const assert = require('node:assert/strict');
const path = require('node:path');
const {run}=require('./harness.cjs');
if(!process.argv.includes('--gears'))process.argv.push('--gears');
run(async({page,click,close,frame,artifacts})=>{
 await close();
 await page.evaluate(()=>{
  const r=__app.engine.renderer;
  window.__original={setSession:r.xr.setSession,getReferenceSpace:r.xr.getReferenceSpace,updateCamera:r.xr.updateCamera,setAnimationLoop:r.setAnimationLoop,render:r.render};
  r.xr.setSession=async()=>{};r.xr.getReferenceSpace=()=>new EventTarget();r.setAnimationLoop=cb=>window.__arCallback=cb;
  r.xr.updateCamera=camera=>{camera.position.set(0,.35,0);camera.lookAt(0,.2,-1);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);};
  r.render=(scene,camera)=>{window.__arScene=scene;window.__arCamera=camera;__original.render.call(r,scene,camera);};
  const xr=new EventTarget();xr.isSessionSupported=async()=>true;
  xr.requestSession=async()=>{
   const session=new EventTarget();session.visibilityState='visible';session.domOverlayState={type:'screen'};
   session.end=async()=>session.dispatchEvent(new Event('end'));
   session.requestReferenceSpace=async()=>({});session.requestHitTestSource=async()=>({cancel(){}});
   window.__arSession=session;return session;
  };
  Object.defineProperty(navigator,'xr',{configurable:true,value:xr});
  window.__arTime=0;window.__arTick=(tracked=true)=>{
   __arTime+=80;const matrix=new __THREE.Matrix4().makeTranslation(0,0,-1).toArray();
   __arCallback(__arTime,{getViewerPose:()=>tracked?{}:null,getHitTestResults:()=>[{getPose:()=>({transform:{matrix}}),createAnchor:()=>Promise.resolve({anchorSpace:{},delete(){}})}],getPose:()=>({transform:{matrix}})});
  };
  window.__arFrames=(n=5,tracked=true)=>{for(let i=0;i<n;i++)__arTick(tracked);};
  window.__arRoot=()=>__arScene.children.find(n=>n.type==='Group');
 });
 const cdp=await page.createCDPSession();
 async function touch(points,type){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});}
 async function enter(){
  await page.evaluate(async()=>{__app.hud.open('surfaces');await __app.spatial.support();});await click('#surface-start');
  await page.waitForFunction(()=>__app.spatial.active);await page.evaluate(()=>{
   const overlay=document.querySelector('#surface-overlay');
   overlay.style.contain='paint';overlay.style.background='transparent';
   __arFrames();
  });
  await click('#surface-place');await page.evaluate(()=>__arTick());await page.evaluate(()=>__arFrames());
 }
 for(const type of ['rectos','conicos','helicoidales','transmision']){
  await page.evaluate(async type=>__app.gears.selectModel('engranajes-'+type),type);await close();await frame();
  const normalMotion=await page.evaluate(()=>{
   const item=__app.state.chosen,m=item.mechanism,centers=m.parts.map(p=>p.pivot.position.toArray());
   m.state.running=true;__app.gears.suspend();__app.gears.updateFrame(1000);
   const initial=m.state.angle;__app.gears.updateFrame(1100);m.state.running=false;__app.gears.suspend();
   return {delta:m.state.angle-initial,expected:.1*m.state.rpm*Math.PI/30*m.state.direction,centers,after:m.parts.map(p=>p.pivot.position.toArray())};
  });
  assert.ok(Math.abs(normalMotion.delta-normalMotion.expected)<1e-9,'normal lab still advances the shared motor');
  assert.deepEqual(normalMotion.centers,normalMotion.after,'normal lab axes stay fixed');
  await frame();
  assert.ok(await page.$$eval('#gear-telemetry .gear-readout',nodes=>nodes.filter(n=>!n.hidden).length)>0,'normal lab readouts still visible');
  const before=await page.evaluate(()=>__app.projects.capture());
  const sourcePivots=await page.evaluate(()=>__app.state.chosen.mechanism.parts.map(p=>p.pivot.quaternion.toArray()));
  await enter();
  assert.equal(await page.$eval('#surface-play',e=>e.hidden),false);
  assert.equal(await page.$eval('#surface-telemetry',e=>e.hidden),false,'AR readouts visible');
  const readouts=await page.$$eval('#surface-telemetry .gear-readout',nodes=>nodes.filter(n=>!n.hidden).map(n=>n.textContent));
  assert.ok(readouts.length>0,'at least one part readout fits');
  assert.ok(readouts.every(t=>t.includes('dientes')&&t.includes('rpm')),'same speed and tooth labels as lab');
  assert.ok(await page.evaluate(()=>{let found=false;__arScene.traverse(n=>{if(n.isSprite&&n.visible)found=true;});return found;}),'name label rendered in AR');
  const connectors=await page.$$eval('#surface-telemetry-lines path',paths=>paths.filter(p=>getComputedStyle(p).display!=='none').map(p=>({stroke:getComputedStyle(p).stroke,width:parseFloat(getComputedStyle(p).strokeWidth),length:p.getTotalLength()})));
  assert.equal(connectors.length,readouts.length,'every displayed gear card has its connector');
  assert.ok(connectors.every(p=>p.stroke!=='none'&&p.width>=3&&p.length>8),'AR connectors have explicit visible stroke');
  const nameWidth=await page.evaluate(()=>{let value=0;__arScene.traverse(n=>{if(n.isSprite&&n.visible&&n.userData.screenBounds)value=Math.max(value,n.userData.screenBounds.width);});return value;});
  assert.ok(nameWidth>=260,'AR name card is enlarged independently of normal 3D');
  const pixelWidth=await page.evaluate(()=>{
   let width=0;__arScene.traverse(n=>{
    if(!n.isSprite||!n.visible||!n.userData.screenBounds)return;
    const center=n.getWorldPosition(new __THREE.Vector3()).applyMatrix4(__arCamera.matrixWorldInverse),scale=n.getWorldScale(new __THREE.Vector3());
    width=Math.max(width,scale.x*__arCamera.projectionMatrix.elements[0]*document.querySelector('#surface-overlay').clientWidth/(-2*center.z));
   });return width;
  });
  assert.ok(pixelWidth>=260,'actual projected name stays readable');
  const screenshot=await page.screenshot({encoding:'base64'});
  const painted=await page.evaluate(async base64=>{
   const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
   return [...document.querySelectorAll('#surface-telemetry-lines path')].filter(p=>getComputedStyle(p).display!=='none').map(p=>{
    const rgb=getComputedStyle(p).stroke.match(/\d+/g).map(Number),matrix=p.getScreenCTM(),length=p.getTotalLength();
    let matches=0;
    for(let fraction=.15;fraction<.9;fraction+=.05){
     const point=p.getPointAtLength(length*fraction).matrixTransform(matrix);
     for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      const x=Math.round(point.x)+dx,y=Math.round(point.y)+dy;
      if(x<0||y<0||x>=canvas.width||y>=canvas.height)continue;
      const pixel=ctx.getImageData(x,y,1,1).data;
      if(rgb.reduce((sum,v,i)=>sum+Math.abs(v-pixel[i]),0)<75)matches++;
     }
    }return matches;
   });
  },screenshot);
  assert.ok(painted.length&&painted.every(count=>count>=3),'every gear connector paints visible colored pixels: '+painted);

  const rootBefore=await page.evaluate(()=>{const r=__arRoot();r.updateMatrix();return r.matrix.toArray();});
  const pivotAngles=()=>page.evaluate(()=>{const nodes=[];__arScene.traverse(n=>{if(n.name.startsWith('Eje '))nodes.push(n.quaternion.toArray());});return nodes;});
  const beforePlay=await pivotAngles();await click('#surface-play');await page.evaluate(()=>__arFrames(8));
  assert.notDeepEqual(await pivotAngles(),beforePlay,'cloned wheels animate around their own pivots');
  assert.deepEqual(await page.evaluate(()=>__app.state.chosen.mechanism.parts.map(p=>p.pivot.quaternion.toArray())),sourcePivots,'source wheels are unchanged');
  await click('#surface-play');const paused=await pivotAngles();await page.evaluate(()=>__arFrames());assert.deepEqual(await pivotAngles(),paused,'AR pause stops wheels');
  await page.evaluate(()=>document.querySelector('#surface-gesture').style.pointerEvents='none');
  const contentBefore=await page.evaluate(()=>__arRoot().children[0].quaternion.toArray());
  await touch([[1,190,260]],'touchStart');await touch([[1,245,290]],'touchMove');await touch([],'touchEnd');
  assert.notDeepEqual(await page.evaluate(()=>__arRoot().children[0].quaternion.toArray()),contentBefore,'one-finger rotation');
  const twistBefore=await page.evaluate(()=>__arRoot().children[0].rotation.z);
  await touch([[1,170,260],[2,250,260]],'touchStart');await touch([[1,180,240],[2,240,280]],'touchMove');await touch([],'touchEnd');
  assert.notEqual(await page.evaluate(()=>__arRoot().children[0].rotation.z),twistBefore,'two-finger twist');
  const fallbackBefore=await page.evaluate(()=>__arRoot().children[0].rotation.y);
  await page.evaluate(()=>{
   const root=document.querySelector('#surface-overlay');
   const touch=(type,x,y)=>root.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[new Touch({identifier:77,target:root,clientX:x,clientY:y})],changedTouches:[new Touch({identifier:77,target:root,clientX:x,clientY:y})]}));
   touch('touchstart',180,260);touch('touchmove',230,285);touch('touchend',230,285);
  });
  assert.notEqual(await page.evaluate(()=>__arRoot().children[0].rotation.y),fallbackBefore,'legacy touch events also rotate');
  const noCaptureBefore=await page.evaluate(()=>__arRoot().children[0].rotation.y);
  await page.evaluate(()=>{
   const root=document.querySelector('#surface-overlay'),capture=root.setPointerCapture;
   root.setPointerCapture=()=>{throw new DOMException('No native pointer','NotFoundError');};
   for(const [type,x] of [['pointerdown',180],['pointermove',225],['pointerup',225]])root.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:91,button:0,clientX:x,clientY:260}));
   root.setPointerCapture=capture;
  });
  assert.notEqual(await page.evaluate(()=>__arRoot().children[0].rotation.y),noCaptureBefore,'immersive pointer capture failure does not break rotation');
  await page.evaluate(()=>__arFrames());
  assert.deepEqual(await page.evaluate(()=>{const r=__arRoot();r.updateMatrix();return r.matrix.toArray();}),rootBefore,'gestures and motor preserve anchor transform');
  await page.focus('#surface-gesture');const keyBefore=await page.evaluate(()=>__arRoot().children[0].rotation.y);await page.keyboard.press('ArrowRight');
  assert.notEqual(await page.evaluate(()=>__arRoot().children[0].rotation.y),keyBefore,'keyboard rotation');
  await page.evaluate(()=>__arTick(false));assert.equal(await page.$eval('#surface-telemetry',e=>e.hidden),true,'lost tracking hides callouts');
  await page.evaluate(()=>__arTick());assert.equal(await page.$eval('#surface-telemetry',e=>e.hidden),true,'callouts wait for anchor recovery');
  await page.evaluate(()=>__arFrames());assert.equal(await page.$eval('#surface-telemetry',e=>e.hidden),false,'callouts recover with the anchor');
  await page.screenshot({path:path.join(artifacts,'ar-'+type+'.png')});
  await click('#surface-exit');await page.waitForFunction(()=>!__app.spatial.active);
  assert.equal(await page.$$eval('#surface-telemetry .gear-readout',n=>n.length),0,'temporary readouts disposed');
  assert.deepEqual(await page.evaluate(()=>__app.projects.capture()),before,'AR motor and gestures do not change saved scene');
 }
 // Native XR screen input can rotate without DOM Pointer/Touch events.
 await enter();
 await page.evaluate(()=>{
  const canvas=__app.engine.canvas;window.__canvasRect=canvas.getBoundingClientRect;
  canvas.getBoundingClientRect=()=>new DOMRect(0,0,innerWidth*2,innerHeight*2);
  __arFrames();
 });
 const viewportNameWidth=await page.evaluate(()=>{
  let width=0;__arScene.traverse(n=>{if(n.isSprite&&n.visible&&n.userData.screenBounds){
   const center=n.getWorldPosition(new __THREE.Vector3()).applyMatrix4(__arCamera.matrixWorldInverse),scale=n.getWorldScale(new __THREE.Vector3());
   width=Math.max(width,scale.x*__arCamera.projectionMatrix.elements[0]*innerWidth/(-2*center.z));
  }});return width;
 });
 assert.ok(viewportNameWidth>=260,'name size uses XR overlay even when lab canvas dimensions differ');
 await page.evaluate(()=>__app.engine.canvas.getBoundingClientRect=__canvasRect);
 const nativeBefore=await page.evaluate(()=>__arRoot().children[0].rotation.y);
 await page.evaluate(()=>{
  window.__screenInput={targetRayMode:'screen',targetRaySpace:{screen:true}};
  const event=new Event('selectstart');event.inputSource=__screenInput;__arSession.dispatchEvent(event);
  const matrix=new __THREE.Matrix4().makeTranslation(0,0,-1).toArray();
  const tick=x=>{
   __arTime+=80;
   __arCallback(__arTime,{getViewerPose:()=>({}),getHitTestResults:()=>[],getPose:space=>({transform:{matrix:space.screen?new __THREE.Matrix4().makeTranslation(x,0,0).toArray():matrix}})});
  };
  tick(0);tick(.15);
  const ended=new Event('selectend');ended.inputSource=__screenInput;__arSession.dispatchEvent(ended);
 });
 assert.notEqual(await page.evaluate(()=>__arRoot().children[0].rotation.y),nativeBefore,'XR screen ray rotates without DOM events');
 await click('#surface-exit');await page.waitForFunction(()=>!__app.spatial.active);
 // Check actual visible control geometry and callout exclusion at mobile and landscape sizes.
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
  await page.setViewport({...viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});await frame();await enter();
  const layout=await page.evaluate(()=>{
   const obstacles=[...document.querySelectorAll('.surface-card,.surface-controls')].map(n=>n.getBoundingClientRect());
   const bad=[...document.querySelectorAll('#surface-overlay button')].filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44||r.left<0||r.right>innerWidth||r.bottom>innerHeight;}).map(n=>n.id);
   const blocked=[...document.querySelectorAll('#surface-telemetry .gear-readout')].filter(n=>!n.hidden).filter(n=>{const r=n.getBoundingClientRect();return obstacles.some(o=>Math.min(r.right,o.right)>Math.max(r.left,o.left)&&Math.min(r.bottom,o.bottom)>Math.max(r.top,o.top));}).length;
   return {bad,blocked,overlap:obstacles[0].bottom>obstacles[1].top};
  });assert.deepEqual(layout,{bad:[],blocked:0,overlap:false},JSON.stringify(viewport));
  const audit=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
  assert.deepEqual(audit,[]);
  await page.screenshot({path:path.join(artifacts,'ar-controls-'+viewport.width+'.png')});
  await click('#surface-exit');await page.waitForFunction(()=>!__app.spatial.active);
 }
 await page.evaluate(()=>{const r=__app.engine.renderer;r.xr.setSession=__original.setSession;r.xr.getReferenceSpace=__original.getReferenceSpace;r.xr.updateCamera=__original.updateCamera;r.setAnimationLoop=__original.setAnimationLoop;r.render=__original.render;});await frame();
 console.log('PASS: normal lab motor/readouts, AR labels, gear animation and pause for four mechanisms, touch drag/twist, legacy touch, capture failure, native XR input, actual projected name size, painted connector pixels, separate XR viewport, keyboard rotation, unchanged anchors/source scenes, recovery, disposal, responsive controls and accessibility. Native XR device validation pending.');
}).catch(e=>{console.error(e);process.exitCode=1;});
