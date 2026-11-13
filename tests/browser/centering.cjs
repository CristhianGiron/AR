const assert = require('node:assert/strict');
const {run}=require('./harness.cjs');
run(async({page,select,click,close,frame})=>{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  await close(); await page.setViewport({...viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1}); await frame();
  await select('sensor-luz-ldr');
  const snapshot=()=>page.evaluate(()=>({position:__app.engine.camera.position.toArray(),projection:__app.engine.camera.projectionMatrix.toArray()}));
  const initial=await snapshot();
  for(const selector of ['#object-inspect','#open-technical','#open-challenge']){
   if(selector!=='#object-inspect'){await close();await click('#object-inspect');}
   await click(selector);await frame();assert.deepEqual(await snapshot(),initial,'Los paneles no cambian el encuadre');
  }
  await close();await click('#workspace-toggle');await frame();assert.deepEqual(await snapshot(),initial,'La barra lateral no cambia el encuadre');
  const center=await page.evaluate(()=>{
   const point=new __THREE.Vector3(0,.65,-.4).project(__app.engine.camera);
   return {x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2,width:innerWidth,height:innerHeight,offset:__app.engine.camera.view?.enabled||false};
  });
  assert.ok(Math.abs(center.x-center.width/2)<.01&&Math.abs(center.y-center.height/2)<.01); assert.equal(center.offset,false);
  assert.ok(await page.$eval('body',e=>getComputedStyle(e).fontFamily.includes('Comic Sans')));
  assert.ok(await page.$eval('#help',e=>getComputedStyle(e).fontFamily.includes('Comic Sans')));
 }
 console.log('PASS: centro 3D en el centro de la pantalla completa, encuadre estable con paneles y barra lateral, Comic Sans en interfaz a 390/1280 px.');
}).catch(e=>{console.error(e);process.exitCode=1});
