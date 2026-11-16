import { $ } from '../ui/dom.js';
import { DEFAULT_GEAR_DESIGN } from './gear-design.js';
import { transmission, torqueExample } from './gear-class-model.js';

export function createGearClass(app) {
  let tab = 'ratio', busy = false, current = null;
  const format = (value) => Number(value.toFixed(2)).toLocaleString('es');
  function message(text = '') { $('class-error').textContent = text; $('class-error').hidden = !text; app.pagination.refresh($('gear-class')); }
  function render() {
    app.gearCenter?.sync();
    const item = app.state.chosen, m = item?.mechanism;
    $('class-empty').hidden = !!m; $('class-content').hidden = !m;
    if (!m) return;
    if (current !== item) {
      current = item;
      $('class-teeth-1').value = m.system.teeth[0]; $('class-teeth-2').value = m.system.teeth[1];
    }
    const [z1, z2] = m.system.teeth, { ratio, output, behavior } = transmission([z1, z2], m.state.rpm);
    $('class-custom').hidden = item.definition.id !== 'engranajes-rectos';
    $('class-fixed').hidden = item.definition.id === 'engranajes-rectos';
    $('class-model').textContent = item.definition.nombre;
    $('class-entry').textContent = z1 + ' dientes'; $('class-exit').textContent = z2 + ' dientes';
    $('class-ratio-formula').textContent = 'R = Z₂ / Z₁ = ' + z2 + ' / ' + z1 + ' = ' + format(ratio);
    $('class-ratio-result').textContent = 'Por cada ' + format(ratio) + ' vueltas de entrada, la salida da 1 vuelta. ' + behavior;
    $('class-rpm').value = m.state.rpm;
    $('class-speed-formula').textContent = 'n₂ = n₁ / R = ' + format(m.state.rpm) + ' / ' + format(ratio) + ' = ' + format(output) + ' rpm';
    $('class-output').textContent = format(output) + ' rpm';
    $('class-angular').textContent = 'Entrada: ω₁ = 2π × ' + format(m.state.rpm) + ' / 60 = ' + format(2 * Math.PI * m.state.rpm / 60) + ' rad/s.';
    $('class-turns').textContent = '1 vuelta de entrada → ' + format(z1 / z2) + ' vueltas de salida';
    $('class-direction').textContent = item.definition.mecanismo.tipo === 'conicos'
      ? 'En los cónicos el giro pasa entre ejes perpendiculares. Compara el sentido desde cada eje.'
      : 'Dos engranajes externos con ejes paralelos giran en sentidos opuestos.';
    $('class-run').textContent = m.state.running ? 'Pausar' : 'Ver girar'; $('class-run').setAttribute('aria-pressed', String(m.state.running));
    $('class-reverse').setAttribute('aria-pressed', String(m.state.direction === -1));
    $('class-unit-note').textContent = 'rpm: vueltas por minuto. R compara los dientes de salida con los de entrada.';
    app.pagination.refresh($('gear-class'));
  }
  function showTab(name) {
    tab = name;
    $('gear-class').dataset.topic = name;
    for (const key of ['ratio', 'speed', 'torque']) {
      $('class-' + key + '-panel').hidden = name !== key;
      $('class-' + key + '-tab').setAttribute('aria-pressed', String(name === key));
    }
    app.pagination.refresh($('gear-class'), true);
    $('gear-class').scrollTop = 0;
  }
  function open() {
    document.body.classList.add('classroom-mode');
    if (!app.state.chosen?.mechanism) {
      const item = app.state.entries.find((entry) => entry.mechanism); if (item) app.interface.select(item);
    }
    render(); if (app.state.hudSurface !== 'gear-class') app.hud.open('gear-class', $('open-gear-class'));
    showTab(tab);
  }
  function preview() { if (app.state.hudSurface === 'gear-class' && app.hud.isBlocking()) app.hud.close(false); }
  function run() {
    const m = app.state.chosen?.mechanism; if (!m) return;
    if (m.state.separation || m.state.isolated !== null) $('gear-assemble').click();
    $('gear-play').click(); render(); preview();
  }
  async function generate(teeth) {
    if (busy) return;
    busy = true; message();
    const controls = [...$('class-custom').querySelectorAll('button, input')]; controls.forEach((e) => { e.disabled = true; });
    try {
      const design = app.state.chosen.mechanism.design || DEFAULT_GEAR_DESIGN;
      await app.gearDesigner.replace({ ...design, teeth });
      if (app.gearCenter?.active) render(); else open();
    } catch (error) {
      message(error.message);
      if (['teeth-1', 'teeth-2'].includes(error.field)) $('class-' + error.field).setAttribute('aria-invalid', 'true');
      $('class-error').scrollIntoView({ block: 'nearest' });
    }
    finally { busy = false; controls.forEach((e) => { e.disabled = false; }); }
  }
  for (const name of ['ratio', 'speed', 'torque']) $('class-' + name + '-tab').onclick = () => showTab(name);
  $('class-custom').onsubmit = (event) => { event.preventDefault(); generate([$('class-teeth-1').valueAsNumber, $('class-teeth-2').valueAsNumber]); };
  for (const id of ['class-teeth-1', 'class-teeth-2']) $(id).oninput = () => { $(id).removeAttribute('aria-invalid'); message(); };
  document.querySelectorAll('[data-class-teeth]').forEach((button) => { button.onclick = () => generate(button.dataset.classTeeth.split(',').map(Number)); });
  $('class-run').onclick = run;
  $('class-reverse').onclick = () => { $('gear-reverse').click(); render(); };
  $('class-step').onclick = () => { $('gear-step').click(); render(); preview(); };
  $('class-rpm').oninput = () => {
    const value = $('class-rpm').valueAsNumber;
    if (!Number.isFinite(value) || value < 1 || value > 120) { $('class-rpm').setAttribute('aria-invalid', 'true'); return; }
    $('class-rpm').removeAttribute('aria-invalid');
    $('gear-speed').value = value; $('gear-speed').dispatchEvent(new Event('input')); render();
  };
  $('class-rpm').onchange = render;
  function torque() {
    try {
      const force = $('class-force').valueAsNumber, radius = $('class-radius').valueAsNumber;
      const value = torqueExample(force, radius);
      $('class-torque-result').textContent = 'T = F × r = ' + format(force) + ' × ' + format(radius) + ' = ' + format(value) + ' N·m';
    } catch (error) { $('class-torque-result').textContent = error.message; }
    app.pagination.refresh($('gear-class'));
  }
  $('class-force').oninput = $('class-radius').oninput = torque; torque();
  $('class-workshop').onclick = () => { app.hud.close(false); app.gears.open(); };
  $('class-tools').onclick = () => { document.body.classList.remove('classroom-mode'); app.hud.close(false); app.hud.setNavigation(true); };
  $('class-save').onclick = () => { app.hud.open('projects'); app.projects.refreshList(); };
  $('open-gear-class').onclick = open;
  $('class-return').onclick = open;
  return { open, render, run };
}
