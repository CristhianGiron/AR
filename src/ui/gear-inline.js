import { $ } from './dom.js';
import { DEFAULT_GEAR_DESIGN, validateGearDesign } from '../education/gear-design.js';

export function createGearInline(app) {
  const panel = $('gear-inline'), trigger = $('gear-quick');
  let item = null, busy = false;
  function close(focus = false) {
    panel.hidden = true; trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus({ preventScroll: true });
  }
  function open() {
    if (app.gearCenter?.active) { app.gears.open(trigger); return; }
    if (!app.state.chosen?.mechanism || app.state.pendingLoads) return;
    if (!panel.hidden) { close(true); return; }
    item = app.state.chosen;
    const m = item.mechanism;
    $('gear-inline-rpm').value = m.state.rpm;
    $('gear-inline-teeth').hidden = item.definition.id !== 'engranajes-rectos';
    $('gear-inline-z1').value = m.system.teeth[0]; $('gear-inline-z2').value = m.system.teeth[1];
    $('gear-inline-error').hidden = true;
    panel.hidden = false; trigger.setAttribute('aria-expanded', 'true');
    $('gear-inline-rpm').focus({ preventScroll: true });
    app.gearTelemetry.updateFrame();
  }
  function sync() { if (!panel.hidden && (app.state.chosen !== item || app.state.hudSurface || app.state.hudHidden)) close(); }
  $('gear-inline-close').onclick = () => close(true);
  $('gear-inline-class').onclick = () => { close(); app.gearClass.open(); };
  $('gear-inline-form').onsubmit = async (event) => {
    event.preventDefault(); if (busy || app.state.chosen !== item) return;
    try {
      const rpm = $('gear-inline-rpm').valueAsNumber;
      if (!Number.isInteger(rpm) || rpm < 1 || rpm > 120) throw new Error('La velocidad debe ser un entero entre 1 y 120 rpm.');
      const design = item.mechanism.design || DEFAULT_GEAR_DESIGN;
      let next;
      const teeth = [$('gear-inline-z1').valueAsNumber, $('gear-inline-z2').valueAsNumber];
      if (item.definition.id === 'engranajes-rectos' && teeth.some((z, i) => z !== item.mechanism.system.teeth[i])) next = validateGearDesign({ ...design, teeth });
      busy = true; $('gear-inline-apply').disabled = true;
      if (next && (!item.mechanism.design || next.teeth.some((z, i) => z !== design.teeth[i]))) await app.gearDesigner.replace(next, false);
      $('gear-speed').value = rpm; $('gear-speed').dispatchEvent(new Event('input'));
      close(true); app.loop.renderFrame();
    } catch (error) {
      $('gear-inline-error').textContent = error.message; $('gear-inline-error').hidden = false;
    } finally { busy = false; $('gear-inline-apply').disabled = false; }
  };
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); event.stopPropagation(); close(true); } }, true);
  document.addEventListener('pointerdown', event => { if (!panel.hidden && !$('gear-dock').contains(event.target)) close(); });
  return { open, close, sync };
}
