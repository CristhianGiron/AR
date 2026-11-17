import { validateTransmissionVariant } from './transmission-design.js';
import { validateDrive } from './gear-dynamics.js';
import { validateGearDesign } from './gear-design.js';
export const GEAR_SYSTEMS = {
  transmision: {
    teeth: [26, 26, 13, 18], partTeeth: [[26], [26, 18], [13], [18]],
    nodes: ['Body', 'Body001', 'Body002', 'Body003'],
    labels: ['Entrada · 26 dientes', 'Intermedio 1 · 26 y 18 dientes', 'Intermedio 2 · 13 dientes', 'Salida · 18 dientes'],
    centers: [[0, 0, 5], [65, 0, -1.5], [50.35, -36, -8], [12, -36, -8]], axes: [[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]],
    stages: [{ input: 0, output: 1, teeth: [26, 26] }, { input: 1, output: 2, teeth: [18, 13] }, { input: 2, output: 3, teeth: [13, 18] }],
    separation: [[-1, 0, .4], [1, 0, .4], [1, -1, -.4], [-1, -1, -.4]], travel: 38, phase: [0, 0, 0, 0],
    description: 'Transmisión compuesta de tres etapas: 26→26, 18→13 y 13→18 dientes. Las dos ruedas del primer eje intermedio giran juntas. La salida gira a la misma velocidad que la entrada y en sentido contrario.'
  },
  rectos: { teeth: [15, 30], nodes: ['pinion', 'gear'], centers: [[0, 0, 7.5], [56.25, 0, 7.5]], axes: [[0, 0, 1], [0, 0, 1]], separation: [[-1, 0, 0], [1, 0, 0]], travel: 35, phase: [0, 0], description: 'El piñón de 15 dientes mueve la rueda de 30. La rueda gira a la mitad de velocidad y en sentido contrario.' },
  conicos: { teeth: [15, 15], nodes: ['pinion001', 'gear004'], centers: [[0, 0, 5.5], [0, -5.5, 0]], axes: [[0, 0, 1], [0, -1, 0]], separation: [[0, 0, 1], [0, -1, 0]], travel: 9, phase: [0, 0], description: 'Dos ruedas de 15 dientes transmiten el giro entre ejes perpendiculares. La relación de velocidades es 1:1.' },
  helicoidales: { teeth: [15, 30], nodes: ['pinion', 'gear'], centers: [[0, 0, 7.5], [56.25, 0, 7.5]], axes: [[0, 0, 1], [0, 0, 1]], separation: [[-1, 0, 0], [1, 0, 0]], travel: 35, phase: [0, 0], description: 'Dos engranajes originales de dientes inclinados transmiten el giro de forma progresiva. El piñón de 15 dientes mueve la rueda de 30 a la mitad de velocidad y en sentido contrario.' },
};

export function drivenRPM(teeth, rpm) { return rpm * teeth[0] / teeth[1]; }
export function speedFactors(system) {
  if (!system.stages) return [1, -system.teeth[0] / system.teeth[1]];
  const factors = Array(system.nodes.length).fill(0); factors[0] = 1;
  for (const stage of system.stages) factors[stage.output] = -factors[stage.input] * stage.teeth[0] / stage.teeth[1];
  return factors;
}
export function gearRatio(system) { return 1 / Math.abs(speedFactors(system).at(-1)); }
export function gearRPM(system, rpm, index = system.nodes.length - 1) { return Math.abs(speedFactors(system)[index]) * rpm; }
export function rotationAngles(system, angle, offsets = []) {
  return speedFactors(system).map((factor, index) => angle * factor + (offsets[index] || 0) + (system.phase[index] || 0));
}
export function validateGearState(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || !Number.isFinite(value.angle) || Math.abs(value.angle) > 1e8 ||
      !Number.isFinite(value.rpm) || value.rpm < 1 || value.rpm > 120 || ![1, -1].includes(value.direction) ||
      !Number.isFinite(value.separation) || value.separation < 0 || value.separation > 1 ||
      !Array.isArray(value.offsets) || (value.offsets.length < 2 || value.offsets.length > 16) || !value.offsets.every((v) => Number.isFinite(v) && Math.abs(v) <= 1e8) ||
      (value.isolated !== null && (!Number.isInteger(value.isolated) || value.isolated < 0 || value.isolated >= value.offsets.length))) throw new Error('El estado de los engranajes no es válido.');
  const result = { angle: value.angle, rpm: value.rpm, direction: value.direction, separation: value.separation, offsets: [...value.offsets], isolated: value.isolated };
  if (value.colors !== undefined) {
    if (!Array.isArray(value.colors) || value.colors.length !== value.offsets.length || !value.colors.every(color => color === null || (typeof color === 'string' && /^#[a-f\d]{6}$/i.test(color)))) throw new Error('Los colores de los engranajes no son válidos.');
    result.colors = value.colors.map(color => color === null ? null : color.toLowerCase());
  }
  if (value.drive !== undefined) result.drive = validateDrive(value.drive);
  if (value.design !== undefined) result.design = validateGearDesign(value.design);
  if (value.transmissionVariant !== undefined) result.transmissionVariant = validateTransmissionVariant(value.transmissionVariant);
  return result;
}
