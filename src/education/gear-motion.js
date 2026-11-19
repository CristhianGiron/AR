import { rotationAngles } from './gear-model.js';
import { advanceDrive, driveGeometry } from './gear-dynamics.js';

export function applyGearMechanism(mechanism) {
  if (mechanism.state.separation || mechanism.state.isolated !== null) mechanism.motion = { omega: 0 };
  const { system, parts, state } = mechanism, angles = rotationAngles(system, state.angle, state.offsets);
  parts.forEach((part, index) => {
    part.pivot.position.copy(part.home).addScaledVector(part.direction, state.separation * system.travel);
    part.pivot.quaternion.setFromAxisAngle(part.axis, angles[index]);
    part.pivot.visible = state.isolated === null || state.isolated === index;
  });
}

/** Shared motor integration for the lab and independent AR copies. */
export function advanceGearMechanism(mechanism, seconds) {
  const { state } = mechanism;
  if (!state.running || state.separation !== 0 || state.isolated !== null) return false;
  const delta = Math.min(.1, Math.max(0, seconds));
  if (state.drive?.enabled && driveGeometry(mechanism)) {
    const motion = advanceDrive(driveGeometry(mechanism), state.drive, mechanism.motion?.omega || 0, delta);
    mechanism.motion = motion; state.angle += motion.angle * state.direction;
  } else state.angle += delta * state.rpm * Math.PI / 30 * state.direction;
  applyGearMechanism(mechanism);
  return true;
}
