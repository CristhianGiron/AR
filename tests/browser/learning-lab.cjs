const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {run}=require('./harness.cjs');
run(async({page,select,click,close,frame,artifacts})=>{
 const ids=await page.evaluate(()=>__app.state.entries.map(i=>i.type));
 for(const id of ids){
  await select(id);
  const parts=await page.evaluate(()=>__app.parts.partsFor(__app.state.chosen).map(p=>({name:p.nombre,valid:!p.box.isEmpty()})));
  assert.ok(parts.length>=2&&parts.every(p=>p.valid),id+': anchors on actual model nodes');
 }
 await select('sensor-luz-ldr');await click('#object-inspect');await click('#open-parts');
 await click('#parts-list button');assert.equal(await page.evaluate(()=>__app.state.chosen.partsVisited.length),1);
 await click('#parts-explore');await frame();
 assert.equal(await page.$eval('#part-markers',e=>e.hidden),false);
 await page.screenshot({path:path.join(artifacts,'parts-direct.png')});
 let marker=await page.$('.part-marker:not([hidden])');assert.ok(marker,'visible part');await marker.click();
 assert.equal(await page.evaluate(()=>__app.state.hudSurface),'parts');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__app.state.hudSurface),'inspector');
 await click('#open-experiment');await click('#experiment-explore');await frame();
 assert.equal(await page.$eval('#part-markers',e=>e.hidden),true,'one exploration overlay at a time');
 await page.focus('#virtual-lamp');await page.keyboard.press('Home');
 assert.equal(await page.$eval('#virtual-lamp',e=>e.getAttribute('aria-valuenow')),'0');
 await page.keyboard.press('End');assert.equal(await page.$eval('#virtual-lamp',e=>e.getAttribute('aria-valuenow')),'100');
 // Direct pointer drag is the primary control; keyboard and +/- are alternatives.
 const lamp=await page.$eval('#virtual-lamp',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await page.mouse.move(lamp.x,lamp.y);await page.mouse.down();await page.mouse.move(lamp.x-100,lamp.y,{steps:5});await page.mouse.up();
 assert.ok(await page.evaluate(()=>__app.state.chosen.activity.distance<1),'drag changes light distance');
 await page.screenshot({path:path.join(artifacts,'light-direct.png')});
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const directAudit=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});
 assert.deepEqual(directAudit,[],'direct scene controls accessibility');
 await click('#lamp-details');await click('#more-light');await click('#record-observation');await click('#less-light');await click('#record-observation');
 await click('#experiment-explanation');await page.type('#experiment-explanation','Al alejar la luz, la resistencia aumenta.');
 assert.equal(await page.evaluate(()=>__app.state.chosen.activity.observations.length),2);
 assert.ok((await page.evaluate(()=>__app.projects.capture())).entries.some(e=>e.activity?.explanation.includes('aumenta')));
 await click('#experiment-respond');await click('#learning-choices button:nth-child(2)');
 assert.ok(await page.$eval('#learning-feedback',e=>e.classList.contains('correct')));
 await page.keyboard.press('Escape');await click('#open-experiment');await click('#experiment-save');assert.equal(await page.evaluate(()=>__app.state.hudSurface),'projects');
 const reports=[];
 for(const viewport of [{width:1280,height:900},{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
  await close();await page.setViewport({...viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});await frame();
  await page.evaluate(()=>{const a=__app.state.chosen.activity;a.observations=Array.from({length:12},(_,i)=>({distance:i/11}));__app.experiment.render(null);__app.experiment.render(__app.state.chosen);});
  for(const surface of ['parts','experiment','projects']){
   await close();await page.evaluate(s=>__app.hud.open(s),surface);
   const count=await page.$eval('#'+surface,e=>+e.dataset.pageCount);
   for(let index=0;index<count;index++){
    const geometry=await page.$eval('#'+surface,e=>{
     const clip=e.querySelector('.page-clip').getBoundingClientRect();
     const controls=[...e.querySelectorAll('.page-content button,.page-content input,.page-content textarea,.page-content meter,.page-content li')].filter(n=>!n.closest('[hidden],[inert]')&&n.getClientRects().length);
     return{overflow:e.scrollWidth>e.clientWidth+1,clipped:controls.filter(n=>{const r=n.getBoundingClientRect();return r.top<clip.top-1||r.bottom>clip.bottom+1}).map(n=>n.id||n.textContent)};
    });assert.equal(geometry.overflow,false,JSON.stringify({viewport,surface,index,geometry}));assert.deepEqual(geometry.clipped,[],JSON.stringify({viewport,surface,index,geometry}));
    const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))}));});
    reports.push({viewport,surface,index,violations:audit});
    if(index===0)await page.screenshot({path:path.join(artifacts,surface+'-'+viewport.width+'.png')});
    if(index<count-1)await page.click('#'+surface+' > .page-navigation > button:last-child');
   }
  }
 }
 fs.writeFileSync(path.join(artifacts,'learning-lab-accessibility.json'),JSON.stringify(reports,null,2));
 assert.deepEqual(reports.filter(r=>r.violations.length),[],'axe new educational surfaces');
 console.log('PASS: real part anchors, direct lamp drag and keyboard, observations, explanation and quiz; '+reports.length+' pages without clipped controls or axe violations across 4 viewports.');
}).catch(e=>{console.error(e);process.exitCode=1});
