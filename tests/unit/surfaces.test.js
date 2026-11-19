import test from 'node:test';
import assert from 'node:assert/strict';
import { horizontalSurface } from '../../src/scene/surface-pose.js';
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
test('horizontal placement accepts floors and rejects walls, ceilings and invalid poses',()=>{
 const flat=identity();flat[12]=1;flat[14]=-2;assert.equal(horizontalSurface(flat),true);
 const wall=identity();wall[5]=0;wall[6]=1;assert.equal(horizontalSurface(wall),false);
 const ceiling=identity();ceiling[5]=-1;assert.equal(horizontalSurface(ceiling),false);
 assert.equal(horizontalSurface([1,2]),false);flat[0]=NaN;assert.equal(horizontalSurface(flat),false);
});

import { createSurfaceTracker } from '../../src/scene/surface-pose.js';
test('surface confirmation needs time and repeated nearby measurements', () => {
 const scan = createSurfaceTracker(), flat = identity();
 assert.equal(scan.update(flat, 0).ready, false);
 assert.equal(scan.update(flat, 80).ready, false);
 assert.equal(scan.update(flat, 160).ready, true);
 assert.deepEqual(scan.update(null, 200), {visible:true,ready:false,restarted:false});
 assert.equal(scan.update(null, 420).visible, false);
 assert.equal(scan.update(flat, 430).ready, false);
});
test('surface jumps, gradual travel, normal changes and reset require reconfirmation', () => {
 const scan = createSurfaceTracker(), flat = identity();
 scan.update(flat, 0); scan.update(flat, 80); scan.update(flat, 160);
 const moved = identity(); moved[13] = .2;
 assert.equal(scan.update(moved, 180).ready, false, 'different height cannot place immediately');
 scan.update(moved, 260); assert.equal(scan.update(moved, 340).ready, true);
 scan.reset(); assert.equal(scan.update(moved, 400).ready, false);
 const travel = createSurfaceTracker();
 for (let i=0; i<20; i++) { const m=identity(); m[12]=i*.02; assert.equal(travel.update(m,i*30).ready,false); }
 const tilted=identity(); tilted[5]=Math.cos(.2); tilted[6]=Math.sin(.2);
 assert.equal(scan.update(tilted,420).ready,false);
});
