const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./harness.cjs');
run(async({page,click,openMenuAction,frame,close,load,artifacts})=>{
 await openMenuAction('my-scene');await click('#open-missions');
 assert.equal(await page.evaluate(()=>__app.state.missionId),'luz');
 await click('#mission-go');assert.equal(await page.evaluate(()=>__app.state.hudSurface),'parts');
 await click('#parts-list button:nth-child(1)');await click('#parts-list button:nth-child(2)');await click('#parts [data-return-card]');
 assert.equal(await page.evaluate(()=>__app.state.hudSurface),'missions');
 await click('#mission-next');await click('#mission-go');
 await click('#more-light');await click('#record-observation');await click('#less-light');await click('#less-light');await click('#record-observation');await click('#experiment [data-return-card]');
 await click('#mission-next');await click('#mission-go');
 await page.type('#experiment-explanation','Cuando aumento la luz, la resistencia disminuye.');await click('#experiment [data-return-card]');
 await click('#mission-next');await click('#mission-go');await click('#learning-choices button:nth-child(2)');await click('#challenge [data-return-card]');
 await frame();assert.deepEqual(await page.evaluate(()=>__app.missions.results()),[true,true,true,true]);
 assert.equal(await page.$eval('#mission-finished',e=>e.hidden),false);
 const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:artifacts});
 const report=path.join(artifacts,'explorar-mision-luz.txt');fs.rmSync(report,{force:true});await click('#mission-evidence');
 for(let i=0;i<100&&!fs.existsSync(report);i++)await new Promise(r=>setTimeout(r,100));
 assert.ok(fs.existsSync(report));const text=fs.readFileSync(report,'utf8');assert.equal(text.split('[Con evidencia]').length-1,4);assert.ok(text.includes('resistencia disminuye'));
 // Compare sensors and retain the student's own justification, without grading its quality.
 await page.select('#mission-select','infrarrojos');
 await page.evaluate(()=>{__app.interface.select(__app.state.entries.find(e=>e.type==='sensor-pir'));__app.history.removeSelected();});await click('#mission-resume');
 for(let index=0;index<4;index++){
  await click('#mission-go');
  await page.waitForFunction(index=>!__app.state.pendingLoads&&__app.state.hudSurface===(index<2?'parts':'challenge'),{},index);
  if(index<2)await click('#parts-list button:first-child');
  else await click('#learning-choices button:nth-child('+(index===2?2:1)+')');
  await page.keyboard.press('Escape');await click('#mission-next');
 }
 await click('#mission-reflection');await page.type('#mission-reflection','Elegiría el PIR porque detecta cambios asociados al movimiento.');await frame();
 assert.deepEqual(await page.evaluate(()=>__app.missions.results()),[true,true,true,true,true]);
 const saved=await page.evaluate(()=>__app.projects.capture());assert.equal(saved.journey.id,'infrarrojos');assert.equal(saved.journey.step,4);
 await load();await page.evaluate(async data=>__app.projects.restore(data),saved);await click('#mission-resume');
 assert.deepEqual(await page.evaluate(()=>__app.missions.results()),[true,true,true,true,true]);
 assert.ok(await page.$eval('#mission-reflection',e=>e.value.includes('PIR')));
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 for(const viewport of [{width:1280,height:900},{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
  await close();await page.setViewport({...viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});await frame();await click('#mission-resume');
  for(const step of ['infrarrojos','luz']){
   await page.select('#mission-select',step);await frame();
   const count=await page.$eval('#missions',e=>+e.dataset.pageCount);
   for(let i=0;i<count;i++){
    const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});
    assert.deepEqual(audit,[],JSON.stringify({viewport,step,i}));
    const clipped=await page.$eval('#missions',e=>{const clip=e.querySelector('.page-clip').getBoundingClientRect();return [...e.querySelectorAll('.page-content button,.page-content select,.page-content textarea')].filter(n=>!n.closest('[hidden],[inert]')&&n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.top<clip.top-1||r.bottom>clip.bottom+1}).map(n=>n.id);});
    assert.deepEqual(clipped,[],JSON.stringify({viewport,step,i}));
    if(i===0)await page.screenshot({path:path.join(artifacts,'mission-'+step+'-'+viewport.width+'.png')});
    if(i<count-1)await page.click('#missions > .page-navigation > button:last-child');
   }
  }
 }
 await click('#mission-end');assert.equal(await page.evaluate(()=>__app.state.missionId),null);assert.equal(await page.$eval('#mission-resume',e=>e.hidden),true);
 await load('?no-missions=1');assert.equal(await page.$eval('#open-missions',e=>e.disabled),true);assert.equal(await page.evaluate(()=>__app.state.entries.length),6);
 console.log('PASS: two complete guided missions, evidence download, scene round trip, focus returns to mission, optional free exploration; accessible pages across 4 viewports.');
}).catch(e=>{console.error(e);process.exitCode=1});
