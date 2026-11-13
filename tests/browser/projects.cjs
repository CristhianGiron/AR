const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./harness.cjs');
run(async({page,select,click,openMenuAction,close,load,artifacts,root,catalog})=>{
 await select('sensor-luz-ldr');
 await page.evaluate(()=>{
  const item=__app.state.chosen; __app.editor.rename(item,'LDR de prueba'); item.rot=[23,-41,8]; item.size=1.35; item.height=2.3; item.anchor.position.set(-1,.2,1.3); item.color='#aabbcc'; __app.editor.applyTransform(item);
  item.activity={distance:.2,observations:[{distance:.2},{distance:.9}],explanation:'Con menos luz aumenta la resistencia.'};item.partsVisited=['pista'];
 });
 // Include an actual imported binary; it must remain recoverable without its source file.
 const model=catalog.modelos.find(m=>m.id==='sensor-luz-ldr');
 const buffer=fs.readFileSync(path.join(root,'modelos-3d',model.archivo));
 await page.evaluate(async(bytes)=>{
  const buffer=Uint8Array.from(bytes).buffer,gltf=await __app.models.loader.parseAsync(buffer,'');
  const definition={id:'local-test',nombre:'Pieza local',archivo:'local.glb',categoria:'Modelo local',descripcion:'Modelo integrado de prueba.',visualizacion:{tamano:1.6,alturaEtiqueta:1.85,rotacion:[0,0,0]}};
  const item=__app.models.insertModel(gltf,definition);item.localBuffer=buffer;
  __app.interface.select(__app.state.entries.find(i=>i.type==='sensor-luz-ldr'));__app.learning.ensureFocused();
 },Array.from(buffer));
 await openMenuAction('my-scene');await click('#open-projects');
 await page.$eval('#project-name',e=>e.value='Experimento guardado');await click('#save-project');
 await page.waitForFunction(()=>document.querySelector('#project-message').textContent.includes('Escena guardada'));
 const expected=await page.evaluate(()=>__app.projects.capture());
 assert.equal(expected.assets.length,1);assert.equal(expected.entries.length,3);
 const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:artifacts});
 const download=path.join(artifacts,'Experimento guardado.explorar.json');fs.rmSync(download,{force:true});await click('#export-project');
 for(let i=0;i<100&&!fs.existsSync(download);i++)await new Promise(r=>setTimeout(r,100));
 assert.ok(fs.existsSync(download),'archivo exportado');assert.deepEqual(JSON.parse(fs.readFileSync(download)),expected);
 await load();await openMenuAction('my-scene');await click('#open-projects');
 await page.waitForSelector('#saved-projects .saved-project');await click('#saved-projects .saved-project button');
 await page.waitForFunction(()=>!__app.projects.busy&&!document.querySelector('#projects').open);
 assert.deepEqual(await page.evaluate(()=>__app.projects.capture()),expected,'recuperación después de recargar');
 // A model parse failure must preserve every existing object, selection and generation.
 const failure=await page.evaluate(async()=>{
  const originals=[...__app.state.entries],chosen=__app.state.chosen,generation=__app.state.sceneGeneration;
  const data=__app.projects.capture(),parse=__app.models.loader.parseAsync;
  __app.models.loader.parseAsync=async()=>{throw new Error('GLB dañado de prueba');};
  let rejected=false;try{await __app.projects.restore(data);}catch{rejected=true;}finally{__app.models.loader.parseAsync=parse;}
  return {rejected,preserved:originals.every((v,i)=>v===__app.state.entries[i]),selected:chosen===__app.state.chosen,generation:generation===__app.state.sceneGeneration};
 });assert.deepEqual(failure,{rejected:true,preserved:true,selected:true,generation:true});
 const cancellation=await page.evaluate(async()=>{
  const originals=[...__app.state.entries],data=__app.projects.capture(),loader=__app.models.loadModel;
  let resume;__app.models.loadModel=async(...args)=>{await new Promise(resolve=>resume=resolve);return loader(...args);};
  const opening=__app.projects.restore(data).then(()=>false,()=>true);
  document.querySelector('#cancel-project-open').click();__app.models.loadModel=loader;resume();
  const rejected=await opening;return {rejected,preserved:originals.every((v,i)=>v===__app.state.entries[i]),busy:__app.projects.busy};
 });assert.deepEqual(cancellation,{rejected:true,preserved:true,busy:false});
 await openMenuAction('my-scene');await click('#open-projects');
 await (await page.$('#import-project')).uploadFile(download);
 await page.waitForFunction(()=>!__app.projects.busy&&!document.querySelector('#projects').open);
 assert.deepEqual(await page.evaluate(()=>__app.projects.capture()),expected,'importación de archivo');
 await openMenuAction('my-scene');await click('#open-projects');await page.waitForSelector('#saved-projects .saved-project .round-button');await click('#saved-projects .saved-project .round-button');
 await page.waitForFunction(()=>!document.querySelector('#undo-project-delete').hidden);await click('#undo-project-delete');
 await page.waitForSelector('#saved-projects .saved-project');
 await page.screenshot({path:path.join(artifacts,'projects.png')});
 await click('#copy-project');await page.waitForFunction(()=>document.querySelectorAll('#saved-projects .saved-project').length===2);
 // Browser storage failure must not prevent file export.
 await page.evaluate(()=>{__app.projects.store.put=async()=>{throw new Error('Sin espacio disponible.');};});
 await click('#save-project');await page.waitForFunction(()=>document.querySelector('#project-message').textContent.includes('Exportar archivo'));
 await close();
 console.log('PASS: guardado IndexedDB tras recarga, exportación/importación con GLB integrado, notas y aislamiento; fallo y cancelación conservan la escena; borrar/deshacer y almacenamiento no disponible.');
}).catch(e=>{console.error(e);process.exitCode=1});
