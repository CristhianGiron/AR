/** Accept finite rigid poses whose local Y axis is approximately world-up. */
export function horizontalSurface(matrix) {
  if (!matrix || matrix.length !== 16 || !Array.from(matrix).every(Number.isFinite)) return false;
  const length = Math.hypot(matrix[4], matrix[5], matrix[6]);
  return length > .9 && length < 1.1 && matrix[5] / length >= .9 && Math.abs(matrix[15] - 1) < .001;
}
