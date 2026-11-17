import { actualRPM } from './gear-dynamics.js';
import { gearRPM } from './gear-model.js';

// Deliberately gentle, illustrative timbres; these are not measured acoustic levels.
export const GEAR_TIMBRES = Object.freeze({
  rectos: Object.freeze({ level: .036, noise: .9, tone: .18, pulse: .9, band: 1050, base: 105, wave: 'sawtooth' }),
  helicoidales: Object.freeze({ level: .012, noise: .35, tone: .35, pulse: .12, band: 580, base: 85, wave: 'sine' }),
  conicos: Object.freeze({ level: .028, noise: .7, tone: .25, pulse: .6, band: 1350, base: 135, wave: 'triangle' }),
  transmision: Object.freeze({ level: .027, noise: .75, tone: .2, pulse: .7, band: 900, base: 95, wave: 'sawtooth' }),
});
export function gearSoundVoices(item) {
  const m = item?.mechanism, type = item?.definition?.mecanismo?.tipo, profile = GEAR_TIMBRES[type];
  if (!m || !profile || !item.anchor.visible) return [];
  const rpm = Math.abs(actualRPM(m));
  if (!Number.isFinite(rpm) || rpm <= .001) return [];
  const stages = m.system.stages || [{ input: 0, teeth: m.system.teeth }];
  return stages.map(stage => {
    const shaftRPM = Math.abs(gearRPM(m.system, rpm, stage.input));
    const meshHz = shaftRPM * stage.teeth[0] / 60;
    return { type, profile, meshHz, pulseHz: Math.min(180, Math.max(.1, meshHz)),
      frequency: Math.min(1800, profile.base + meshHz * 2.5),
      gain: profile.level * Math.min(1, Math.sqrt(shaftRPM / 30)) / Math.sqrt(stages.length) };
  });
}
