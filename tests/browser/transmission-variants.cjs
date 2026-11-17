const assert=require('node:assert/strict');
const path=require('node:path');
const {run}=require('./harness.cjs');
if(!process.argv.includes('--gears'))process.argv.push('--gears');
run(async({page,close,click,frame,load,artifacts})=>{
  const open=async()=>{await close();await page.click('#gear-quick');await page.click('#gear-hub-more');await click('#gear-hub-variants');};
  await page.evaluate(async()=>__app.gears.selectModel('engranajes-transmision'));
  await open();
  assert.equal(await page.$$eval('[data-transmission-variant]',es=>es.length),5);
  for(const [id,count,wheels,ratio]of [['simple',3,3,1],['reducer',3,4,4],['multiplier',3,4,.25],['advanced',5,8,6]]){
    await click('[data-transmission-variant="'+id+'"]');
    await page.waitForFunction(id=>!__app.state.pendingLoads&&__app.state.chosen.mechanism.transmissionVariant===id,{},id);
    const data=await page.evaluate(async()=>{
      const {gearRatio}=await import('/src/education/gear-model.js');const item=__app.state.chosen,m=item.mechanism;
      return {count:m.parts.length,wheels:m.system.partTeeth.flat().length,ratio:gearRatio(m.system),running:m.state.running,
        bounds:m.system.nodes.every(n=>item.partBounds.has(n)),options:document.querySelectorAll('#gear-piece option').length,
        finite:m.parts.every(p=>p.pivot.children[0].children.every(w=>w.position.toArray().every(Number.isFinite)))};
    });
    assert.deepEqual(data,{count,wheels,ratio,running:false,bounds:true,options:count,finite:true});
    await close();await page.click('#gear-toggle');await frame();
    const motion=await page.evaluate(()=>{const item=__app.state.chosen,m=item.mechanism;__app.gears.suspend();__app.gears.updateFrame(1000);__app.gears.updateFrame(1100);return{angle:m.state.angle,axes:m.parts.map(p=>p.pivot.position.distanceTo(p.home))};});
    assert.ok(motion.angle>0);assert.ok(motion.axes.every(d=>d<1e-9));
    await page.click('#gear-toggle');await frame();
    await page.screenshot({path:path.join(artifacts,'transmission-'+id+'.png')});
    const saved=await page.evaluate(()=>__app.projects.capture());await load();await page.evaluate(async data=>__app.projects.restore(data),saved);
    assert.deepEqual(await page.evaluate(()=>__app.projects.capture()),saved,'variant regenerates identically after reload: '+id);
    await open();
  }
  const failure=await page.evaluate(async()=>{
    const item=__app.state.chosen,load=__app.models.loadModel;
    __app.models.loadModel=async()=>{throw new Error('Preparación fallida de prueba');};
    let rejected=false;
    try{await __app.gearDesigner.replaceTransmission('simple');}catch{rejected=true;}finally{__app.models.loadModel=load;}
    return {rejected,same:item===__app.state.chosen,pending:__app.state.pendingLoads};
  });
  assert.deepEqual(failure,{rejected:true,same:true,pending:0},'failed generation preserves the working train');
  await page.evaluate(()=>{__app.editor.rename(__app.state.chosen,'Mi montaje de clase');__app.state.chosen.mechanism.state.colors=['#27d5ed',null,null,null,null];});
  await click('[data-transmission-variant="original"]');await page.waitForFunction(()=>!__app.state.pendingLoads&&!__app.state.chosen.mechanism.transmissionVariant);
  assert.deepEqual(await page.evaluate(()=>__app.state.chosen.mechanism.system.partTeeth),[[26],[26,18],[13],[18]],'original OBJ remains recoverable');
  assert.equal(await page.evaluate(()=>__app.state.chosen.name),'Mi montaje de clase');
  assert.deepEqual(await page.evaluate(()=>__app.state.chosen.mechanism.state.colors),['#27d5ed',null,null,null],'existing shaft colors adapt to the new shaft count');
  await click('[data-transmission-variant="advanced"]');await page.waitForFunction(()=>!__app.state.pendingLoads&&__app.state.chosen.mechanism.parts.length===5);
  await close();await page.click('#gear-quick');await page.click('#gear-hub-more');await click('#gear-hub-separate');
  await page.$eval('#gear-separation',e=>{e.value=50;e.dispatchEvent(new Event('input'));});
  assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.state.separation),.5);
  await page.click('#gear-context-close');await click('#gear-hub-piece');await page.select('#gear-piece','4');await click('#gear-isolate');
  assert.deepEqual(await page.evaluate(()=>__app.state.chosen.mechanism.parts.map(p=>p.pivot.visible)),[false,false,false,false,true]);
  await page.click('#gear-context-close');await click('#gear-hub-assemble');
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(const width of [1280,390,320]){
    await page.setViewport({width,height:width===1280?900:780,isMobile:true,hasTouch:true});await open();
    for(const id of ['original','simple','reducer','multiplier','advanced']){
      const loc=await page.evaluate(id=>__app.pagination.locate(document.querySelector('[data-transmission-variant="'+id+'"]')),id);assert.ok(loc.target>=0,'variant can be reached by pagination: '+id);
    }
    const audit=await page.evaluate(async()=>(await axe.run('#gear-center',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id));assert.deepEqual(audit,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(artifacts,'transmission-variants-'+width+'.png')});
  }
  console.log('PASS: 3 variants plus 4-stage compound, real wheel geometry/ratios/phases, atomic replacement, original recovery, five-axis separation/isolation, save/reload and accessible mobile selector.');
}).catch(e=>{console.error(e);process.exitCode=1;});
