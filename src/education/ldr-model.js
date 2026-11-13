/** Qualitative teaching model: relative values, never lux or ohms. */
export function lightResponse(distance) {
  if (!Number.isFinite(distance)) throw new Error('Distancia no válida.');
  const d = Math.max(0, Math.min(1, distance));
  const light = Math.round(100 * (1 - d));
  return { light, resistance: 100 - light,
    lightLabel: light >= 67 ? 'alta' : light >= 34 ? 'media' : 'baja',
    resistanceLabel: light >= 67 ? 'baja' : light >= 34 ? 'media' : 'alta' };
}
