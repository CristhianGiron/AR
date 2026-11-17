import { $ } from '../ui/dom.js';
import { actualRPM } from './gear-dynamics.js';
import { currentGearDesign } from './gear-design.js';
import { transmission, torqueExample, relationReadings } from './gear-class-model.js';

export function createGearClass(app) {
  let tab = 'ratio', busy = false, current = null;
  const format = (value) => Number(value.toFixed(2)).toLocaleString('es');
  function message(text = '') { $('class-error').textContent = text; $('class-error').hidden = !text; app.pagination.refresh($('gear-class')); }
  const write = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };
  function updateRatioReading(force = false) {
    const m = app.state.chosen?.mechanism;
    if (!m || !force && !$('class-ratio-panel').getClientRects().length) return;
    const r = relationReadings(m), display = (value, digits = 3) => Number(value.toFixed(digits)).toLocaleString('es');
    const compound = !!m.system.stages;
    write('class-ratio-formula', compound
      ? 'R = ' + m.system.stages.map(stage => '(' + stage.teeth[1] + '/' + stage.teeth[0] + ')').join(' × ') + ' = ' + display(r.ratio)
      : 'R = Z₂ / Z₁' + (r.diameters ? ' = d₂ / d₁' : '') + (r.stopped ? '' : ' = n₁ / n₂ = ω₁ / ω₂') + '\nDientes: ' + m.system.teeth[1] + ' / ' + m.system.teeth[0] + ' = ' + display(r.ratio));
    write('class-ratio-diameters', r.diameters
      ? 'Diámetros primitivos · d₁ = ' + display(r.diameters[0]) + ' mm · d₂ = ' + display(r.diameters[1]) + ' mm\nR = d₂ / d₁ = ' + display(r.diameters[1]) + ' / ' + display(r.diameters[0]) + ' = ' + display(r.ratio)
      : compound ? 'En la transmisión, R es el producto de cada contacto. No se usa el diámetro de la última rueda dividido por el de la primera.' : 'El catálogo no define diámetros primitivos para este modelo. La relación se obtiene de sus dientes.');
    const labels = compound ? ['n entrada', 'n salida', 'ω entrada', 'ω salida'] : ['n₁', 'n₂', 'ω₁', 'ω₂'];
    write('class-ratio-rpm', labels[0] + ' = ' + display(r.rpm1, 1) + ' rpm · ' + labels[1] + ' = ' + display(r.rpm2, 1) + ' rpm' +
      (r.stopped ? '' : '\nR = ' + (compound ? 'n entrada / n salida' : 'n₁ / n₂') + ' ≈ ' + display(r.rpm1, 1) + ' / ' + display(r.rpm2, 1) + ' ≈ ' + display(r.ratio)));
    write('class-ratio-radians', labels[2] + ' = ' + display(r.omega1) + ' rad/s · ' + labels[3] + ' = ' + display(r.omega2) + ' rad/s' +
      (r.stopped ? '' : '\nR = ' + (compound ? 'ω entrada / ω salida' : 'ω₁ / ω₂') + ' ≈ ' + display(r.omega1) + ' / ' + display(r.omega2) + ' ≈ ' + display(r.ratio)));
    write('class-ratio-speed-note', r.configured ? 'Ejemplo con la velocidad configurada. Al iniciar, el montaje conectado gira a estos valores.'
      : r.stopped ? 'Velocidades actuales: en reposo, 0/0 no define R. La relación se conserva por los dientes.' : 'Velocidades actuales del modelo · ω = 2π × rpm / 60.');
  }
  function render() {
    app.gearCenter?.sync();
    const item = app.state.chosen, m = item?.mechanism;
    $('class-empty').hidden = !!m; $('class-content').hidden = !m;
    if (!m) return;
    if (current !== item) {
      current = item;
      $('class-teeth-1').value = m.system.teeth[0]; $('class-teeth-2').value = m.system.teeth[1];
    }
    const z1 = m.system.teeth[0], z2 = m.system.teeth.at(-1), compound = !!m.system.stages;
    const inputRPM = m.state.drive?.enabled ? actualRPM(m) : m.state.rpm;
    const { ratio, output, behavior } = transmission(m.system, inputRPM);
    $('class-custom').hidden = item.definition.id !== 'engranajes-rectos';
    $('class-fixed').hidden = item.definition.id === 'engranajes-rectos';
    $('class-model').textContent = item.definition.nombre;
    $('class-entry').textContent = z1 + ' dientes'; $('class-exit').textContent = z2 + ' dientes';
    $('class-exit').parentElement.querySelector('b').textContent = String(m.parts.length) + ' · Salida';
    $('class-ratio-result').textContent = 'Por cada ' + format(ratio) + ' vueltas de entrada, la salida da 1 vuelta. ' + behavior;
    $('class-rpm').value = m.state.rpm;
    $('class-speed-formula').textContent = (compound ? 'n_salida = n_entrada / R = ' : 'n₂ = n₁ / R = ') + format(inputRPM) + ' / ' + format(ratio) + ' = ' + format(output) + ' rpm';
    $('class-output').textContent = format(output) + ' rpm';
    $('class-angular').textContent = 'Entrada: ω₁ = 2π × ' + format(inputRPM) + ' / 60 = ' + format(2 * Math.PI * inputRPM / 60) + ' rad/s.';
    $('class-turns').textContent = '1 vuelta de entrada → ' + format(1 / ratio) + ' vueltas de salida';
    $('class-fixed').textContent = compound ? 'Este conjunto tiene ' + m.parts.length + ' ejes y ' + m.system.partTeeth.flat().length + ' ruedas: ' + m.system.stages.map(stage => stage.teeth.join(' → ')).join('; ') + ' dientes. Las ruedas de un mismo eje giran juntas. ' + m.system.description : 'Este modelo conserva sus dientes originales. Para cambiar cantidades, elige los rectos.';
    $('class-direction').textContent = compound ? m.system.stages.length + ' contactos externos invierten el giro sucesivamente. La salida gira ' + (m.system.stages.length % 2 ? 'en sentido contrario al de la entrada.' : 'en el mismo sentido que la entrada.') : item.definition.mecanismo.tipo === 'conicos'
      ? 'En los cónicos el giro pasa entre ejes perpendiculares. Compara el sentido desde cada eje.'
      : 'Dos engranajes externos con ejes paralelos giran en sentidos opuestos.';
    $('class-run').textContent = m.state.running ? 'Pausar' : 'Ver girar'; $('class-run').setAttribute('aria-pressed', String(m.state.running));
    $('class-reverse').setAttribute('aria-pressed', String(m.state.direction === -1));
    $('class-unit-note').textContent = compound ? 'rpm: vueltas por minuto. R es el producto de las relaciones de todas las etapas.' : 'rpm: vueltas por minuto. R compara los dientes de salida con los de entrada.';
    updateRatioReading(true);
    app.gearForce?.sync();
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
      const design = currentGearDesign(app.state.chosen.mechanism);
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
    if (app.gearForce && app.state.chosen?.definition.id === 'engranajes-rectos') { app.gearForce.preview(); return; }
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
  return { open, render, run, updateRatioReading };
}
