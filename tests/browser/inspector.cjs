const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
run(async ({page, artifacts, select, click, close, frame}) => {
 let checked=0;
 for(const viewport of [{width:1280,height:900},{width:320,height:568},{width:390,height:844},{width:844,height:390}]) {
  await close(); await page.setViewport({...viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1}); await frame();
  await select('sensor-luz-ldr'); await click('#object-inspect');
  async function walk(state, surface = "inspector") {
   await page.evaluate((surface)=>__app.pagination.refresh(document.getElementById(surface),true), surface);
   const count=await page.$eval('#'+surface,e=>+e.dataset.pageCount);
   for(let i=0;i<count;i++) {
    const isolated=await page.evaluate((surface)=> {
     const root=document.getElementById(surface);
     return [...root.querySelectorAll('[data-keep-previous]')].filter(e=>!e.closest('[hidden],[inert]')&&e.getClientRects().length)
       .filter(e=>{
        for(let p=e.parentElement;p!==root;p=p.parentElement) if(p.tagName==='DETAILS'&&!p.open)return false;
        const current=__app.pagination.locate(e).target;
        const texts=[...root.querySelectorAll('p,.reference-fact,.stat,#model-data > div')].filter(n=>!n.closest('[hidden],.sr-only')&&n.getClientRects().length);
        return !texts.some(n=>__app.pagination.locate(n).target===current);
       }).map(e=>e.id);
    }, surface);
    assert.deepEqual(isolated,[],viewport.width+' '+state+' página '+(i+1)+': acciones acompañadas por contenido');
    await page.screenshot({path:path.join(artifacts,`inspector-${viewport.width}-${state}-${i+1}.png`)});
    checked++; if(i<count-1)await page.click('#'+surface+' > .page-navigation > button:last-child');
   }
  }
  await walk('observe');
  await click('#learning-quiz-tab'); await walk('quiz', 'challenge');
  await click('.learning-choice'); await walk('feedback', 'challenge');
  await click('#open-technical'); await walk('technical', 'technical');
 }
 console.log('PASS: '+checked+' páginas de Ficha y reto; sin acciones aisladas en observación, respuestas, retroalimentación y datos técnicos a 320/390/844/1280 px.');
}).catch(e=>{console.error(e);process.exitCode=1});
