import { gearSoundVoices } from '../education/gear-sound-model.js';
import { uiIcon } from '../ui/icons.js';

const preference = 'explorar-gear-sound';
export function createGearSound(app) {
  const Context = window.AudioContext || window.webkitAudioContext;
  let enabled = true, available = !!Context, context = null, master = null, noiseBuffer = null;
  try { enabled = localStorage.getItem(preference) !== 'off'; } catch { /* Private storage is optional. */ }
  const voices = new Map(), targets = new WeakMap();
  function button() {
    const control = document.getElementById('gear-hub-sound');
    if (!control) return;
    control.disabled = !available;
    control.setAttribute('aria-pressed', String(enabled && available));
    control.title = !available ? 'Sonido no disponible en este navegador' : enabled ? 'Silenciar engranajes' : 'Activar sonido de engranajes';
    control.setAttribute('aria-label', control.title);
    control.querySelector('svg').outerHTML = uiIcon(enabled && available ? 'sound' : 'muted');
  }
  function set(param, value) {
    if (targets.get(param) === value) return;
    targets.set(param, value); param.cancelScheduledValues(context.currentTime); param.setTargetAtTime(value, context.currentTime, .035);
  }
  function destroy(voice) {
    set(voice.gain.gain, 0);
    for (const source of voice.sources) source.stop(context.currentTime + .12);
    setTimeout(() => voice.nodes.forEach(node => node.disconnect()), 160);
  }
  function silence() {
    if (!context) return;
    for (const list of voices.values()) list.forEach(destroy);
    voices.clear();
  }
  function initialize() {
    context = new Context(); master = context.createGain(); master.gain.value = .65; master.connect(context.destination);
    noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    let seed = 7631;
    for (let i = 0; i < samples.length; i++) { seed = (1664525 * seed + 1013904223) >>> 0; samples[i] = seed / 2147483648 - 1; }
  }
  function create(spec) {
    const gain = context.createGain(), noise = context.createBufferSource(), filter = context.createBiquadFilter();
    const envelope = context.createGain(), pulse = context.createOscillator(), depth = context.createGain();
    const tone = context.createOscillator(), toneGain = context.createGain();
    gain.gain.value = 0; gain.connect(master);
    noise.buffer = noiseBuffer; noise.loop = true;
    filter.type = 'bandpass'; filter.frequency.value = spec.profile.band; filter.Q.value = .8;
    envelope.gain.value = spec.profile.noise * (1 - spec.profile.pulse / 2);
    depth.gain.value = spec.profile.noise * spec.profile.pulse / 2;
    pulse.connect(depth); depth.connect(envelope.gain);
    noise.connect(filter); filter.connect(envelope); envelope.connect(gain);
    tone.type = spec.profile.wave; toneGain.gain.value = spec.profile.tone;
    tone.connect(toneGain); toneGain.connect(gain);
    const sources = [noise, pulse, tone]; sources.forEach(source => source.start());
    return { gain, pulse, tone, sources, nodes: [gain, noise, filter, envelope, pulse, depth, tone, toneGain] };
  }
  function updateFrame() {
    if (!context || context.state !== 'running') return;
    if (!enabled || document.hidden || app.spatial?.active || app.spatial?.pending) { silence(); return; }
    const active = new Set(); let count = 0;
    for (const item of app.state.entries) {
      const specs = gearSoundVoices(item);
      if (!specs.length || count + specs.length > 8) continue;
      active.add(item); count += specs.length;
      let list = voices.get(item);
      if (!list) { list = specs.map(create); voices.set(item, list); }
      specs.forEach((spec, i) => { set(list[i].gain.gain, spec.gain); set(list[i].pulse.frequency, spec.pulseHz); set(list[i].tone.frequency, spec.frequency); });
    }
    for (const [item, list] of voices) if (!active.has(item)) { list.forEach(destroy); voices.delete(item); }
    set(master.gain, .65 / Math.sqrt(Math.max(1, count)));
  }
  function unlock() {
    if (!enabled || !available || document.hidden || !app.state.entries.some(item => item.anchor.visible && item.mechanism?.state.running)) return;
    try {
      if (!context) initialize();
      if (context.state === 'suspended') context.resume().then(updateFrame).catch(() => {});
      else updateFrame();
    } catch { available = false; silence(); button(); }
  }
  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem(preference, enabled ? 'on' : 'off'); } catch { /* Keep the session preference. */ }
    if (enabled) unlock(); else silence();
    button();
  }
  document.addEventListener('click', unlock);
  document.addEventListener('visibilitychange', () => { if (document.hidden) silence(); });
  window.addEventListener('pagehide', silence);
  return { toggle, updateFrame, silence, sync: button, get enabled() { return enabled; }, get activeVoices() { return [...voices.values()].reduce((n, list) => n + list.length, 0); } };
}
