import { GEAR_SYSTEMS } from '../../src/education/gear-model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { transmission, torqueExample } from '../../src/education/gear-class-model.js';
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
