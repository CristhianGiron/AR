import test from 'node:test';
import assert from 'node:assert/strict';
import { gearSoundVoices, GEAR_TIMBRES } from '../../src/education/gear-sound-model.js';
import { GEAR_SYSTEMS } from '../../src/education/gear-model.js';
import { DEFAULT_GEAR_DESIGN } from '../../src/education/gear-design.js';
const item = (type='rectos') => ({ definition: { mecanismo: { tipo: type } }, anchor: { visible: true }, mechanism: {
  system: GEAR_SYSTEMS[type], state: { rpm: 60, running: true, separation: 0, isolated: null }, motion: { omega: 0 }
} });
test('each gear type has a distinct quiet timbre, with spur more prominent than helical', () => {
  const voices=Object.keys(GEAR_TIMBRES).map(type=>gearSoundVoices(item(type)));
  assert.deepEqual(voices.map(list=>list.length),[1,1,1,3]);
  assert.ok(voices[0][0].gain>voices[1][0].gain);
  assert.ok(voices[0][0].profile.pulse>voices[1][0].profile.pulse);
  assert.equal(new Set(voices.map(list=>JSON.stringify(list[0].profile))).size,4);
});
test('contact pulses track real shaft speed and tooth count, including transmission stages', () => {
  const i=item();const slow=gearSoundVoices(i)[0];assert.equal(slow.meshHz,15);
  i.mechanism.state.rpm=120;assert.equal(gearSoundVoices(i)[0].meshHz,30);
  i.mechanism.system={...GEAR_SYSTEMS.rectos,teeth:[30,60]};assert.equal(gearSoundVoices(i)[0].meshHz,60);
  const stages=gearSoundVoices(item('transmision'));assert.deepEqual(stages.map(v=>v.meshHz),[26,18,18]);
});
test('pause, disconnected, isolated, invisible and stalled mechanisms are silent', () => {
  const i=item();
  for(const patch of [{running:false},{separation:.1},{isolated:0}]) { const m=item();Object.assign(m.mechanism.state,patch);assert.deepEqual(gearSoundVoices(m),[]); }
  i.anchor.visible=false;assert.deepEqual(gearSoundVoices(i),[]);
  i.anchor.visible=true;i.mechanism.design=DEFAULT_GEAR_DESIGN;i.mechanism.state.drive={enabled:true,force:0};
  assert.deepEqual(gearSoundVoices(i),[],'zero actual force-mode RPM is silent even if configured RPM is 60');
  i.mechanism.motion.omega=Math.PI;assert.ok(Math.abs(gearSoundVoices(i)[0].meshHz-7.5)<1e-10);
  i.mechanism.state.rpm=NaN;i.mechanism.state.drive.enabled=false;assert.deepEqual(gearSoundVoices(i),[]);
  assert.deepEqual(gearSoundVoices({}),[]);
});
