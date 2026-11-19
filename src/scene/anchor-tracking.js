/** Native anchor poses may have any orientation; they must remain finite rigid transforms. */
export function rigidAnchorPose(matrix) {
  if (!matrix || matrix.length !== 16 || !Array.from(matrix).every(Number.isFinite)) return false;
  if (Math.abs(matrix[3]) + Math.abs(matrix[7]) + Math.abs(matrix[11]) > .001 || Math.abs(matrix[15] - 1) > .001) return false;
  for (const offset of [0, 4, 8]) if (Math.abs(Math.hypot(matrix[offset], matrix[offset + 1], matrix[offset + 2]) - 1) > .005) return false;
  const crossX = matrix[1]*matrix[6] - matrix[2]*matrix[5];
  const crossY = matrix[2]*matrix[4] - matrix[0]*matrix[6];
  const crossZ = matrix[0]*matrix[5] - matrix[1]*matrix[4];
  return Math.hypot(crossX - matrix[8], crossY - matrix[9], crossZ - matrix[10]) < .005
    && Math.abs(matrix[0]*matrix[4] + matrix[1]*matrix[5] + matrix[2]*matrix[6]) < .005;
}

/**
 * Wait for coherent native poses after acquisition/loss/reset.
 * Once recovered, use the native pose directly: smoothing it would lag behind
 * reference-space corrections and introduce apparent motion relative to the camera.
 * Thresholds are a recovery heuristic, not a measurement of physical accuracy.
 */
export function createAnchorRecovery() {
  let baseline = null, started = 0, last = -Infinity, samples = 0, recovered = false;
  function reset() { baseline = null; started = 0; last = -Infinity; samples = 0; recovered = false; }
  return {
    reset,
    update(matrix, time) {
      if (!rigidAnchorPose(matrix) || !Number.isFinite(time)) { reset(); return false; }
      if (time - last > 250 || time < last) reset();
      last = time;
      if (recovered) return true;
      const distance = baseline ? Math.hypot(matrix[12]-baseline[12], matrix[13]-baseline[13], matrix[14]-baseline[14]) : Infinity;
      let trace = 0;
      if (baseline) for (const i of [0,1,2,4,5,6,8,9,10]) trace += matrix[i]*baseline[i];
      const angle = Math.acos(Math.max(-1, Math.min(1, (trace - 1) / 2)));
      if (!baseline || distance > .02 || angle > Math.PI / 60) {
        baseline = Array.from(matrix); started = time; samples = 0;
      }
      samples++;
      recovered = samples >= 4 && time - started >= 200;
      return recovered;
    }
  };
}
