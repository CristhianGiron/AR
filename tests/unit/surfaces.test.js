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
