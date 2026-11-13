const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {run}=require('./harness.cjs');
run(async({page,select,click,frame,close,openMenuAction,artifacts,load})=>{
 await select('sensor-ultrasonico');await click('#object-inspect');await click('#open-experiment');
 assert.equal(await page.evaluate(()=>__app.state.hudSurface),'echo-experiment');
 await click('#echo-explore');await frame();
 assert.equal(await page.$eval('#echo-lab',e=>e.hidden),false);
 const position=()=>page.$eval('#echo-obstacle-handle',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await page.focus('#echo-obstacle-handle');await page.keyboard.press('Home');await frame();const near=await position();
 assert.equal(await page.$eval('#echo-obstacle-handle',e=>e.getAttribute('aria-valuenow')),'20');
 await page.keyboard.press('End');await frame();const far=await position();
 assert.equal(await page.$eval('#echo-obstacle-handle',e=>e.getAttribute('aria-valuenow')),'200');
 await page.evaluate(()=>__app.experiment.echo.setDistance(100));await frame();const start=await position();
 await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+(far.x-near.x)*.2,start.y+(far.y-near.y)*.2,{steps:6});await page.mouse.up();await frame();
 assert.ok(await page.evaluate(()=>__app.state.chosen.echoActivity.distanceCm>120),'drag handle changes distance');
 // The body itself, beyond the HTML handle, must be directly draggable.
 const geometry=await page.evaluate(()=>{
  const box=__app.experiment.echo.group.children[0],camera=__app.engine.camera,canvas=__app.engine.canvas;
  const points=[[.37,.25,.05],[-.37,.25,.05],[.37,-.25,.05],[-.37,-.25,.05]];
  for(const coordinates of points){const p=box.localToWorld(new __THREE.Vector3(...coordinates)).project(camera);const x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;if(document.elementFromPoint(x,y)===canvas)return{x,y};}
  return null;
 });assert.ok(geometry,'body is visible outside slider handle');
 const before=await page.evaluate(()=>({distance:__app.state.chosen.echoActivity.distanceCm,position:__app.state.chosen.anchor.position.toArray(),rotation:__app.state.chosen.rot.slice()}));
 await page.mouse.move(geometry.x,geometry.y);await page.mouse.down();await page.mouse.move(geometry.x-(far.x-near.x)*.15,geometry.y-(far.y-near.y)*.15,{steps:6});await page.mouse.up();await frame();
 const after=await page.evaluate(()=>({distance:__app.state.chosen.echoActivity.distanceCm,position:__app.state.chosen.anchor.position.toArray(),rotation:__app.state.chosen.rot.slice()}));
 assert.ok(after.distance<before.distance,'drag real obstacle body');assert.deepEqual(after.position,before.position);assert.deepEqual(after.rotation,before.rotation);
 await page.screenshot({path:path.join(artifacts,'echo-direct.png')});
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 async function audit(){return page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))}));});}
 assert.deepEqual(await audit(),[],'direct echo controls');
 await click('#echo-scene-present');await frame();assert.ok(await page.$eval('#echo-scene-reading',e=>e.textContent.includes('Sin eco')));
 assert.equal(await page.$eval('#echo-obstacle-handle',e=>e.hidden),true);
 // Complete the new mission through actual panels, including absence of echo.
 await openMenuAction('my-scene');await click('#open-missions');await page.select('#mission-select','eco');await click('#mission-go');
 await click('#parts-list button:nth-child(1)');await click('#parts-list button:nth-child(2)');await click('#parts [data-return-card]');await click('#mission-next');await click('#mission-go');
 await click('#echo-record');await click('#echo-present');
 for(let i=0;i<9;i++)await click('#echo-nearer');await click('#echo-record');
 for(let i=0;i<9;i++)await click('#echo-farther');await click('#echo-record');
 await click('#echo-experiment [data-return-card]');await click('#mission-next');await click('#mission-go');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'echo-explanation');
 await page.type('#echo-explanation','El sonido debe ir y volver; si está cerca, el robot se detiene.');await click('#echo-experiment [data-return-card]');await click('#mission-next');await click('#mission-go');
 await click('#learning-choices button:nth-child(3)');await click('#challenge [data-return-card]');await frame();
 assert.deepEqual(await page.evaluate(()=>__app.missions.results()),[true,true,true,true]);
 const client=await page.createCDPSession();await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:artifacts});
 const report=path.join(artifacts,'explorar-mision-eco.txt');fs.rmSync(report,{force:true});await click('#mission-evidence');
 for(let i=0;i<100&&!fs.existsSync(report);i++)await new Promise(r=>setTimeout(r,100));
 const text=fs.readFileSync(report,'utf8');assert.ok(text.includes('Sin eco'));assert.ok(text.includes('200 cm'));assert.ok(text.includes('20 cm'));
 const saved=await page.evaluate(()=>__app.projects.capture());await load();await page.evaluate(data=>__app.projects.restore(data),saved);await frame();
 assert.deepEqual(await page.evaluate(()=>__app.missions.results()),[true,true,true,true]);
 assert.equal(await page.evaluate(()=>__app.state.chosen.echoActivity.observations.length),3);
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const reports=[];
 for(const viewport of [{width:1280,height:900},{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
  await close();await page.setViewport({...viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});await frame();
  await page.evaluate(()=>{const data=__app.state.chosen.echoActivity;data.observations=Array.from({length:12},(_,i)=>({distanceCm:20+15*i,present:i%3!==0}));__app.experiment.render(null);__app.experiment.render(__app.state.chosen);__app.hud.open('echo-experiment');});await frame();
  await page.$eval('#echo-precision',e=>e.open=true);await page.evaluate(()=>__app.pagination.refresh(document.querySelector('#echo-experiment'),true));
  const count=await page.$eval('#echo-experiment',e=>+e.dataset.pageCount);
  for(let i=0;i<count;i++){
   const clipped=await page.$eval('#echo-experiment',e=>{const clip=e.querySelector('.page-clip').getBoundingClientRect();return [...e.querySelectorAll('.page-content button,.page-content input,.page-content textarea,.page-content li')].filter(n=>!n.closest('[hidden],[inert]')&&n.getClientRects().length).filter(n=>{for(let p=n.parentElement;p!==e;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)return false;const r=n.getBoundingClientRect();return r.top<clip.top-1||r.bottom>clip.bottom+1}).map(n=>n.id||n.textContent);});
   assert.deepEqual(clipped,[],JSON.stringify({viewport,i}));
   const smallTargets=await page.$eval('#echo-experiment',root=>[...root.querySelectorAll('button,input,textarea,summary')].filter(n=>!n.closest('[hidden],[inert]')&&n.getClientRects().length).filter(n=>{
    for(let p=n.parentElement;p&&p!==root;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open&&!p.querySelector('summary')?.contains(n))return false;
    const target=n.type==='checkbox'?n.closest('label'):n,r=target.getBoundingClientRect();return r.width<43.9||r.height<43.9;
   }).map(n=>n.id||n.textContent));assert.deepEqual(smallTargets,[],JSON.stringify({viewport,i,reason:'touch targets'}));
   const violations=await audit();reports.push({viewport,page:i,violations,smallTargets});
   if(i===0)await page.screenshot({path:path.join(artifacts,'echo-panel-'+viewport.width+'.png')});
   if(i<count-1)await page.click('#echo-experiment > .page-navigation > button:last-child');
  }
 }
 fs.writeFileSync(path.join(artifacts,'echo-accessibility.json'),JSON.stringify(reports,null,2));assert.deepEqual(reports.filter(r=>r.violations.length),[]);
 await close();await click('#mission-resume');await click('#mission-end');
 await select('sensor-luz-ldr');await click('#object-inspect');await click('#open-experiment');await click('#experiment-explore');await frame();
 assert.equal(await page.evaluate(()=>__app.experiment.echo.group.visible),false,'echo leaves no scene overlays after switching');
 await select('sensor-ultrasonico');await click('#object-inspect');await click('#open-experiment');
 await page.evaluate(()=>__app.interface.select(__app.state.entries.find(e=>e.type==='sensor-pir')));assert.equal(await page.evaluate(()=>__app.state.hudSurface),null,'incompatible selection closes old laboratory');
 await select('sensor-ultrasonico');await click('#object-inspect');await click('#open-experiment');await page.evaluate(()=>__app.interface.select(null));assert.equal(await page.evaluate(()=>__app.state.hudSurface),null,'clearing selection closes object data');
 console.log('PASS: direct 3D obstacle and handle drag, keyboard, missing echo, complete robot mission, evidence and portable scene restore; '+reports.length+' accessible pages across 4 viewports; LDR preserved.');
}).catch(e=>{console.error(e);process.exitCode=1});
