import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateBands } from '../../src/ui/pagination.js';

test('keeps rows intact and leaves large gaps out of pages', () => {
  assert.deepEqual(paginateBands([{ start: 0, end: 44 }, { start: 54, end: 98 }, { start: 400, end: 444 }], 110, 444), [{ start: 0, end: 98 }, { start: 400, end: 444 }]);
});
test('side by side controls stay together on the same page', () => {
  assert.deepEqual(paginateBands([{ start: 0, end: 44 }, { start: 0, end: 50 }, { start: 60, end: 104 }], 80, 104), [{ start: 0, end: 50 }, { start: 60, end: 104 }]);
});
test('empty content still has one page', () => {
  assert.deepEqual(paginateBands([], 200, 0), [{ start: 0, end: 1 }]);
});
test('starts an educational section on its own page', () => {
  assert.deepEqual(paginateBands([{ start: 0, end: 50 }, { start: 60, end: 60, breakBefore: true }, { start: 80, end: 120 }], 200, 120), [{ start: 0, end: 50 }, { start: 60, end: 120 }]);
});
