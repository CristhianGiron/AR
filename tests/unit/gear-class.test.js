import { GEAR_SYSTEMS } from '../../src/education/gear-model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { transmission, torqueExample, relationReadings } from '../../src/education/gear-class-model.js';
test('class examples calculate ratio, RPM and torque with units kept separate', () => {
  assert.equal(transmission([20, 40], 100).ratio, 2);
  assert.equal(transmission([15, 30], 100).output, 50);
  assert.equal(transmission([40, 20], 100).output, 200);
  assert.equal(transmission([30, 30], 100).outputTurns, 1);
  assert.equal(torqueExample(10, .5), 5);
  for (const values of [[NaN, .5], [10, 0], [-1, .5]]) assert.throws(() => torqueExample(...values));
});

test('compound lesson uses the product of stage ratios rather than the first and last tooth counts', () => {
  const result = transmission(GEAR_SYSTEMS.transmision, 26);
  assert.equal(result.ratio, 1);
  assert.equal(result.output, 26);
  assert.equal(result.outputTurns, 1);
});

test('relation equates teeth, physical pitch diameters, RPM and radians for the actual design', () => {
  const mechanism={system:GEAR_SYSTEMS.rectos,physical:{parts:[{pitchRadius:.01875},{pitchRadius:.0375}]},state:{rpm:100,running:false,separation:0,isolated:null}};
  const r=relationReadings(mechanism);
  assert.deepEqual(r.diameters,[37.5,75]);assert.equal(r.ratio,2);assert.equal(r.rpm1,100);assert.equal(r.rpm2,50);
  assert.ok(Math.abs(r.omega1-100*Math.PI/30)<1e-12);assert.equal(r.omega1/r.omega2,2);assert.equal(r.configured,true);
  delete mechanism.physical;mechanism.design={teeth:[24,36],module:2};mechanism.system={...GEAR_SYSTEMS.rectos,teeth:[24,36]};
  const generated=relationReadings(mechanism);assert.deepEqual(generated.diameters,[48,72]);assert.equal(generated.ratio,1.5);
});
test('relation follows actual force-mode velocity and keeps the geometry ratio at rest', () => {
  const mechanism={system:GEAR_SYSTEMS.rectos,physical:{parts:[{pitchRadius:.01875},{pitchRadius:.0375}]},state:{rpm:100,running:true,separation:0,isolated:null,drive:{enabled:true}},motion:{omega:Math.PI}};
  const r=relationReadings(mechanism);assert.equal(r.configured,false);assert.ok(Math.abs(r.rpm1-30)<1e-12);assert.equal(r.omega1/r.omega2,2);
  mechanism.state.running=false;const stopped=relationReadings(mechanism);assert.equal(stopped.rpm1,0);assert.equal(stopped.rpm2,0);assert.equal(stopped.stopped,true);assert.equal(stopped.ratio,2);
});
test('parallel shaft spacing determines pitch circles while compound and uncalibrated bevel do not invent diameters', () => {
  const m=system=>({system,state:{rpm:26,running:false,separation:0,isolated:null}});
  assert.deepEqual(relationReadings(m(GEAR_SYSTEMS.helicoidales)).diameters,[37.5,75]);
  assert.equal(relationReadings(m(GEAR_SYSTEMS.conicos)).diameters,null);
  const compound=relationReadings(m(GEAR_SYSTEMS.transmision));assert.equal(compound.ratio,1);assert.equal(compound.rpm2,26);assert.equal(compound.diameters,null);
});
