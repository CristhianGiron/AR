import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_GEAR_DESIGN, validateGearDesign, gearDimensions, parametricSystem, spurOutline, toothHalfAngle, PRESSURE_ANGLE } from '../../src/education/gear-design.js';
import { validateProject } from '../../src/storage/project-format.js';
import { rotationAngles } from '../../src/education/gear-model.js';

test('standard dimensions, matched module and phase agree at the pitch circles', () => {
  const d = gearDimensions(20, 2);
  assert.equal(d.pitch, 20); assert.equal(d.tip, 22); assert.equal(d.root, 17.5);
  assert.ok(Math.abs(d.base - 20 * Math.cos(PRESSURE_ANGLE)) < 1e-12);
  const s = parametricSystem({ ...DEFAULT_GEAR_DESIGN, teeth: [24, 36], module: 2 });
  assert.equal(s.centers[1][0], 60);
  assert.ok(Math.abs(rotationAngles(s, 3)[1] - (s.phase[1] - 2)) < 1e-12);
  assert.ok(Math.abs(toothHalfAngle(20, 2, d.pitch) - (Math.PI / 40 - .08 / 80)) < 1e-12);
});

test('generated outlines contain exactly the requested number of teeth and no degenerate edges', () => {
  for (const z of [18, 20, 24, 36, 80, 120]) {
    const m = z === 18 ? .5 : 2.5, { root, tip } = gearDimensions(z, m), points = spurOutline(z, m);
    let peaks = 0, area = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i], previous = points[(i + points.length - 1) % points.length];
      const r = Math.hypot(...p), before = Math.hypot(...previous);
      assert.ok(p.every(Number.isFinite)); assert.ok(r >= root - 1e-8 && r <= tip + 1e-8);
      assert.ok(Math.hypot(p[0] - previous[0], p[1] - previous[1]) > 1e-9);
      if (Math.abs(r - tip) < 1e-8 && Math.abs(before - tip) >= 1e-8) peaks++;
      area += previous[0] * p[1] - p[0] * previous[1];
    }
    assert.equal(peaks, z); assert.ok(area > 0);
  }
});

test('invalid counts, oversized bores and unsupported dimensions are rejected', () => {
  for (const patch of [{ teeth: [17, 40] }, { teeth: [20.5, 40] }, { teeth: [20, 121] }, { module: 0 }, { module: NaN }, { width: 21 }, { bore: -1 }, { bore: 41 }, { teeth: [18, 20], module: .5, bore: 8 }, { version: 2 }]) {
    assert.throws(() => validateGearDesign({ ...DEFAULT_GEAR_DESIGN, ...patch }));
  }
  assert.doesNotThrow(() => validateGearDesign({ ...DEFAULT_GEAR_DESIGN, teeth: [18, 120], module: .5, bore: 0 }));
  const design = validateGearDesign(DEFAULT_GEAR_DESIGN); design.teeth[0] = 30;
  assert.equal(DEFAULT_GEAR_DESIGN.teeth[0], 20);
});

test('sampled mating profiles stay outside one another through a tooth cycle', () => {
  function inside(point, polygon) {
    let result = false;
    for (let i = 0, previous = polygon.length - 1; i < polygon.length; previous = i++) {
      const a = polygon[i], b = polygon[previous];
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  }
  for (const teeth of [[18, 18], [20, 40], [40, 20], [18, 120]]) {
    const system = parametricSystem({ ...DEFAULT_GEAR_DESIGN, teeth, module: 1, bore: 0 });
    const a = spurOutline(teeth[0], 1), b = spurOutline(teeth[1], 1), center = system.centers[1][0];
    for (let frame = 0; frame < 12; frame++) {
      const angle = frame * 2 * Math.PI / (teeth[0] * 12), other = system.phase[1] - angle * teeth[0] / teeth[1];
      for (const [x, y] of a) {
        const wx = x * Math.cos(angle) - y * Math.sin(angle) - center, wy = x * Math.sin(angle) + y * Math.cos(angle);
        const local = [wx * Math.cos(other) + wy * Math.sin(other), -wx * Math.sin(other) + wy * Math.cos(other)];
        if (Math.hypot(...local) < teeth[1] / 2 + 1) assert.equal(inside(local, b), false, 'Perfil sin penetración: ' + teeth);
      }
    }
  }
});

test('design survives project validation and cannot be attached to another model', () => {
  const state = { angle: .5, rpm: 12, direction: 1, separation: 0, offsets: [0, 0], isolated: null, design: DEFAULT_GEAR_DESIGN };
  const data = { format: 'explorar-project', version: 1, name: 'Diseño', assets: [], entries: [{ source: { catalog: 'engranajes-rectos' }, gearState: state, name: 'Prueba', color: '#ffffff', position: [0, 0, 0], rotation: [0, 0, 0], size: 1, height: 2 }], view: { x: 0, y: 0, zoom: 1 } };
  const valid = validateProject(JSON.parse(JSON.stringify(data)), new Set(['engranajes-rectos']));
  assert.deepEqual(valid.entries[0].gearState.design, DEFAULT_GEAR_DESIGN);
  data.entries[0].source.catalog = 'otro'; assert.throws(() => validateProject(data, new Set(['otro'])));
});
