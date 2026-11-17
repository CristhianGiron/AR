const assert = require('node:assert/strict');
const path = require('node:path');
const {run}=require('./harness.cjs');
if(!process.argv.includes('--gears')) process.argv.push('--gears');
run(async({page,click,close,frame,artifacts,load})=>{
  const openForce=async()=>{await close();await page.click('#gear-quick');await page.click('#gear-hub-more');await page.click('#gear-hub-force');};
  const fill=async(id,v)=>page.$eval('#'+id,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(v));
  const advance=async(steps=10)=>page.evaluate(n=>{__app.gears.suspend();for(let i=0;i<=n;i++)__app.gears.updateFrame(1000+i*50);__app.gears.suspend();__app.loop.renderFrame();},steps);
  const integralCheck=await page.evaluate(async()=>{
    const {originalGearPhysical}=await import('/src/models/gear-solid.js');
    const solids=[new __THREE.Group(),new __THREE.Group()];
    for(const solid of solids)solid.add(new __THREE.Mesh(new __THREE.BoxGeometry(20,30,10),new __THREE.MeshBasicMaterial()));
    const measured=originalGearPhysical(solids.map(pivot=>({pivot})),{centers:[[0,0,0],[50,0,0]],teeth:[20,30]});
    for(const solid of solids)solid.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
    return measured.parts[0];
  });
  assert.ok(Math.abs(integralCheck.volume-20*30*10*1e-9)<1e-12,'closed mesh integration has the analytic box volume');
  assert.ok(Math.abs(integralCheck.inertia-integralCheck.mass*(.02**2+.03**2)/12)<1e-12,'closed mesh integration has the analytic box polar inertia');
  await openForce();
  assert.equal(await page.$eval('#gear-radius-field',e=>e.hidden),true,'calculated radius is absent from force entry');
  assert.equal(await page.$eval('#gear-force-apply',e=>e.hidden),false,'original OBJ supports direct force');
  assert.match(await page.$eval('#gear-force-apply',e=>e.textContent),/Aplicar fuerza/);
  await page.evaluate(()=>{window.__forceOriginal=__app.state.chosen;window.__forceOriginalMeshes=__forceOriginal.mechanism.parts.map(p=>p.pivot.children[0].uuid);});
  await fill('class-force',-1);await click('#gear-force-apply');
  assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.design),undefined,'invalid force never replaces the original');
  await fill('class-force',12);await click('#gear-force-apply');
  await page.waitForFunction(()=>__app.state.pendingLoads===0&&__app.state.chosen.mechanism.state.drive?.force===12);
  assert.equal(await page.evaluate(()=>__app.state.chosen===__forceOriginal),true,'force never replaces the original object');
  assert.deepEqual(await page.evaluate(()=>__app.state.chosen.mechanism.parts.map(p=>p.pivot.children[0].uuid)),await page.evaluate(()=>__forceOriginalMeshes),'original meshes survive force application');
  assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.design),undefined);
  assert.deepEqual(await page.evaluate(()=>__app.state.chosen.mechanism.system.teeth),[15,30],'force preserves exact tooth counts');
  assert.equal(await page.$eval('#class-radius',e=>e.valueAsNumber),.01875,'original pitch radius comes from shaft spacing and its actual tooth counts');
  assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.state.running),false,'applying preserves pause; Iniciar starts the configured force');

  await close();await page.click('#gear-toggle');await advance();
  assert.ok(await page.evaluate(()=>__app.state.chosen.mechanism.motion.omega>0),'force moves the original OBJ');
  const originalScene=await page.evaluate(()=>__app.projects.capture());
  await load();await page.evaluate(async data=>__app.projects.restore(data),originalScene);
  assert.deepEqual(await page.evaluate(()=>__app.projects.capture()),originalScene,'original OBJ force saves without generated geometry');
  assert.deepEqual(await page.evaluate(()=>__app.state.chosen.mechanism.system.teeth),[15,30]);
  await page.screenshot({path:path.join(artifacts,'original-force-preserved.png')});
  await close();await page.evaluate(async()=>__app.gearDesigner.replace({version:1,teeth:[20,40],module:2.5,width:10,bore:4},false));
  await openForce();assert.equal(await page.$eval('#gear-force-settings',e=>e.hidden),false);
  await page.$eval('#gear-force-settings details',e=>e.open=true);
  assert.equal(await page.$eval('#class-radius',e=>e.valueAsNumber),.025);assert.equal(await page.$eval('#class-radius',e=>e.readOnly),true);
  assert.equal(await page.$$eval('#gear-physical-table input', es=>es.length),0,'physical values are calculated outputs');
  const masses=await page.$$eval('#gear-physical-mass1, #gear-physical-mass2',es=>es.map(e=>parseFloat(e.textContent.replace(',','.'))));assert.ok(masses[1]>masses[0]&&masses[0]>100);
  assert.match(await page.$eval('#gear-physical-pitch1',e=>e.textContent),/25 mm/);
  assert.match(await page.$eval('#gear-physical-outer1',e=>e.textContent),/27,5 mm/);
  const geometryCheck=await page.evaluate(async()=>{
    const {gearPhysicalProperties}=await import('/src/education/gear-physical.js');
    const m=__app.state.chosen.mechanism, physical=gearPhysicalProperties(m.design);
    return m.parts.map((part,i)=>{
      let volume=0;
      part.pivot.traverse(node=>{
        if(!node.isMesh)return;
        const geometry=node.geometry, positions=geometry.attributes.position, indices=geometry.index;
        const count=indices?indices.count:positions.count;
        for(let j=0;j<count;j+=3){
          const a=new __THREE.Vector3().fromBufferAttribute(positions,indices?indices.getX(j):j);
          const b=new __THREE.Vector3().fromBufferAttribute(positions,indices?indices.getX(j+1):j+1);
          const c=new __THREE.Vector3().fromBufferAttribute(positions,indices?indices.getX(j+2):j+2);
          volume+=a.dot(b.cross(c))/6;
        }
      });
      return {mesh:Math.abs(volume)*1e-9,calculated:physical.parts[i].volume};
    });
  });
  for(const result of geometryCheck)assert.ok(Math.abs(result.mesh/result.calculated-1)<.001,'analytic volume matches the faceted rendered solid within 0.1 percent');
  await fill('class-force',15);
  assert.match(await page.$eval('#class-torque-result',e=>e.textContent),/Engranaje 1 · Entrada[\s\S]*0,375 N·m/);
  assert.match(await page.$eval('#gear-force-formula',e=>e.textContent),/Engranaje 2 · Salida ideal disponible[\s\S]*0,75 N·m/);
  assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.state.drive.force),12,'preview of both torques does not apply unconfirmed force');
  await fill('class-force',10);await click('#gear-force-apply');
  assert.equal(await page.$eval('#class-rpm',e=>e.disabled),true,'fixed-speed entry disabled in force mode');
  assert.match(await page.$eval('#gear-force-formula',e=>e.textContent),/0,5 N·m/);
  await close();await page.click('#gear-toggle');await advance();
  const moving=await page.evaluate(()=>({angle:__app.state.chosen.mechanism.state.angle,omega:__app.state.chosen.mechanism.motion.omega}));
  assert.ok(moving.angle>0&&moving.omega>0,'force accelerates from rest');
  await frame();
  assert.match(await page.$eval('[data-wheel="0"].gear-readout .readout-force',e=>e.textContent),/F 10 N/);
  assert.match(await page.$eval('[data-wheel="0"].gear-readout .readout-torque',e=>e.textContent),/0,25 N·m/);
  assert.equal(await page.$$eval('.gear-readout .readout-force',es=>es.every(e=>!e.hidden)),true);
  const values=await page.$$eval('.readout-speed strong',es=>es.map(e=>Number(e.textContent.replace(',','.'))));assert.ok(Math.abs(values[0]/2-values[1])<.11);
  await page.screenshot({path:path.join(artifacts,'force-running.png')});
  await openForce();await fill('class-force',1);await click('#gear-force-apply');await close();await advance(100);
  assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.motion.omega),0,'overload brakes and stalls');
  assert.match(await page.$eval('.gear-readout .readout-state',e=>e.textContent),/CARGA/);
  await openForce();const previous=await page.evaluate(()=>JSON.stringify(__app.state.chosen.mechanism.state.drive));
  await fill('class-force',-1);await click('#gear-force-apply');assert.equal(await page.$eval('#gear-force-error',e=>e.hidden),false);
  assert.equal(await page.evaluate(()=>JSON.stringify(__app.state.chosen.mechanism.state.drive)),previous,'invalid force preserves live config');
  await fill('class-force',20);await click('#gear-force-apply');await close();await advance(12);
  assert.ok(await page.evaluate(()=>__app.state.chosen.mechanism.motion.omega>0));
  await page.evaluate(()=>{document.querySelector('#gear-separation').value=50;document.querySelector('#gear-separation').dispatchEvent(new Event('input'));});await frame();
  assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.motion.omega),0);
  assert.match(await page.$eval('[data-wheel="1"].gear-readout .readout-torque',e=>e.textContent),/τ₂ 0 N·m/);
  const saved=await page.evaluate(()=>__app.projects.capture());await load();await page.evaluate(async d=>__app.projects.restore(d),saved);
  assert.deepEqual(await page.evaluate(()=>__app.projects.capture()),saved,'force config survives full reload');
  assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.state.running),false);assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.motion.omega),0);
  await page.evaluate(()=>document.querySelector('#gear-assemble').click());await openForce();
  await click('#gear-force-fixed');assert.equal(await page.$eval('#class-rpm',e=>e.disabled),false);await close();await frame();
  assert.equal(await page.$$eval('.readout-force',es=>es.every(e=>e.hidden)),true,'fixed-speed mode hides force telemetry');
  await page.evaluate(async()=>__app.gearDesigner.replace({version:1,teeth:[40,20],module:2.5,width:10,bore:4},false));await openForce();
  assert.equal(await page.$eval('#class-radius',e=>e.valueAsNumber),.05,'teeth regeneration changes physical lever arm');
  const swapped=await page.$$eval('#gear-physical-mass1, #gear-physical-mass2',es=>es.map(e=>parseFloat(e.textContent.replace(',','.'))));assert.deepEqual(swapped,[masses[1],masses[0]],'regenerating teeth also recomputes mass');
  await page.$eval('#gear-force-settings details',e=>e.open=true);
  await fill('class-force',10);await click('#gear-force-apply');
  assert.match(await page.$eval('#class-torque-result',e=>e.textContent),/0,5 N·m/);assert.match(await page.$eval('#gear-force-formula',e=>e.textContent),/0,25 N·m/);
  await close();await page.click('#gear-toggle');await advance(10);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(const width of [1280,390,320]){
    await page.setViewport({width,height:width===1280?900:780,isMobile:true,hasTouch:true});await close();await frame();
    const boxes=await page.$$eval('.gear-readout:not([hidden])',es=>es.map(e=>e.getBoundingClientRect().toJSON()));assert.equal(boxes.length,2,'two force readouts remain visible at '+width);
    for(const b of boxes)assert.ok(b.left>=0&&b.right<=width&&b.top>=0&&b.bottom<=(width===1280?900:780));
    await page.screenshot({path:path.join(artifacts,'force-hud-'+width+'.png')});
    await openForce();
    const actionTogether=await page.evaluate(()=>{
      const input=__app.pagination.locate(document.querySelector('#class-force'));
      const action=__app.pagination.locate(document.querySelector('#gear-force-apply'));
      const r=document.querySelector('#gear-force-apply').getBoundingClientRect(), clip=document.querySelector('#gear-context .page-clip').getBoundingClientRect();
      return input.target===0&&action.target===0&&r.top>=clip.top-1&&r.bottom<=clip.bottom+1;
    });
    assert.ok(actionTogether,'force input and apply action are visible together on the first page at '+width);
    assert.equal(await page.$eval('#class-radius',e=>e.getClientRects().length),0,'radius input remains hidden at '+width);
    const audit=await page.evaluate(async()=>(await axe.run('#gear-context',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(audit,[]);
    await page.screenshot({path:path.join(artifacts,'force-controls-'+width+'.png')});
    await page.evaluate(()=>{document.activeElement.blur();__app.pagination.reveal(document.querySelector('#gear-torque-formulas'));});
    await frame();
    const bothFormulasVisible=await page.$eval('#gear-torque-formulas',e=>{
      const r=e.getBoundingClientRect(),clip=e.closest('.page-clip').getBoundingClientRect();
      return r.top>=clip.top-1&&r.bottom<=clip.bottom+1&&r.left>=0&&r.right<=innerWidth;
    });
    assert.ok(bothFormulasVisible,'both gear formulas stay together and fully visible at '+width);
    await page.screenshot({path:path.join(artifacts,'torque-pair-'+width+'.png')});

    await page.evaluate(()=>document.activeElement.blur());
    await page.$eval('#gear-physical-details',e=>e.open=true);
    await page.evaluate(()=>{__app.pagination.refresh(document.querySelector('#gear-context'));__app.pagination.reveal(document.querySelector('#gear-physical-table'));});
    await frame();
    const tableVisible=await page.$eval('#gear-physical-table',e=>{
      const r=e.getBoundingClientRect(),clip=e.closest('.page-clip').getBoundingClientRect();
      return {fits:r.top>=clip.top-1&&r.bottom<=clip.bottom+1&&r.left>=0&&r.right<=innerWidth, table:r.toJSON(),clip:clip.toJSON(),page:e.closest('#gear-context').dataset.pageIndex};
    });
    assert.ok(tableVisible.fits,'complete physical properties table is readable at '+width+' '+JSON.stringify(tableVisible));
    await page.screenshot({path:path.join(artifacts,'gear-properties-'+width+'.png')});

  }
  await close();await page.evaluate(async()=>__app.gearDesigner.replace(undefined,false));
  assert.equal(await page.evaluate(()=>__app.state.chosen.mechanism.state.drive),undefined,'original OBJ recovery returns to fixed speed');
  console.log('PASS: geometry-derived volume/mass/radii, force-only controls, dynamics and HUD, stall, regeneration, validation, disconnection, fixed-speed fallback, save/reload, complete physical-properties table and mobile accessibility.');
}).catch(e=>{console.error(e);process.exitCode=1;});
