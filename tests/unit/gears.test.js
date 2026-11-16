import test from 'node:test';
import assert from 'node:assert/strict';
import { GEAR_SYSTEMS, drivenRPM, rotationAngles, validateGearState } from '../../src/education/gear-model.js';
import { validateProject } from '../../src/storage/project-format.js';

test('meshed gears preserve tooth ratio, opposite direction and continuous full turns', () => {
  assert.equal(drivenRPM(GEAR_SYSTEMS.rectos.teeth, 24), 12);
  const turns = rotationAngles(GEAR_SYSTEMS.rectos, 4 * Math.PI);
  assert.ok(Math.abs(turns[0] - 4 * Math.PI) < 1e-12); assert.ok(Math.abs(turns[1] + 2 * Math.PI) < 1e-12);
  for (const system of [GEAR_SYSTEMS.conicos, GEAR_SYSTEMS.helicoidales]) {
    const a = rotationAngles(system, .4), b = rotationAngles(system, .7);
    assert.ok(Math.abs((b[1] - a[1]) / (b[0] - a[0]) + system.teeth[0] / system.teeth[1]) < 1e-12);
  }
  assert.equal(drivenRPM(GEAR_SYSTEMS.helicoidales.teeth, 24), 12);
});
test('independent rotation keeps the other gear stationary', () => {
  const before = rotationAngles(GEAR_SYSTEMS.rectos, 1, [0, 0]);
  const after = rotationAngles(GEAR_SYSTEMS.rectos, 1, [.3, 0]);
  assert.equal(after[1], before[1]); assert.equal(after[0] - before[0], .30000000000000004);
});
test('gear state survives project JSON and excludes automatic motion on restore', () => {
  const gearState = { angle: 4.5, rpm: 30, direction: -1, separation: .7, offsets: [.4, -.1], isolated: 1, running: true };
  assert.equal(validateGearState(gearState).running, undefined);
  const data = { format: 'explorar-project', version: 1, name: 'Taller', assets: [], entries: [{ source: { catalog: 'gear' }, gearState, name: 'Rectos', color: '#ffffff', position: [0, 0, 0], rotation: [0, 0, 0], size: 1, height: 2 }], view: { x: 0, y: 0, zoom: 1 }, answers: [] };
  const result = validateProject(JSON.parse(JSON.stringify(data)), new Set(['gear']));
  assert.deepEqual(result.entries[0].gearState, validateGearState(gearState));
  for (const change of [s => s.rpm = 0, s => s.angle = Infinity, s => s.direction = 0, s => s.separation = 2, s => s.offsets = [NaN, 0], s => s.isolated = 7]) {
    const state = { ...gearState }; change(state); assert.throws(() => validateGearState(state));
  }
});
