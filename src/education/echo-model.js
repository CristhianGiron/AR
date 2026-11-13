/** Ideal frontal reflector, chosen sound speed 343 m/s; never a real reading. */
export const ECHO_MIN_CM = 20;
export const ECHO_MAX_CM = 200;
export function echoResponse(distanceCm, present = true) {
  if (!Number.isFinite(distanceCm) || distanceCm < ECHO_MIN_CM || distanceCm > ECHO_MAX_CM || typeof present !== 'boolean') throw new Error('Elige una distancia de la actividad entre 20 y 200 cm.');
  return { distanceCm: present ? distanceCm : null, echoMs: present ? 20 * distanceCm / 343 : null, present };
}
export function describeEcho(sample) {
  const r = echoResponse(sample.distanceCm, sample.present);
  return r.present ? r.distanceCm + ' cm simulados · eco ' + r.echoMs.toFixed(2).replace('.', ',') + ' ms' : 'Sin eco · distancia no disponible';
}
