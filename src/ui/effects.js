/** Decorative depth follows the canvas pointer without changing camera or layout. */
export function createEffects(app) {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let previous = '';
  function reset() {
    previous = '';
    for (const property of ['--hud-pitch', '--hud-yaw', '--hud-shadow-x', '--hud-shadow-y']) root.style.removeProperty(property);
  }
  function move(event) {
    if (reduced.matches || event.target !== app.engine.canvas) return;
    const x = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1));
    const y = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1));
    const values = [(-y * 1.25).toFixed(2), (x * 1.5).toFixed(2), (x * 4).toFixed(1), (y * 3).toFixed(1)];
    const signature = values.join(','); if (signature === previous) return;
    previous = signature;
    root.style.setProperty('--hud-pitch', values[0] + 'deg'); root.style.setProperty('--hud-yaw', values[1] + 'deg');
    root.style.setProperty('--hud-shadow-x', values[2] + 'px'); root.style.setProperty('--hud-shadow-y', values[3] + 'px');
  }
  app.engine.canvas.addEventListener('pointermove', move, { passive: true });
  app.engine.canvas.addEventListener('pointerleave', reset, { passive: true });
  app.engine.canvas.addEventListener('pointerup', (event) => { if (event.pointerType !== 'mouse') reset(); }, { passive: true });
  app.engine.canvas.addEventListener('pointercancel', reset, { passive: true });
  reduced.addEventListener('change', reset);
  addEventListener('resize', reset);
  addEventListener('blur', reset); addEventListener('pagehide', reset);
  return { reset };
}
