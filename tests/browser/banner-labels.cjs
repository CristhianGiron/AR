const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
run(async ({ page, artifacts, frame, click, close }) => {
  function labelRect() {
    const item = __app.state.entries.find(item => item.type === 'sensor-temperatura');
    const camera = __app.engine.camera, canvas = __app.engine.canvas.getBoundingClientRect();
    const corners = [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]].map(([x,y]) => new __THREE.Vector3(x,y,0).applyMatrix4(item.tag.matrixWorld).project(camera));
    return { left: Math.min(...corners.map(p => canvas.left+(p.x+1)*canvas.width/2)), right: Math.max(...corners.map(p => canvas.left+(p.x+1)*canvas.width/2)), top: Math.min(...corners.map(p => canvas.top+(1-p.y)*canvas.height/2)), bottom: Math.max(...corners.map(p => canvas.top+(1-p.y)*canvas.height/2)) };
  }
  const rectSource = labelRect.toString();
  for (const viewport of [{width:1280,height:900},{width:1672,height:940}]) {
    await close(); await page.setViewport({...viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await page.evaluate(() => { Object.assign(__app.state.viewState,{x:0,y:0,zoom:1}); }); await frame();
    assert.equal(await page.$eval('.mode-badge',e=>getComputedStyle(e).visibility),'visible','banner visible in its normal view');
    await page.evaluate(() => { Object.assign(__app.state.viewState,{x:-30,y:60,zoom:1.5}); }); await frame();
    const intersection = await page.evaluate((source) => {
      const label = (0,eval)('('+source+')')(), badge = document.querySelector('.mode-badge').getBoundingClientRect();
      return {x:Math.ceil(Math.max(label.left,badge.left)),y:Math.ceil(Math.max(label.top,badge.top)),width:Math.floor(Math.min(label.right,badge.right)-Math.max(label.left,badge.left)),height:Math.floor(Math.min(label.bottom,badge.bottom)-Math.max(label.top,badge.top))};
    },rectSource);
    assert.ok(intersection.width>20&&intersection.height>20,'real temperature label intersects the banner at '+viewport.width);
    const state = await page.evaluate(() => ({camera:__app.engine.camera.position.toArray(),projection:__app.engine.camera.projectionMatrix.toArray(),tag:__app.state.entries.find(item=>item.type==='sensor-temperatura').tag.position.toArray()}));
    for (let i=0;i<3;i++) { await frame(); assert.equal(await page.$eval('.mode-badge',e=>getComputedStyle(e).visibility),'hidden','no hide/show oscillation'); }
    assert.deepEqual(await page.evaluate(() => ({camera:__app.engine.camera.position.toArray(),projection:__app.engine.camera.projectionMatrix.toArray(),tag:__app.state.entries.find(item=>item.type==='sensor-temperatura').tag.position.toArray()})),state,'no camera or label displacement');
    const actual = await page.screenshot({encoding:'base64'});
    await page.screenshot({path:path.join(artifacts,'temperature-banner-clear-'+viewport.width+'.png')});
    await page.$eval('.mode-badge',e=>e.style.setProperty('visibility','hidden','important'));
    const clear = await page.screenshot({encoding:'base64'});
    await page.$eval('.mode-badge',e=>e.style.setProperty('visibility','visible','important'));
    const obstructed = await page.screenshot({encoding:'base64'});
    const pixels = await page.evaluate(async ({actual,clear,obstructed,rect}) => {
      const decode = async(base64) => { const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const canvas=document.createElement('canvas');canvas.width=rect.width;canvas.height=rect.height;const context=canvas.getContext('2d');context.drawImage(img,rect.x,rect.y,rect.width,rect.height,0,0,rect.width,rect.height);return context.getImageData(0,0,rect.width,rect.height).data; };
      const [a,b,c] = await Promise.all([decode(actual),decode(clear),decode(obstructed)]);
      let remaining=0,reproduced=0; for(let i=0;i<a.length;i+=4){if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12)remaining++;if(Math.abs(c[i]-b[i])+Math.abs(c[i+1]-b[i+1])+Math.abs(c[i+2]-b[i+2])>12)reproduced++;}return {remaining,reproduced};
    },{actual,clear,obstructed,rect:intersection});
    assert.ok(pixels.reproduced>200,'forced banner really covered rendered pixels');
    assert.equal(pixels.remaining,0,'the corrected rendering matches the unobstructed label');
    await page.$eval('.mode-badge',e=>e.style.removeProperty('visibility'));
    await page.evaluate(() => { Object.assign(__app.state.viewState,{x:0,y:0,zoom:1}); }); await frame();
    assert.equal(await page.$eval('.mode-badge',e=>getComputedStyle(e).visibility),'visible','banner returns when clear');
  }
  await page.evaluate(() => { Object.assign(__app.state.viewState,{x:-30,y:60,zoom:1.5}); }); await frame();
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});await frame();
  assert.equal(await page.$eval('.mode-badge',e=>getComputedStyle(e).display),'none');
  assert.equal(await page.$eval('.mode-badge',e=>e.hasAttribute('data-label-overlap')),false,'mobile does not retain the previous collision');
  await page.setViewport({width:1280,height:900,isMobile:true,hasTouch:true,deviceScaleFactor:1});await frame();
  assert.equal(await page.$eval('.mode-badge',e=>getComputedStyle(e).visibility),'hidden','desktop restores collision detection');
  await click('#hud-toggle');await frame();await click('#hud-toggle');await frame();
  assert.equal(await page.$eval('.mode-badge',e=>getComputedStyle(e).visibility),'hidden','HUD toggle preserves readable labels');
  await page.evaluate(() => {
    const item=__app.state.entries.find(item=>item.type==='sensor-temperatura');__app.state.entries.forEach(entry=>entry.anchor.visible=entry===item);__app.interface.select(item);__app.history.removeSelected();
  });await frame();
  assert.equal(await page.$eval('.mode-badge',e=>getComputedStyle(e).visibility),'visible','removing the label clears the obstruction');
  await page.evaluate(()=>__app.history.undo());await frame();
  assert.equal(await page.$eval('.mode-badge',e=>getComputedStyle(e).visibility),'hidden','undo recalculates the label');
  console.log('PASS: reproduced temperature/banner overlap at 1280/1672 px; rendered pixels match an unobstructed label, banner returns without flicker, camera/tag unchanged, mobile/HUD/delete/undo handled.');
}).catch(error=>{console.error(error);process.exitCode=1});
