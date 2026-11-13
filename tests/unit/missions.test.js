import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateMissions, stepCompleted } from '../../src/education/mission-model.js';
const data = JSON.parse(readFileSync(new URL('../../contenido/misiones.json', import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL('../../modelos-3d/catalogo.json', import.meta.url)));
test('guided routes reference available models and supported activities', () => {
 const missions = validateMissions(data, new Set(catalog.modelos.map(m=>m.id)));
 assert.equal(missions.length, 3);assert.throws(()=>validateMissions(data,new Set()));
});
test('light comparison needs observations of both high and low light',()=>{
 const step={criterio:'observations',modelo:'ldr'}, item={definition:{id:'ldr'},activity:{observations:[{distance:.1},{distance:.2}]}};
 assert.equal(stepCompleted(step,[item],new Map()),false);
 item.activity.observations.push({distance:.9});assert.equal(stepCompleted(step,[item],new Map()),true);
});
test('distinct part visits, correct response and written reflection are separate evidence',()=>{
 const item={definition:{id:'ldr'},partsVisited:['pista','pista']}, entries=[item];
 assert.equal(stepCompleted({criterio:'parts',modelo:'ldr',minimo:2},entries,new Map()),false);
 item.partsVisited.push('terminal');assert.equal(stepCompleted({criterio:'parts',modelo:'ldr',minimo:2},entries,new Map()),true);
 assert.equal(stepCompleted({criterio:'answer',modelo:'ldr'},entries,new Map([['ldr',false]])),false);
 assert.equal(stepCompleted({criterio:'answer',modelo:'ldr'},entries,new Map([['ldr',true]])),true);
 assert.equal(stepCompleted({criterio:'reflection'},entries,new Map(),'breve'),false);
 assert.equal(stepCompleted({criterio:'reflection'},entries,new Map(),'Una explicación escrita suficientemente larga.'),true);
});
