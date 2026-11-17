const assert=require('node:assert/strict');
const path=require('node:path');
const {run}=require('./harness.cjs');
if(!process.argv.includes('--gears'))process.argv.push('--gears');
run(async({page,close,frame,load,artifacts})=>{
  const menu=async()=>{await close();await page.click('#gear-quick');await page.click('#gear-hub-more');};
  const active=()=>page.evaluate(()=>__app.gearSound.activeVoices);
  const rms=()=>page.evaluate(async()=>{
    await new Promise(resolve=>setTimeout(resolve,450));
    const data=new Float32Array(__soundAnalyser.fftSize);__soundAnalyser.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((sum,v)=>sum+v*v,0)/data.length);
  });
  assert.equal(await active(),0,'no sound before the learner starts the gears');
  await page.evaluate(()=>{
    const original=AudioContext.prototype.createGain;
    AudioContext.prototype.createGain=function(){
      const node=original.call(this);
      if(!window.__soundAnalyser){window.__soundAnalyser=this.createAnalyser();__soundAnalyser.fftSize=8192;node.connect(__soundAnalyser);}
      return node;
    };
  });
  await close();await page.click('#gear-toggle');await frame();
  await page.waitForFunction(()=>__app.gearSound.activeVoices===1);
  const spur=await rms();assert.ok(spur>1e-5,'actual Web Audio graph produces a signal');
  await page.click('#gear-toggle');await frame();assert.equal(await active(),0);
  assert.ok(await rms()<1e-6,'pause fades to actual silence');
  await page.click('#gear-toggle');await frame();
  await page.evaluate(()=>{const m=__app.state.chosen.mechanism;m.state.separation=.5;__app.loop.renderFrame();});
  assert.equal(await active(),0,'separation disconnects contact sound');
  await page.evaluate(()=>{const m=__app.state.chosen.mechanism;m.state.separation=0;m.state.isolated=0;__app.loop.renderFrame();});
  assert.equal(await active(),0,'isolated wheel has no meshing sound');
  await page.evaluate(()=>{const m=__app.state.chosen.mechanism;m.state.isolated=null;__app.loop.renderFrame();});
  assert.equal(await active(),1);
  await page.evaluate(()=>{__app.state.chosen.anchor.visible=false;__app.loop.renderFrame();});assert.equal(await active(),0);
  await page.evaluate(()=>{__app.state.chosen.anchor.visible=true;__app.loop.renderFrame();});
  await menu();await page.click('#gear-hub-sound');assert.equal(await active(),0);
  assert.equal(await page.$eval('#gear-hub-sound',e=>e.getAttribute('aria-pressed')),'false');
  assert.ok(await rms()<1e-6,'mute removes the audible signal');
  await page.click('#gear-hub-sound');await frame();assert.equal(await active(),1);
  await close();await page.evaluate(async()=>__app.gears.selectModel('engranajes-helicoidales'));
  await page.click('#gear-toggle');await frame();assert.equal(await active(),1);
  const helical=await rms();assert.ok(helical>1e-5&&helical<spur,'helical is audible and gentler than spur at the same RPM');
  for(const [id,count]of [['engranajes-conicos',1],['engranajes-transmision',3]]){
    await page.evaluate(async id=>__app.gears.selectModel(id),id);await page.click('#gear-toggle');await frame();assert.equal(await active(),count);
  }
  await page.evaluate(()=>__app.loop.stop());assert.equal(await active(),0,'background/AR loop suspension stops every source');
  await frame();assert.equal(await active(),3);
  await page.evaluate(async()=>{await __app.gears.selectModel('engranajes-rectos');const m=__app.state.chosen.mechanism;m.state.drive={version:2,enabled:true,force:0};m.state.running=true;m.motion.omega=0;__app.loop.renderFrame();});
  assert.equal(await active(),0,'force-mode stall remains silent despite configured fixed RPM');
  await menu();await page.click('#gear-hub-sound');await load();
  assert.equal(await page.evaluate(()=>__app.gearSound.enabled),false,'mute preference survives reload');
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(const width of [1280,390,320]){
    await page.setViewport({width,height:width===1280?900:780,isMobile:true,hasTouch:true});await menu();
    const box=await page.$eval('#gear-hub-sound',e=>e.getBoundingClientRect().toJSON());assert.ok(box.width>=44&&box.height>=44&&box.right<=width);
    const audit=await page.evaluate(async()=>(await axe.run('#gear-center',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id));assert.deepEqual(audit,[]);
    await page.screenshot({path:path.join(artifacts,'gear-sound-'+width+'.png')});
  }
  await page.evaluateOnNewDocument(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
  await load();await menu();assert.equal(await page.$eval('#gear-hub-sound',e=>e.disabled),true,'unsupported audio leaves the rest of the lab usable');
  console.log('PASS: actual audible graph, quiet helical versus spur, distinct stages, pause/mute/disconnection/hidden/stall silence, suspension cleanup, preference persistence, unsupported fallback and accessible mobile controls.');
}).catch(e=>{console.error(e);process.exitCode=1;});
