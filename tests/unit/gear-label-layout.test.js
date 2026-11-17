import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeGearLabels, boxAt, overlapArea } from '../../src/scene/gear-label-layout.js';
const sizes = { full: { w: 166, h: 120 }, compact: { w: 100, h: 65 } };
const labelsAt = points => points.map(([x, y], index) => ({ index, anchor: { x, y }, footprint: boxAt(x - 34, y - 34, 68, 68), sizes }));
function gap(a, b) { return Math.hypot(Math.max(a.left - b.right, b.left - a.right, 0), Math.max(a.top - b.bottom, b.top - a.bottom, 0)); }
function valid(result, labels, obstacles, viewport, distance = 112) {
  for (const placement of result) {
    const b = placement.box, own = labels.find(label => label.index === placement.index);
    assert.ok(b.left >= viewport.left && b.right <= viewport.right && b.top >= viewport.top && b.bottom <= viewport.bottom);
    assert.ok(gap(b, own.footprint) <= distance, 'distance is bounded from the model edge');
    for (const label of labels) assert.equal(overlapArea(b, label.footprint), 0, 'no card covers a wheel');
    for (const obstacle of obstacles) assert.ok(overlapArea(b, obstacle) <= .5);
    for (const other of result) if (other !== placement) assert.ok(overlapArea(b, other.box) <= .5);
    assert.ok(placement.route.length >= 3, 'a leader has angled segments');
    assert.deepEqual(placement.route[0], placement.anchor);
    assert.ok(placement.route.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
    const end = placement.route.at(-1);
    assert.ok(end.x === b.left || end.x === b.right || end.y === b.top || end.y === b.bottom, 'leader terminates on the card edge');
    assert.ok(placement.route.some((p, i, points) => i >= 2 && Math.abs((points[i - 1].x - points[i - 2].x) * (p.y - points[i - 1].y) - (points[i - 1].y - points[i - 2].y) * (p.x - points[i - 1].x)) > .1), 'the elbow is not a redundant collinear point');
  }
}
test('callouts surround the model without covering its projected parts or escaping to remote corners', () => {
  const viewport = boxAt(8, 90, 1264, 798), labels = labelsAt([[520, 450], [740, 450]]), obstacles = [boxAt(550, 200, 160, 70)];
  const result = arrangeGearLabels({ labels, obstacles, viewport });
  assert.equal(result.length, 2); valid(result, labels, obstacles, viewport);
});
test('four axes use compact exterior callouts on a narrow viewport', () => {
  const viewport = boxAt(8, 85, 304, 615), obstacles = [boxAt(8, 600, 304, 100), { left: 105, top: 230, right: 225, bottom: 260 }];
  const labels = labelsAt([[115, 340], [210, 350], [195, 415], [130, 415]]);
  const result = arrangeGearLabels({ labels, obstacles, viewport, maxDistance: 112 });
  assert.equal(result.length, 4); valid(result, labels, obstacles, viewport, 112);
  assert.ok(result.some(p => p.density === 'compact'));
});
test('an obstructed model is not covered or given remote callouts as a fallback', () => {
  const viewport = boxAt(8, 85, 1264, 800), labels = labelsAt([[600, 400]]), obstacles = [boxAt(350, 150, 500, 500)];
  assert.equal(arrangeGearLabels({ labels, obstacles, viewport }).length, 0);
});
test('small camera movements preserve the relative card placement and density', () => {
  const viewport = boxAt(8, 85, 1264, 800), labels = labelsAt([[500, 450], [720, 450]]);
  const first = arrangeGearLabels({ labels, obstacles: [], viewport }), previous = [];
  first.forEach(p => { previous[p.index] = p; });
  const moved = labelsAt([[501, 452], [721, 452]]), next = arrangeGearLabels({ labels: moved, obstacles: [], viewport, previous });
  assert.equal(next.length, first.length); valid(next, moved, [], viewport);
  for (const p of next) {
    const old = previous[p.index]; assert.equal(p.density, old.density);
    assert.ok(Math.abs(p.box.left - old.box.left - 1) < .01); assert.ok(Math.abs(p.box.top - old.box.top - 2) < .01);
  }
});
test('opening a control rearranges cards outside both the control and the model', () => {
  const viewport = boxAt(8, 85, 1264, 800), labels = labelsAt([[500, 450], [720, 450]]);
  const before = arrangeGearLabels({ labels, obstacles: [], viewport }), previous = [];
  before.forEach(p => { previous[p.index] = p; });
  const obstacles = [before[0].box], after = arrangeGearLabels({ labels, obstacles, viewport, previous });
  assert.equal(after.length, 2); valid(after, labels, obstacles, viewport);
});
test('projected name bounds are respected without DOMRect dimensions', () => {
  const viewport = boxAt(8, 85, 304, 615), labels = labelsAt([[90, 340], [230, 340]]);
  const obstacles = [{ left: 100, top: 230, right: 240, bottom: 280 }];
  const result = arrangeGearLabels({ labels, obstacles, viewport, maxDistance: 112 });
  assert.equal(result.length, 2); valid(result, labels, obstacles, viewport, 112);
});

test('partially visible wheels remain protected even when their axis has no callout', () => {
  const viewport = boxAt(8, 85, 640, 600), labels = labelsAt([[210, 330]]);
  const offscreenWheel = boxAt(-40, 190, 160, 280);
  const modelBounds = [labels[0].footprint, offscreenWheel];
  const result = arrangeGearLabels({ labels, obstacles: [], viewport, modelBounds });
  assert.equal(result.length, 1); valid(result, labels, [], viewport);
  assert.equal(overlapArea(result[0].box, offscreenWheel), 0);
});
