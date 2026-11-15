import test from 'node:test';
import assert from 'node:assert/strict';
import { modelFormat, findResource } from '../../src/models/formats.js';

test('model dispatch accepts supported extensions and rejects unrelated files', () => {
  for (const format of ['glb', 'gltf', 'obj', 'fbx', 'stl', 'ply']) assert.equal(modelFormat('model.' + format.toUpperCase() + '?v=1'), format);
  for (const file of ['model.blend', 'model.zip', 'model.obj.exe', 'model']) assert.throws(() => modelFormat(file));
});

test('sidecar resolution preserves exact paths and handles encoded and Windows references', () => {
  const file = { name: 'red paint.png' };
  assert.equal(findResource([file], 'C:\\textures\\red%20paint.png'), file);
  const other = { name: 'red paint.png', webkitRelativePath: 'other/red paint.png' };
  const nested = { name: 'red paint.png', webkitRelativePath: 'textures/red paint.png' };
  assert.equal(findResource([nested, other], './textures/red%20paint.png'), nested);
  assert.throws(() => findResource([nested, other], 'missing/red paint.png'), /varios recursos/);
  assert.throws(() => findResource([file], 'mesh.bin'), /Falta el recurso mesh.bin/);
});
