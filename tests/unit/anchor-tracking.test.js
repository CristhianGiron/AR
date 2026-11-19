import test from 'node:test';
import assert from 'node:assert/strict';
import { rigidAnchorPose, createAnchorRecovery } from '../../src/scene/anchor-tracking.js';
const pose = (x=0, angle=0) => [Math.cos(angle),Math.sin(angle),0,0,-Math.sin(angle),Math.cos(angle),0,0,0,0,1,0,x,0,-2,1];
test('anchor accepts arbitrary rotations but rejects corrupt transforms', () => {
 for (const a of [0, Math.PI/2, Math.PI, -Math.PI/2]) assert.equal(rigidAnchorPose(pose(0,a)),true);
 assert.equal(rigidAnchorPose(null),false);
 for (const [i,v] of [[0,NaN],[12,Infinity],[0,2],[15,0],[8,.5],[3,.1]]) {
  const m=pose();m[i]=v;assert.equal(rigidAnchorPose(m),false);
 }
 const reflected=pose();reflected[10]=-1;assert.equal(rigidAnchorPose(reflected),false);
});
test('recovery waits for coherent samples and resets on losses, gaps or origin resets', () => {
 const r=createAnchorRecovery();
 assert.equal(r.update(pose(),0),false);assert.equal(r.update(pose(),80),false);
 assert.equal(r.update(pose(),160),false);assert.equal(r.update(pose(),240),true);
 // A native origin correction must be accepted together with the camera correction.
 assert.equal(r.update(pose(3,Math.PI),256),true);
 assert.equal(r.update(null,272),false);
 for(const t of [300,380,460])assert.equal(r.update(pose(3,Math.PI),t),false);
 assert.equal(r.update(pose(3,Math.PI),540),true);
 assert.equal(r.update(pose(3,Math.PI),900),false,'long missing frame interval requires recovery');
 r.reset();assert.equal(r.update(pose(),910),false);
});
test('unstable recovery does not flash the model; slow and fast frame rates need elapsed time', () => {
 for(const step of [8,16,80]){
  const r=createAnchorRecovery();
  for(let t=0;t<200;t+=step)assert.equal(r.update(pose(),t),false);
  assert.equal(r.update(pose(),240),true);
 }
 const r=createAnchorRecovery();
 for(let t=0;t<1000;t+=80)assert.equal(r.update(pose((t/80)%2*.1),t),false);
 const rotating=createAnchorRecovery();
 for(let t=0;t<1000;t+=80)assert.equal(rotating.update(pose(0,(t/80)%2*.2),t),false);
});
