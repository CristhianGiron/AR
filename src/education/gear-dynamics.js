/** Educational rigid, ideal spur pair. SI units; force is tangential at the pitch radius. */
import { gearPhysicalProperties } from './gear-physical.js';
export const DEFAULT_DRIVE = Object.freeze({ version: 2, enabled: false, force: 10 });
export const DRIVE_ENVIRONMENT = Object.freeze({ load: .2, damping: .02 });
export const MAX_FORCE_RPM = 240;
const MAX_OMEGA = MAX_FORCE_RPM * Math.PI / 30;
export function validateDrive(value) {
  if (!value || ![1, 2].includes(value.version) || typeof value.enabled !== 'boolean' || !Number.isFinite(value.force) || value.force < 0 || value.force > 100) throw new Error('Introduce una fuerza válida entre 0 y 100 N.');
  // Read previous scenes safely, then replace manual masses with geometry-derived properties.
  if (value.version === 1) for (const [key, min, max] of [['load', 0, 20], ['mass1', .1, 20], ['mass2', .1, 20], ['damping', .001, 1]]) {
    if (!Number.isFinite(value[key]) || value[key] < min || value[key] > max) throw new Error('La configuración antigua de fuerza no es válida.');
  }
  return { version: 2, enabled: value.enabled, force: value.force };
}
export function driveGeometry(mechanism) { return mechanism.physical || mechanism.design; }
export function dynamicsModel(design, drive) {
  const physical = design?.parts ? design : gearPhysicalProperties(design), [input, output] = physical.parts;
  const radius1 = input.pitchRadius, radius2 = output.pitchRadius, ratio = radius2 / radius1;
  const inertia1 = input.inertia, inertia2 = output.inertia, inertia = inertia1 + inertia2 / (ratio * ratio);
  const applied = drive.force * radius1;
  return { physical, radius1, radius2, ratio, inertia1, inertia2, inertia, applied, available: applied * ratio,
    load: DRIVE_ENVIRONMENT.load, damping: DRIVE_ENVIRONMENT.damping, net: applied - DRIVE_ENVIRONMENT.load / ratio };
}
/** Exact solution of I*ω' = τin - τload/R - b*ω, including zero-speed and speed-limit events. */
export function advanceDrive(design, drive, omega, seconds) {
  const model = dynamicsModel(design, drive), rate = model.damping / model.inertia, equilibrium = model.net / model.damping;
  const start = Math.max(0, Math.min(MAX_OMEGA, omega)), dt = Math.max(0, Math.min(.1, seconds));
  let duration = dt, event = null;
  if (equilibrium < 0 && start > 0) {
    const stop = Math.log((start - equilibrium) / -equilibrium) / rate;
    if (stop < duration) { duration = stop; event = 'stop'; }
  } else if (equilibrium > MAX_OMEGA && start < MAX_OMEGA) {
    const cap = Math.log((equilibrium - start) / (equilibrium - MAX_OMEGA)) / rate;
    if (cap < duration) { duration = cap; event = 'cap'; }
  }
  if (start === 0 && equilibrium <= 0) return { omega: 0, angle: 0, acceleration: 0, limited: false };
  const decay = Math.exp(-rate * duration);
  let end = equilibrium + (start - equilibrium) * decay;
  let angle = equilibrium * duration + (start - equilibrium) * -Math.expm1(-rate * duration) / rate;
  if (event === 'stop') end = 0;
  if (event === 'cap' || start === MAX_OMEGA && equilibrium >= MAX_OMEGA) {
    end = MAX_OMEGA;
    angle = event === 'cap' ? angle + MAX_OMEGA * (dt - duration) : MAX_OMEGA * dt;
  }
  end = Math.max(0, Math.min(MAX_OMEGA, end));
  return { omega: end, angle: Math.max(0, angle), acceleration: dt > 0 ? (end - start) / dt : 0, limited: end === MAX_OMEGA };
}
export function forceReadings(mechanism) {
  const drive = mechanism.state.drive;
  if (!drive?.enabled || !driveGeometry(mechanism)) return null;
  const model = dynamicsModel(driveGeometry(mechanism), drive);
  const connected = !mechanism.state.separation && mechanism.state.isolated === null;
  const running = connected && mechanism.state.running, omega = running ? mechanism.motion?.omega || 0 : 0;
  const limited = running && omega >= MAX_OMEGA - 1e-8;
  const acceleration = !running || omega <= 0 && model.net <= 0 || limited ? 0 : (model.net - model.damping * omega) / model.inertia;
  // At rest a resisting load supplies only the reaction needed, up to the available torque.
  const torque2 = !running ? 0 : omega <= 0 && model.net <= 0 ? model.available : model.load + model.inertia2 * acceleration / model.ratio;
  return { ...model, connected, running, omega, rpm: omega * 30 / Math.PI, acceleration, torque2, force2: torque2 / model.radius2, limited, stalled: running && omega <= 1e-8 && model.net <= 0 };
}
export function actualRPM(mechanism) {
  if (!mechanism.state.running || mechanism.state.separation || mechanism.state.isolated !== null) return 0;
  return mechanism.state.drive?.enabled && driveGeometry(mechanism) ? (mechanism.motion?.omega || 0) * 30 / Math.PI : mechanism.state.rpm;
}
