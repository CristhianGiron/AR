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
