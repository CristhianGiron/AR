const assert = require('node:assert/strict');
const path = require('node:path');
const { run } = require('./harness.cjs');
if (!process.argv.includes('--all-models') && !process.argv.includes('--gears')) process.argv.push('--gears');
run(async ({ page, frame, close, artifacts }) => {
  const gearMode = process.argv.includes('--gears');
  const measure = () => page.evaluate(() => {
    const camera = __app.engine.camera, canvas = __app.engine.canvas.getBoundingClientRect();
    return __app.state.entries.filter(item => item.anchor.visible && item.tag.visible).map(item => {
      const corners = [0,1,2,3].map(i => new __THREE.Vector3((i & 1) - .5, (i >> 1) - .5, 0).applyMatrix4(item.tag.matrixWorld).project(camera));
      const left = Math.min(...corners.map(p => canvas.left + (p.x+1)*canvas.width/2)), right = Math.max(...corners.map(p => canvas.left + (p.x+1)*canvas.width/2));
      const top = Math.min(...corners.map(p => canvas.top + (1-p.y)*canvas.height/2)), bottom = Math.max(...corners.map(p => canvas.top + (1-p.y)*canvas.height/2));
      return { id:item.type, left,right,top,bottom,width:right-left,height:bottom-top, depth:item.tag.material.depthTest, write:item.tag.material.depthWrite, order:item.tag.renderOrder, protected:item.tag.userData.protectedBounds,expected:item.tag.userData.screenBounds };
    });
  });
  const overlap = (a,b) => Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  if (!gearMode) await page.evaluate(() => { const item = __app.state.entries[0]; __app.interface.select(item); __app.learning.ensureFocused(); });
  for (const [width,height] of [[1280,900],[390,780],[320,780],[844,390]]) {
    await page.setViewport({width,height,isMobile:true,hasTouch:true}); await close();
    for (const [zoom,x,y] of [[.5,0,0],[1,0,0],[2.4,-25,50],[1.4,35,-70]]) {
      await page.evaluate(([zoom,x,y]) => { Object.assign(__app.state.viewState,{zoom,x,y}); __app.loop.renderFrame(); },[zoom,x,y]);
      const tags = await measure();
      if (zoom <= 1 && height>600) assert.ok(tags.length, 'name has a usable place in normal view');
      for (const tag of tags) {
        assert.ok(Math.abs(tag.width-(width<=600?184:224))<1, 'name keeps its screen width: '+tag.width);
        assert.ok(tag.height>=35 && tag.height<=45, 'name keeps readable stable height');
        assert.ok(tag.left>=0&&tag.right<=width&&tag.top>=0&&tag.bottom<=height,'name stays inside viewport');
        for (const model of tag.protected) assert.ok(overlap(tag,model)<1,'name leaves geometry clear');
        assert.equal(tag.depth,false);assert.equal(tag.write,false);assert.equal(tag.order,1000);
        assert.ok(Math.abs(tag.left-tag.expected.left)<1&&Math.abs(tag.top-tag.expected.top)<1,'projection matches layout');
        for(const other of tags) if(other.id!==tag.id) assert.equal(overlap(tag,other),0);
      }
      const stable=tags.map(t=>[t.id,...[t.left,t.top,t.width].map(v=>Math.round(v*1000)/1000)]);
      await frame(); assert.deepEqual((await measure()).map(t=>[t.id,...[t.left,t.top,t.width].map(v=>Math.round(v*1000)/1000)]),stable,'stationary view does not jitter');
      await page.screenshot({path:path.join(artifacts,'names-'+(gearMode?'gears':'catalog')+'-'+width+'-'+zoom+'.png')});
    }
  }
  await page.setViewport({width:1280,height:900,isMobile:true,hasTouch:true});
  await page.evaluate(() => { Object.assign(__app.state.viewState,{zoom:1,x:0,y:0}); __app.editor.rename(__app.state.chosen,'Transmisión educativa de prueba'); __app.loop.renderFrame(); });
  assert.ok((await measure()).some(t=>t.id), 'renamed name is laid out');
  if(gearMode) {
    await page.evaluate(async()=>__app.gears.selectModel('engranajes-transmision'));
    await page.evaluate(()=>{const item=__app.state.chosen;__app.gears.restore(item,{...item.mechanism.state,separation:.7});__app.loop.renderFrame();});
    assert.ok((await measure()).length,'separated mechanism keeps name visible');
    const bounds=(await measure()).map(t=>[t.id,Math.round(t.left),Math.round(t.top)]);await frame();assert.deepEqual((await measure()).map(t=>[t.id,Math.round(t.left),Math.round(t.top)]),bounds);
  }
  await page.click('#hud-toggle');await frame();assert.equal((await measure()).length,0,'clearing view also hides name labels');
  console.log('PASS: stable screen-sized names, viewport bounds, no name collisions, foreground material, zoom/rotation/mobile, renaming, separation and HUD visibility.');
}).catch(e=>{console.error(e);process.exitCode=1;});
