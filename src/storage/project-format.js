export const MAX_PROJECT_BYTES = 128 * 1024 * 1024;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, limit, label) => { if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(label + ' no válido.'); return value; };
const number = (value, min, max, label) => { if (!Number.isFinite(value) || value < min || value > max) throw new Error(label + ' fuera de rango.'); return value; };
const vector = (value, min, max, label) => { if (!Array.isArray(value) || value.length !== 3) throw new Error(label + ' no válido.'); return value.map((v) => number(v, min, max, label)); };
const view = (value) => { if (!object(value)) throw new Error('Vista no válida.'); return { x: number(value.x, -180, 180, 'Giro X'), y: number(value.y, -180, 180, 'Giro Y'), zoom: number(value.zoom, .4, 2.5, 'Zoom') }; };

export function validateProject(data, catalogIds) {
  if (!object(data) || data.format !== 'explorar-project' || data.version !== 1) throw new Error('Este archivo no es una escena compatible de ExplorAR.');
  const name = text(data.name, 60, 'Nombre de la escena');
  if (!Array.isArray(data.entries) || data.entries.length > 64 || !Array.isArray(data.assets) || data.assets.length > 32) throw new Error('La escena admite hasta 64 componentes y 32 modelos locales.');
  const assets = [], ids = new Set(); let encodedBytes = 0;
  for (const asset of data.assets) {
    if (!object(asset) || ids.has(asset.id)) throw new Error('Recurso repetido o no válido.');
    const id = text(asset.id, 80, 'Id de recurso'); ids.add(id);
    if (typeof asset.glb !== 'string' || !asset.glb.length || asset.glb.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(asset.glb)) throw new Error('El modelo local no tiene datos GLB válidos.');
    encodedBytes += asset.glb.length; if (encodedBytes > MAX_PROJECT_BYTES) throw new Error('Los modelos locales superan el tamaño permitido.');
    const d = asset.definition;
    if (!object(d) || typeof d.id !== 'string' || !/^local-/.test(d.id)) throw new Error('Faltan los datos del modelo local.');
    const definition = { id: text(d.id, 80, 'Id del modelo'), nombre: text(d.nombre, 35, 'Nombre del modelo'), archivo: text(d.archivo, 180, 'Archivo'), categoria: 'Modelo local', descripcion: text(d.descripcion, 600, 'Descripción'), cargarAlInicio: false,
      visualizacion: { tamano: number(d.visualizacion?.tamano, .01, 3, 'Tamaño inicial'), alturaEtiqueta: number(d.visualizacion?.alturaEtiqueta, .8, 3.4, 'Altura inicial'), rotacion: vector(d.visualizacion?.rotacion, -180, 180, 'Giro inicial') },
      datos: [{ etiqueta: 'Archivo', valor: d.archivo }, { etiqueta: 'Origen', valor: 'Modelo incluido en la escena' }] };
    if (object(d.creditos)) definition.creditos = Object.fromEntries(['autor', 'autorUrl', 'licencia', 'licenciaUrl', 'fuente'].filter((key) => typeof d.creditos[key] === 'string').map((key) => [key, d.creditos[key].slice(0, 1000)]));
    assets.push({ id, glb: asset.glb, definition });
  }
  const entries = data.entries.map((entry) => {
    if (!object(entry) || !object(entry.source)) throw new Error('Componente sin origen.');
    const source = typeof entry.source.catalog === 'string' && !entry.source.asset ? { catalog: entry.source.catalog }
      : typeof entry.source.asset === 'string' && !entry.source.catalog ? { asset: entry.source.asset } : null;
    if (!source || (source.catalog && !catalogIds.has(source.catalog)) || (source.asset && !ids.has(source.asset))) throw new Error('La escena contiene un modelo que no está disponible en este catálogo.');
    if (!/^#[a-f\d]{6}$/i.test(entry.color)) throw new Error('Color no válido.');
    let activity;
    if (entry.activity !== undefined) {
      const a = entry.activity;
      if (!object(a) || !Array.isArray(a.observations) || a.observations.length > 12 || typeof a.explanation !== 'string' || a.explanation.length > 600) throw new Error('Actividad no válida.');
      activity = { distance: number(a.distance, 0, 1, 'Distancia de luz'), explanation: a.explanation,
        observations: a.observations.map((sample) => ({ distance: number(sample.distance, 0, 1, 'Observación de luz') })) };
    }
    let echoActivity;
    if (entry.echoActivity !== undefined) {
      const a = entry.echoActivity;
      if (!object(a) || typeof a.present !== 'boolean' || !Array.isArray(a.observations) || a.observations.length > 12 || typeof a.explanation !== 'string' || a.explanation.length > 600) throw new Error('Experimento de eco no válido.');
      echoActivity = { distanceCm: number(a.distanceCm, 20, 200, 'Distancia simulada'), present: a.present, explanation: a.explanation,
        observations: a.observations.map((sample) => { if (!object(sample) || typeof sample.present !== 'boolean') throw new Error('Observación de eco no válida.'); return { distanceCm: number(sample.distanceCm, 20, 200, 'Observación de distancia'), present: sample.present }; }) };
    }
    const partsVisited = entry.partsVisited === undefined ? [] : entry.partsVisited;
    if (!Array.isArray(partsVisited) || partsVisited.length > 20 || !partsVisited.every((part) => typeof part === 'string' && part.length < 80)) throw new Error('Partes observadas no válidas.');
    return { source, name: text(entry.name, 35, 'Nombre del componente'), color: entry.color,
      position: vector(entry.position, -100, 100, 'Posición'), homePosition: vector(entry.homePosition || entry.position, -100, 100, 'Posición inicial'), rotation: vector(entry.rotation, -180, 180, 'Giro'),
      size: number(entry.size, .3, 2.5, 'Tamaño'), height: number(entry.height, .8, 3.4, 'Altura de etiqueta'), activity, echoActivity, partsVisited: [...new Set(partsVisited)] };
  });
  const index = (value) => { if (value === null || value === undefined) return null; if (!Number.isInteger(value) || value < 0 || value >= entries.length) throw new Error('Selección no válida.'); return value; };
  if (!Array.isArray(data.answers || []) || (data.answers || []).length > 64 || !(data.answers || []).every((a) => object(a) && typeof a.model === 'string' && Number.isInteger(a.index) && a.index >= 0 && a.index < 10)) throw new Error('Respuestas no válidas.');
  let journey = { id: null, step: 0, notes: {} };
  if (data.journey !== undefined) {
    const j = data.journey;
    if (!object(j) || !object(j.notes) || Object.keys(j.notes).length > 12 || !Number.isInteger(j.step) || j.step < 0 || j.step > 11) throw new Error('Recorrido no válido.');
    const notes = Object.fromEntries(Object.entries(j.notes).map(([id, value]) => {
      text(id, 80, 'Id del recorrido');
      if (typeof value !== 'string' || value.length > 600) throw new Error('Justificación no válida.');
      return [id, value];
    }));
    journey = { id: j.id === null ? null : text(j.id, 80, 'Recorrido'), step: j.step, notes };
  }
  return { journey, format: 'explorar-project' , version: 1, name, assets, entries, view: view(data.view), selected: index(data.selected), isolated: index(data.isolated), returnView: data.returnView ? view(data.returnView) : null, answers: (data.answers || []).map((a) => ({ model: a.model.slice(0, 80), index: a.index })) };
}

export function encodeBuffer(buffer) {
  const bytes = new Uint8Array(buffer); let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
}
export function decodeBuffer(value) {
  const binary = atob(value), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
