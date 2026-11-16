import { validateGearDesign } from './gear-design.js';
export const GEAR_SYSTEMS = {
  rectos: { teeth: [15, 30], nodes: ['pinion', 'gear'], centers: [[0, 0, 7.5], [56.25, 0, 7.5]], axes: [[0, 0, 1], [0, 0, 1]], separation: [[-1, 0, 0], [1, 0, 0]], travel: 35, phase: [0, 0], description: 'El piñón de 15 dientes mueve la rueda de 30. La rueda gira a la mitad de velocidad y en sentido contrario.' },
  conicos: { teeth: [15, 15], nodes: ['pinion001', 'gear004'], centers: [[0, 0, 5.5], [0, -5.5, 0]], axes: [[0, 0, 1], [0, -1, 0]], separation: [[0, 0, 1], [0, -1, 0]], travel: 9, phase: [0, 0], description: 'Dos ruedas de 15 dientes transmiten el giro entre ejes perpendiculares. La relación de velocidades es 1:1.' },
  helicoidales: { teeth: [15, 30], nodes: ['pinion', 'gear'], centers: [[0, 0, 7.5], [56.25, 0, 7.5]], axes: [[0, 0, 1], [0, 0, 1]], separation: [[-1, 0, 0], [1, 0, 0]], travel: 35, phase: [0, 0], description: 'Dos engranajes originales de dientes inclinados transmiten el giro de forma progresiva. El piñón de 15 dientes mueve la rueda de 30 a la mitad de velocidad y en sentido contrario.' },
};

export function drivenRPM(teeth, rpm) { return rpm * teeth[0] / teeth[1]; }
export function rotationAngles(system, angle, offsets = [0, 0]) {
  return [angle + offsets[0] + system.phase[0], -angle * system.teeth[0] / system.teeth[1] + offsets[1] + system.phase[1]];
}
export function validateGearState(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || !Number.isFinite(value.angle) || Math.abs(value.angle) > 1e8 ||
      !Number.isFinite(value.rpm) || value.rpm < 1 || value.rpm > 120 || ![1, -1].includes(value.direction) ||
      !Number.isFinite(value.separation) || value.separation < 0 || value.separation > 1 ||
      !Array.isArray(value.offsets) || value.offsets.length !== 2 || !value.offsets.every((v) => Number.isFinite(v) && Math.abs(v) <= 1e8) ||
      ![null, 0, 1].includes(value.isolated)) throw new Error('El estado de los engranajes no es válido.');
  const result = { angle: value.angle, rpm: value.rpm, direction: value.direction, separation: value.separation, offsets: [...value.offsets], isolated: value.isolated };
  if (value.design !== undefined) result.design = validateGearDesign(value.design);
  return result;
}
