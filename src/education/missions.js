import { describeEcho } from './echo-model.js';
import { lightResponse } from './ldr-model.js';
import { $ } from '../ui/dom.js';
import { validateMissions, stepCompleted } from './mission-model.js';

export function createMissions(app) {
  let missions = [], stepIndex = 0, signature = '', busy = false;
  const state = app.state;
  const current = () => missions.find((m) => m.id === state.missionId);
  function answers() { return new Map(app.learning.snapshot().answers.map((a) => [a.model, app.learning.isCorrect(a.model)])); }
  function results(mission = current()) {
    const evaluated = answers();
    return mission ? mission.pasos.map((step) => stepCompleted(step, state.entries, evaluated, state.missionNotes[mission.id] || '')) : [];
  }
  function syncNavigation() {
    const active = !!current(); $('mission-resume').hidden = !active;
    document.body.classList.toggle('mission-active', active);
    document.querySelectorAll('[data-return-card]').forEach((button) => button.setAttribute('aria-label', active ? 'Volver a la misión' : 'Volver a la ficha'));
  }
  function render() {
    const mission = current(); syncNavigation();
    $('mission-content').hidden = !mission; $('mission-empty').hidden = !!mission;
    if (!mission) return;
    stepIndex = Math.max(0, Math.min(mission.pasos.length - 1, stepIndex));
    $('mission-select').value = mission.id;
    $('mission-summary').textContent = mission.descripcion;
    const step = mission.pasos[stepIndex];
    $('mission-step-title').textContent = step.titulo; $('mission-step-instruction').textContent = step.instruccion;
    $('mission-step-number').textContent = 'Paso ' + (stepIndex + 1) + ' de ' + mission.pasos.length;
    $('mission-previous').disabled = stepIndex === 0; $('mission-next').disabled = stepIndex === mission.pasos.length - 1;
    $('mission-reflection-group').hidden = step.destino !== 'reflection';
    $('mission-reflection').value = state.missionNotes[mission.id] || '';
    $('mission-go').hidden = step.destino === 'reflection';
    signature = ''; update(); app.pagination?.refresh($('missions'), true);
  }
  function update() {
    const mission = current(); if (!mission) return;
    const completed = results(mission), nextSignature = mission.id + ':' + stepIndex + ':' + completed.join();
    if (signature === nextSignature) return; signature = nextSignature;
    const count = completed.filter(Boolean).length;
    $('mission-progress').textContent = count + ' de ' + completed.length + ' pasos con evidencia';
    $('mission-step-status').textContent = completed[stepIndex] ? '✓ Evidencia registrada' : 'Por explorar';
    $('mission-finished').hidden = count !== completed.length;
    $('mission-resume').setAttribute('aria-label', 'Volver a mi misión: ' + count + ' de ' + completed.length + ' pasos');
    app.pagination?.refresh($('missions'));
  }
  function open() {
    if (!missions.length) { app.interface.notify('Las misiones no están disponibles. Puedes continuar explorando libremente.'); return; }
    if (!current()) { state.missionId = missions[0].id; stepIndex = 0; }
    render(); if (state.hudSurface !== 'missions') app.hud.open('missions', $('mission-resume'));
  }
  async function go() {
    const mission = current(), step = mission?.pasos[stepIndex]; if (!step || busy) return;
    busy = true; $('mission-go').disabled = true;
    try {
      let item = state.entries.find((entry) => entry.definition.id === step.modelo);
      if (!item) { await app.models.addFromCatalog(step.modelo); item = state.entries.find((entry) => entry.definition.id === step.modelo); }
      if (!item) throw new Error('No se pudo abrir el componente. Reintenta este paso.');
      app.interface.select(item); app.hud.open(step.destino === 'experiment' ? app.experiment.surface(item) : step.destino, $('mission-resume'));
      if (step.destino === 'challenge') app.learning.showStep('quiz');
      if (step.criterio === 'explanation') { const field = $(app.experiment.explanationId(item)); app.pagination.reveal(field); field.focus({ preventScroll: true }); }
    } catch (error) { app.interface.notify(error.message); }
    finally { busy = false; $('mission-go').disabled = false; }
  }
  function snapshot() { return { id: state.missionId, step: stepIndex, notes: { ...state.missionNotes } }; }
  function restore(data) {
    state.missionId = missions.some((m) => m.id === data?.id) ? data.id : null;
    state.missionNotes = data?.notes || {}; stepIndex = data?.step || 0; render();
  }
  async function load() {
    try {
      const response = await fetch(new URL('./contenido/misiones.json', document.baseURI));
      if (!response.ok) throw new Error('Sin misiones.');
      const catalog = await fetch(app.assets.catalogURL).then((r) => r.json());
      const data = await response.json(), ids = new Set(catalog.modelos.map((m) => m.id));
      data.misiones = data.misiones.filter((m) => m.pasos.every((step) => !step.modelo || ids.has(step.modelo)));
      missions = validateMissions(data, ids);
      $('mission-select').replaceChildren(...missions.map((mission) => { const option = document.createElement('option'); option.value = mission.id; option.textContent = mission.titulo; return option; }));
    } catch { missions = []; }
    $('open-missions').disabled = !missions.length;
  }
  $('open-missions').onclick = open; $('mission-resume').onclick = open;
  $('mission-select').onchange = () => { state.missionId = $('mission-select').value; stepIndex = 0; render(); };
  $('mission-previous').onclick = () => { stepIndex--; render(); };
  $('mission-next').onclick = () => { stepIndex++; render(); };
  $('mission-go').onclick = go;
  $('mission-reflection').oninput = () => { if (current()) { state.missionNotes[current().id] = $('mission-reflection').value; update(); } };
  $('mission-save').onclick = () => { app.hud.open('projects'); app.projects.refreshList(); };
  $('mission-end').onclick = () => { app.parts.stop(); app.experiment.stop(); app.learning.showAll(); state.missionId = null; stepIndex = 0; signature = ''; render(); app.hud.close(false); };
  $('mission-evidence').onclick = () => {
    const mission = current(); if (!mission) return;
    const completed = results(mission);
    const lines = ['ExplorAR · Evidencias de exploración', mission.titulo, '', ...mission.pasos.map((step, i) => (completed[i] ? '[Con evidencia] ' : '[Pendiente] ') + step.titulo), '', 'Observaciones y explicaciones (requieren revisión docente):'];
    for (const item of state.entries) {
      if (!mission.pasos.some((step) => step.modelo === item.definition.id)) continue;
      const isEcho = item.definition.id === 'sensor-ultrasonico', data = isEcho ? item.echoActivity : item.activity;
      if (!data || !data.explanation && !data.observations.length) continue;
      lines.push(item.name + (data.explanation ? ': ' + data.explanation : ': observaciones'));
      data.observations.forEach((sample, i) => {
        const r = isEcho ? null : lightResponse(sample.distance);
        lines.push('Observación ' + (i + 1) + ': ' + (isEcho ? describeEcho(sample) : 'luz ' + r.lightLabel + ' · resistencia ' + r.resistanceLabel) + ' (simulación).');
      });
    }
    for (const model of new Set(mission.pasos.map((step) => step.modelo).filter(Boolean))) {
      const evidence = app.learning.getEvidence(model);
      if (evidence) lines.push('', evidence.question, 'Respuesta: ' + evidence.answer, evidence.feedback);
    }
    if (state.missionNotes[mission.id]) lines.push(state.missionNotes[mission.id]);
    lines.push('', 'Registro de acciones y respuestas, sin calificación automática de explicaciones. La luz y el eco son simulaciones didácticas; no son mediciones reales.');
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })), link = document.createElement('a');
    link.href = url; link.download = 'explorar-mision-' + mission.id + '.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  return { open, render, update, load, snapshot, restore, results };
}
