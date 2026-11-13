export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const wrapAngle = (value) => Math.round(((((value + 180) % 360 + 360) % 360) - 180) * 10) / 10 || 0;
export const snapRotation = (value, step) => wrapAngle(Math.round(value / step) * step);
