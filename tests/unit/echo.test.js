import test from 'node:test';
import assert from 'node:assert/strict';
import { echoResponse, describeEcho } from '../../src/education/echo-model.js';
import { validateProject } from '../../src/storage/project-format.js';
import { stepCompleted } from '../../src/education/mission-model.js';
test('echo model doubles travel distance and increases return time monotonically',()=>{
 const near=echoResponse(20),far=echoResponse(200);
 assert.ok(Math.abs(echoResponse(100).echoMs-5.83090379)<1e-7);
 assert.ok(Math.abs(far.echoMs/near.echoMs-10)<1e-10);
 assert.ok(far.echoMs>near.echoMs);
});
test('missing echo never becomes a zero-distance measurement',()=>{
 assert.deepEqual(echoResponse(100,false),{distanceCm:null,echoMs:null,present:false});
 assert.ok(describeEcho({distanceCm:100,present:false}).includes('no disponible'));
 for(const d of [NaN,Infinity,0,201,'100'])assert.throws(()=>echoResponse(d));
});
test('echo observations require near, far and missing echo independently',()=>{
 const item={definition:{id:'sensor-ultrasonico'},echoActivity:{observations:[{distanceCm:20,present:true},{distanceCm:200,present:true}]}},step={criterio:'echo-observations',modelo:'sensor-ultrasonico'};
 assert.equal(stepCompleted(step,[item],new Map()),false);
 item.echoActivity.observations.push({distanceCm:100,present:false});assert.equal(stepCompleted(step,[item],new Map()),true);
});
test('portable scenes preserve echo notes and reject invalid sensor observations',()=>{
 const scene={format:'explorar-project',version:1,name:'Eco',assets:[],view:{x:0,y:0,zoom:1},entries:[{source:{catalog:'sensor-ultrasonico'},name:'Sensor',position:[0,0,0],rotation:[0,0,0],size:1,height:1.85,color:'#ffffff',echoActivity:{distanceCm:70,present:false,explanation:'El sonido debe ir y volver.',observations:[{distanceCm:70,present:false}]}}]};
 const ids=new Set(['sensor-ultrasonico']);const saved=validateProject(scene,ids);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(saved)),ids),saved);
 scene.entries[0].echoActivity.observations[0].present='false';assert.throws(()=>validateProject(scene,ids));
});
