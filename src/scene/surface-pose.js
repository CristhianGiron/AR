/** Accept finite rigid poses whose local Y axis is approximately world-up. */
export function horizontalSurface(matrix) {
  if (!matrix || matrix.length !== 16 || !Array.from(matrix).every(Number.isFinite)) return false;
  const length = Math.hypot(matrix[4], matrix[5], matrix[6]);
  return length > .9 && length < 1.1 && matrix[5] / length >= .9 && Math.abs(matrix[15] - 1) < .001;
}

/** Require repeated nearby measurements; keep only the visual guide across brief gaps. */
export function createSurfaceTracker() {
  let origin = null, started = 0, last = -Infinity, samples = 0;
  const reset = () => { origin = null; started = 0; last = -Infinity; samples = 0; };
  return {
    reset,
    update(matrix, time) {
      let restarted = false;
      if (horizontalSurface(matrix)) {
        const distance = origin ? Math.hypot(matrix[12] - origin[12], matrix[13] - origin[13], matrix[14] - origin[14]) : Infinity;
        const normal = origin ? matrix[4]*origin[4] + matrix[5]*origin[5] + matrix[6]*origin[6] : 0;
        if (time - last > 250 || distance > .035 || normal < .985) {
          origin = Array.from(matrix); started = time; samples = 0; restarted = true;
        }
        last = time; samples++;
      } else if (time - last > 250) reset();
      return { visible: !!origin && time - last <= 250, ready: !!matrix && horizontalSurface(matrix) && samples >= 3 && time - started >= 150, restarted };
    }
  };
}
