import { lightResponse } from './ldr-model.js';

export function validateMissions(data, catalogIds) {
  if (data?.version !== 1 || !Array.isArray(data.misiones) || data.misiones.length > 12) throw new Error('Misiones no compatibles.');
  const ids = new Set(), text = (value, limit) => typeof value === 'string' && value.trim() && value.length <= limit;
  return data.misiones.map((mission) => {
    if (!text(mission.id, 80) || ids.has(mission.id) || !text(mission.titulo, 120) || !text(mission.descripcion, 600) || !Array.isArray(mission.pasos) || !mission.pasos.length || mission.pasos.length > 12) throw new Error('Misión no válida.');
    ids.add(mission.id);
    for (const step of mission.pasos) {
      const destination = { parts: "parts", observations: "experiment", "echo-observations": "experiment", explanation: "experiment", answer: "challenge", reflection: "reflection" }[step.criterio];
      if (!text(step.titulo, 120) || !text(step.instruccion, 600) || !['parts', 'observations', 'echo-observations', 'explanation', 'answer', 'reflection'].includes(step.criterio) || destination !== step.destino || step.criterio !== 'reflection' && !catalogIds.has(step.modelo) || step.minimo !== undefined && (!Number.isInteger(step.minimo) || step.minimo < 1 || step.minimo > 20)) throw new Error('Paso de misión no válido.');
    }
    return mission;
  });
}

/** Evidence of an action is distinct from judging the quality of an explanation. */
export function stepCompleted(step, entries, answers, reflection = '') {
  if (step.criterio === 'reflection') return reflection.trim().length >= 20;
  const matching = entries.filter((item) => item.definition.id === step.modelo);
  if (!matching.length) return false;
  if (step.criterio === 'answer') return answers.get(step.modelo) === true;
  return matching.some((item) => {
    if (step.criterio === 'parts') return new Set(item.partsVisited || []).size >= (step.minimo || 1);
    if (step.criterio === 'explanation') return ((item.definition.id === 'sensor-ultrasonico' ? item.echoActivity : item.activity)?.explanation || '').trim().length >= 20;
    if (step.criterio === 'echo-observations') {
      const samples = item.echoActivity?.observations || [];
      return samples.some((s) => s.present && s.distanceCm <= 60) && samples.some((s) => s.present && s.distanceCm >= 140) && samples.some((s) => !s.present);
    }
    const labels = new Set((item.activity?.observations || []).map((sample) => lightResponse(sample.distance).lightLabel));
    return labels.has('alta') && labels.has('baja');
  });
}
