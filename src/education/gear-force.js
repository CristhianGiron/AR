import { $ } from '../ui/dom.js';
import { DEFAULT_DRIVE, validateDrive, dynamicsModel, forceReadings, driveGeometry } from './gear-dynamics.js';

export function createGearForce(app) {
  let current = null, lastDrive = null, lastReading = 0;
  const format = (n, digits = 3) => Number(n.toFixed(digits)).toLocaleString('es');
  const fields = [['force', 'class-force']];
  function formulas(design, force) {
    const model = dynamicsModel(design, { force });
    $('class-torque-result').textContent = 'Engranaje 1 · Entrada\nτ₁ = F × r₁\n' + format(force) + ' N × ' + format(model.radius1, 5) + ' m = ' + format(model.applied) + ' N·m';
    $('gear-force-formula').textContent = 'Engranaje 2 · Salida ideal disponible\nτ₂ = F × r₂ = τ₁ × R\n' + format(force) + ' N × ' + format(model.radius2, 5) + ' m = ' + format(model.available) + ' N·m';
  }
  function preview() {
    const item = app.state.chosen;
    if (item?.definition.id !== 'engranajes-rectos' || !item.mechanism) return;
    const force = $('class-force').valueAsNumber;
    if (!Number.isFinite(force) || force < 0 || force > 100) {
      $('class-torque-result').textContent = 'Introduce una fuerza entre 0 y 100 N.';
      $('gear-force-formula').textContent = 'Engranaje 2 · Revisa la fuerza de entrada.';
    } else formulas(driveGeometry(item.mechanism), force);
    app.pagination.refresh($('gear-context')); app.pagination.refresh($('gear-class'));
  }
  function updateReading(now = performance.now(), force = false) {
    if (!force && now - lastReading < 180) return; lastReading = now;
    app.gearClass?.updateRatioReading();
    const m = app.state.chosen?.mechanism, reading = m && forceReadings(m);
    if (!reading) { $('gear-force-reading').textContent = 'Velocidad fija activa. Aplica fuerza para simular la aceleración.'; return; }
    $('gear-force-reading').textContent = !reading.connected ? 'Piezas separadas o aisladas: la transmisión de fuerza está desconectada.'
      : !m.state.running ? 'Fuerza configurada. Pulsa Iniciar para aplicarla; en pausa no se integra movimiento.'
        : reading.stalled ? 'Carga demasiado alta: el par queda detenido.'
          : reading.limited ? 'Límite didáctico de 240 rpm: no se simula más aceleración.'
            : 'Entrada: ' + format(reading.rpm, 1) + ' rpm · α ' + format(reading.acceleration, 2) + ' rad/s² · Torque transmitido a salida: ' + format(reading.torque2) + ' N·m';
    $('class-angular').textContent = 'Entrada: ω₁ = 2π × ' + format(reading.rpm, 1) + ' / 60 = ' + format(reading.omega, 2) + ' rad/s.';
    $('gear-reading').textContent = 'Modo fuerza · Entrada: ' + format(reading.rpm, 1) + ' rpm · Salida: ' + format(reading.rpm / reading.ratio, 1) + ' rpm';
    $('class-output').textContent = format(reading.rpm / reading.ratio, 1) + ' rpm';
    $('class-speed-formula').textContent = 'n₂ = n₁ / R = ' + format(reading.rpm, 1) + ' / ' + format(reading.ratio) + ' = ' + format(reading.rpm / reading.ratio, 1) + ' rpm';
  }
  function sync() {
    const item = app.state.chosen, m = item?.mechanism, rectos = item?.definition.id === 'engranajes-rectos' && !!m, supported = rectos && !!driveGeometry(m);
    $('gear-force-settings').hidden = !rectos;
    $('gear-force-formula').hidden = !rectos;
    $('gear-force-apply').hidden = !rectos;
    $('gear-force-apply').disabled = !!app.state.pendingLoads;
    $('gear-force-apply').textContent = 'Aplicar fuerza';
    $('gear-physical-details').hidden = !supported;
    $('gear-radius-field').hidden = rectos;
    $('gear-force-inputs').classList.toggle('force-automatic', rectos);
    $('class-radius').readOnly = rectos;
    $('class-radius').labels[0].textContent = rectos ? 'Radio primitivo (m)' : 'Radio (m)';
    $('class-force').max = rectos ? '100' : '1000';
    $('class-force').step = rectos ? '0.1' : '1';
    if (rectos) {
      const d = m.state.drive || DEFAULT_DRIVE;
      if (current !== item || lastDrive !== m.state.drive) {
        for (const [key, id] of fields) $(id).value = d[key];
        $('gear-force-error').hidden = true;
      }
      const model = dynamicsModel(driveGeometry(m), d), physical = model.physical;
      physical.parts.forEach((part, index) => {
        const n = index + 1;
        $('gear-physical-pitch' + n).textContent = format(part.pitchRadius * 1000, 2) + ' mm';
        $('gear-physical-outer' + n).textContent = format(part.outerRadius * 1000, 2) + ' mm';
        $('gear-physical-mass' + n).textContent = format(part.mass * 1000, 2) + ' g';
        $('gear-physical-weight' + n).textContent = format(part.weight, 3) + ' N';
        $('gear-physical-inertia' + n).textContent = part.inertia.toExponential(2) + ' kg·m²';
      });
      $('class-radius').value = model.radius1;
      formulas(driveGeometry(m), d.force);
      $('gear-force-note').textContent = m.system.teeth.join(' / ') + ' dientes · Se conserva el modelo actual. Pulsa Aplicar fuerza y luego Iniciar.';
      $('gear-force-fixed').disabled = !m.state.drive?.enabled;
    } else $('gear-force-note').textContent = 'Ejemplo de cálculo. Elige Rectos para introducir y aplicar la fuerza al modelo.';
    for (const id of ['class-rpm', 'gear-speed']) $(id).disabled = !!m?.state.drive?.enabled;
    const quick = $('gear-hub-force'); if (quick) { quick.hidden = item?.definition.id !== 'engranajes-rectos'; quick.disabled = !!app.state.pendingLoads; }
    current = item; lastDrive = m?.state.drive; updateReading(performance.now(), true);
  }
  function apply() {
    const m = app.state.chosen?.mechanism;
    if (!m || app.state.chosen.definition.id !== 'engranajes-rectos' || app.state.pendingLoads) return;
    try {
      const values = Object.fromEntries(fields.map(([key, id]) => [key, $(id).value.trim() === '' ? NaN : $(id).valueAsNumber]));
      const drive = validateDrive({ version: 2, enabled: true, ...values });
      if (!m.state.drive?.enabled) m.motion = { omega: 0 };
      m.state.drive = drive; $('gear-force-error').hidden = true;
      sync(); app.gearClass.render(); app.loop.renderFrame();
    } catch (error) {
      $('gear-force-error').textContent = error.message; $('gear-force-error').hidden = false;
      app.pagination.refresh($('gear-context')); app.pagination.reveal($('gear-force-error'));
    }
  }
  $('gear-force-apply').onclick = apply;
  $('gear-force-fixed').onclick = () => {
    const m = app.state.chosen?.mechanism; if (!m) return;
    if (m.state.drive) m.state.drive.enabled = false;
    m.motion = { omega: 0 }; app.gearClass.render(); sync(); app.loop.renderFrame();
  };
  for (const [, id] of fields) $(id).addEventListener('input', () => { $('gear-force-error').hidden = true; });
  return { sync, apply, updateReading, preview };
}
