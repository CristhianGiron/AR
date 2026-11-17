import { actualRPM } from './gear-dynamics.js';
import { gearRatio } from './gear-model.js';
export function transmission(input, rpm) {
  const teeth = Array.isArray(input) ? input : input.teeth;
  if (!Array.isArray(teeth) || teeth.length < 2 || !teeth.every((z) => Number.isInteger(z) && z > 0) || !Number.isFinite(rpm) || rpm < 0) throw new Error('Introduce dientes y velocidad válidos.');
  const ratio = Array.isArray(input) ? teeth[1] / teeth[0] : gearRatio(input), output = rpm / ratio;
  return { ratio, output, outputTurns: 1 / ratio, behavior: ratio > 1 ? 'La salida gira más despacio.' : ratio < 1 ? 'La salida gira más rápido.' : 'Las dos giran a la misma velocidad.' };
}
export function torqueExample(force, radius) {
  if (!Number.isFinite(force) || force < 0 || force > 1000 || !Number.isFinite(radius) || radius <= 0 || radius > 10) throw new Error('Usa una fuerza de 0 a 1000 N y un radio mayor que 0 y de hasta 10 m.');
  return force * radius;
}

/** Pitch diameters in manufacturing mm; never substitute the visible outer diameter. */
export function pitchDiameters(mechanism) {
  if (mechanism.system.stages) return null;
  if (mechanism.physical) return mechanism.physical.parts.map(part => part.pitchRadius * 2000);
  if (mechanism.design) return mechanism.design.teeth.map(z => z * mechanism.design.module);
  const { axes, centers, teeth } = mechanism.system;
  if (!axes || !centers || !axes[0].every((v, i) => Math.abs(v - axes[1][i]) < 1e-9)) return null;
  const delta = centers[1].map((v, i) => v - centers[0][i]);
  const along = delta.reduce((sum, v, i) => sum + v * axes[0][i], 0);
  const spacing = Math.sqrt(Math.max(0, delta.reduce((sum, v) => sum + v * v, 0) - along * along));
  return teeth.map(z => 2 * spacing * z / (teeth[0] + teeth[1]));
}

export function relationReadings(mechanism) {
  const s = mechanism.state;
  const configured = !s.drive?.enabled && (!s.running || s.separation > 0 || s.isolated !== null);
  const rpm1 = configured ? s.rpm : actualRPM(mechanism);
  const { ratio, output: rpm2 } = transmission(mechanism.system, rpm1);
  return { ratio, rpm1, rpm2, omega1: rpm1 * Math.PI / 30, omega2: rpm2 * Math.PI / 30,
    diameters: pitchDiameters(mechanism), configured, stopped: rpm1 === 0 };
}
