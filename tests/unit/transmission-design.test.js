import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProject } from '../../src/storage/project-format.js';
import { TRANSMISSION_VARIANTS, transmissionSystem, validateTransmissionVariant } from '../../src/education/transmission-design.js';
import { gearRatio, speedFactors, rotationAngles, validateGearState } from '../../src/education/gear-model.js';
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-9,`${a} ≈ ${b}`);
test('three lesson variants and the advanced compound train have correct ratios, axes and wheel counts', () => {
  for (const [id, ratio, factors, wheels] of [
    ['simple',1,[1,-2/3,1],3],['reducer',4,[1,-.5,.25],4],['multiplier',.25,[1,-2,4],4],['advanced',6,[1,-.5,1/6,-1/12,1/6],8]
  ]) {
    const s=transmissionSystem(id);near(gearRatio(s),ratio);
    const actual=speedFactors(s);actual.forEach((v,i)=>near(v,factors[i]));
    assert.equal(s.partTeeth.flat().length,wheels);assert.equal(s.nodes.length,factors.length);
    assert.equal(new Set(s.nodes).size,s.nodes.length);
  }
});
test('each contact has tangent pitch circles and phased teeth throughout a revolution', () => {
  for(const id of Object.keys(TRANSMISSION_VARIANTS)){
    const s=transmissionSystem(id), compound=TRANSMISSION_VARIANTS[id].compound;
    s.stages.forEach((stage,i)=>{
      const a=s.centers[stage.input],b=s.centers[stage.output];
      near(Math.hypot(b[0]-a[0],b[1]-a[1]),s.module*(stage.teeth[0]+stage.teeth[1])/2);
      for(const angle of [0,.4,1,2*Math.PI]){
        const rotations=rotationAngles(s,angle);
        const input=rotations[stage.input]-(compound?s.phase[stage.input]:0),output=rotations[stage.output];
        const expected=(1+stage.teeth[0]/stage.teeth[1])*s.contacts[i].angle+Math.PI-Math.PI/stage.teeth[1]-input*stage.teeth[0]/stage.teeth[1];
        near(output,expected);
      }
    });
  }
});
test('variant persistence validates known identifiers and rejects invented geometry', () => {
  for(const bad of ['none','constructor','__proto__',{},null])assert.throws(()=>validateTransmissionVariant(bad));
  const state={angle:0,rpm:12,direction:1,separation:0,offsets:[0,0,0,0,0],isolated:null,transmissionVariant:'advanced'};
  assert.equal(validateGearState(state).transmissionVariant,'advanced');
  assert.throws(()=>validateGearState({...state,transmissionVariant:'invalid'}));
});

test('project variants belong only to the transmission catalog entry', () => {
  const state={angle:0,rpm:12,direction:1,separation:0,offsets:[0,0,0,0,0],isolated:null,transmissionVariant:'advanced'};
  const p={format:'explorar-project',version:1,name:'Variantes',assets:[],entries:[{source:{catalog:'engranajes-transmision'},gearState:state,name:'Prueba',color:'#ffffff',position:[0,0,0],rotation:[0,0,0],size:1,height:2}],view:{x:0,y:0,zoom:1},answers:[]};
  assert.equal(validateProject(p,new Set(['engranajes-transmision'])).entries[0].gearState.transmissionVariant,'advanced');
  p.entries[0].source.catalog='engranajes-rectos';assert.throws(()=>validateProject(p,new Set(['engranajes-rectos'])));
});
