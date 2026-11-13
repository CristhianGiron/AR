import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProject, encodeBuffer, decodeBuffer } from '../../src/storage/project-format.js';
import { lightResponse } from '../../src/education/ldr-model.js';
const catalog = new Set(['sensor-luz-ldr']);
const scene = () => ({ format: 'explorar-project', version: 1, name: 'Mi experimento', assets: [], entries: [{ source: { catalog: 'sensor-luz-ldr' }, name: 'Mi LDR', color: '#abcdef', position: [1, 0, -2], rotation: [45, -90, 10], size: 1.4, height: 2, activity: { distance: .3, observations: [{ distance: .1 }, { distance: .9 }], explanation: 'Con más luz disminuye la resistencia.' } }], view: { x: 2, y: 3, zoom: 1 }, selected: 0, isolated: null, answers: [{ model: 'sensor-luz-ldr', index: 1 }] });
test('scene format preserves transformations, experiment and answers through JSON', () => {
 const saved = validateProject(scene(), catalog);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(saved)), catalog), saved);
 assert.deepEqual(saved.entries[0].homePosition, [1, 0, -2]);
 assert.equal(saved.entries[0].activity.observations.length, 2);
});
test('scene validation rejects unknown models, invalid transforms, selection and excessive observations', () => {
 const changes = [s => s.version = 99, s => s.entries[0].source.catalog = 'missing', s => s.entries[0].size = Infinity, s => s.entries[0].rotation[1] = NaN, s => s.selected = 5, s => s.entries[0].color = 'red', s => s.entries[0].activity.observations = Array.from({length:13},()=>({distance:0}))];
 for (const change of changes) { const s=scene();change(s);assert.throws(()=>validateProject(s,catalog)); }
});
test('binary models round trip including bytes above ASCII and chunk boundary', () => {
 const source=Uint8Array.from({length:70001},(_,i)=>i%256);
 assert.deepEqual(new Uint8Array(decodeBuffer(encodeBuffer(source.buffer))),source);
});
test('local models cannot masquerade as catalog models and must refer to included assets', () => {
 const s=scene();s.entries[0].source={asset:'missing'};assert.throws(()=>validateProject(s,catalog));
 s.assets=[{id:'missing',glb:'AAAA',definition:{id:'sensor-luz-ldr'}}];assert.throws(()=>validateProject(s,catalog));
});
test('qualitative LDR response decreases resistance as light increases and clamps distances',()=>{
 const near=lightResponse(0),far=lightResponse(1);
 assert.equal(near.lightLabel,'alta');assert.equal(near.resistanceLabel,'baja');
 assert.equal(far.lightLabel,'baja');assert.equal(far.resistanceLabel,'alta');
 for(let d=0;d<1;d+=.1) assert.ok(lightResponse(d).resistance<=lightResponse(d+.1).resistance);
 assert.deepEqual(lightResponse(-5),near);assert.deepEqual(lightResponse(5),far);assert.throws(()=>lightResponse(NaN));
});

test('journey progress and written notes are optional and validated',()=>{
 const s=scene();assert.deepEqual(validateProject(s,catalog).journey,{id:null,step:0,notes:{}});
 s.journey={id:'infrarrojos',step:4,notes:{infrarrojos:'Elegiría el PIR para detectar movimiento.'}};
 assert.deepEqual(validateProject(s,catalog).journey,s.journey);
 s.journey.step=99;assert.throws(()=>validateProject(s,catalog));
});
