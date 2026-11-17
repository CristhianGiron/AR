import { TRANSMISSION_VARIANTS } from '../education/transmission-design.js';
import { $ } from './dom.js';
import { applyGearColors, partColor } from '../education/gear-colors.js';
import { uiIcon } from './icons.js';

/** A button workspace with one temporary control card; the canvas stays interactive. */
export function createGearCenter(app) {
  const root = $('gear-center'), popup = $('gear-context'), store = $('gear-control-store');
  const keys = ['controls', 'learn', 'scenes'];
  const routes = new Map([
    ['gears', ['controls']], ['gear-designer', ['controls', 'design']], ['panel', ['controls', 'appearance']],
    ['collection-controls', ['controls', 'view']], ['gear-class', ['learn']], ['inspector', ['learn', 'facts']],
    ['projects', ['scenes', 'save']], ['library', ['scenes', 'models']], ['scene-panel', ['scenes', 'objects']],
  ]);
  const cards = new Map(), buttons = new Map();
  let active = false, current = 'controls', selectedItem = null, shown = null, opener = null, more = false;

  function mount(id) {
    const original = $(id), section = document.createElement('section');
    section.id = id; section.className = 'center-module';
    const heading = original.querySelector(':scope > .panel-heading, :scope > .dialog-heading, :scope > .inspector-head');
    if (id === 'inspector') {
      heading.querySelector('[data-close-surface]').hidden = true; section.append(heading);
    } else if (heading?.querySelector('h2')) {
      const title = heading.querySelector('h2'), h3 = document.createElement('h3');
      h3.id = title.id; h3.textContent = title.textContent; h3.className = 'sr-only'; section.append(h3);
    }
    const content = original.querySelector('.page-content') || original;
    for (const node of [...content.childNodes]) if (node !== heading) section.append(node);
    original.replaceWith(section); store.append(section);
    return section;
  }
  function card(key, title, nodes) {
    const section = document.createElement('section'); section.dataset.controlCard = key;
    for (const node of nodes) section.append(node);
    store.append(section); cards.set(key, { title, section });
  }
  function button(key, text, icon, parent, action) {
    const node = document.createElement('button'); node.id = 'gear-hub-' + key; node.type = 'button';
    node.className = 'gear-hub-button'; node.innerHTML = uiIcon(icon);
    const caption = document.createElement('span'); caption.textContent = text; node.append(caption);
    node.onclick = action ? () => { dismiss(); action(); } : () => show(key, node); parent.append(node); buttons.set(key, node);
    if (!action) { node.setAttribute('aria-controls', 'gear-context'); node.setAttribute('aria-expanded', 'false'); }
    return node;
  }
  function dismiss(restoreFocus = false) {
    if (shown) {
      // Release pagination's inert rows before parking the same controls for later use.
      app.pagination.refresh(popup, true);
      store.append(cards.get(shown).section);
    }
    shown = null; popup.hidden = true;
    for (const node of buttons.values()) if (node.hasAttribute('aria-expanded') && node !== buttons.get('more')) node.setAttribute('aria-expanded', 'false');
    if (restoreFocus && opener?.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
    opener = null;
    app.gearTelemetry?.updateFrame();
  }
  function setMore(value) {
    more = value; $('gear-more-actions').hidden = !value;
    buttons.get('more').setAttribute('aria-expanded', String(value));
    buttons.get('more').querySelector('span').textContent = value ? 'Menos' : 'Más';
  }
  function select(name, focus = false) {
    dismiss(); setMore(false); current = name;
    for (const key of keys) {
      $('center-' + key).hidden = key !== name;
      const tab = $('center-' + key + '-tab'); tab.setAttribute('aria-selected', String(key === name)); tab.tabIndex = key === name ? 0 : -1;
    }
    if (focus) $('center-' + name + '-tab').focus({ preventScroll: true });
    if (name === 'learn') app.gearClass.render();
  }
  function position() {
    if (!shown || popup.hidden) return;
    const viewport = visualViewport, width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
    const leftEdge = viewport?.offsetLeft || 0, topEdge = viewport?.offsetTop || 0;
    const anchor = opener?.getBoundingClientRect() || root.getBoundingClientRect();
    popup.style.left = (leftEdge + 8) + 'px'; popup.style.top = (topEdge + 8) + 'px';
    app.pagination.refresh(popup);
    const size = popup.getBoundingClientRect(), hub = root.getBoundingClientRect();
    const left = hub.left - size.width - 12 >= leftEdge + 8 ? hub.left - size.width - 12
      : Math.max(leftEdge + 8, Math.min(leftEdge + width - size.width - 8, anchor.left + anchor.width / 2 - size.width / 2));
    const preferredTop = anchor.top - size.height - 12;
    const top = preferredTop >= topEdge + 8 ? preferredTop : Math.max(topEdge + 8, Math.min(anchor.bottom + 12, topEdge + height - size.height - 8));
    popup.style.left = left + 'px'; popup.style.top = top + 'px';
    app.gearTelemetry?.updateFrame();
  }
  function show(key, trigger = buttons.get(key)) {
    if (shown === key) { dismiss(true); return; }
    dismiss(); const record = cards.get(key); if (!record) return;
    if (key === 'design') app.gearDesigner.populate();
    if (key === 'colors') syncColors();
    if (key === 'variants') syncVariants();
    if (key === 'torque') app.gearForce.sync();
    if (['ratio', 'speed', 'torque'].includes(key)) $('class-' + key + '-tab').click();
    record.section.hidden = false;
    popup.querySelector('.page-content').append(record.section);
    shown = key; opener = trigger; $('gear-context-title').textContent = record.title;
    if (trigger?.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'true');
    popup.hidden = false; popup.style.top = '8px';
    if (['save', 'objects'].includes(key)) app.projects.refreshList();
    app.pagination.refresh(popup, true); position();
    const field = popup.querySelector('input:not([type="file"]), select');
    (field && !field.closest('[inert], [hidden]') ? field : $('gear-context-title')).focus({ preventScroll: true });
  }
  let colorItem = null;
  function syncColors() {
    const item = app.state.chosen, mechanism = item?.mechanism, target = $('gear-color-target');
    if (!target) return;
    const selected = colorItem === item ? target.value : 'all';
    if (colorItem !== item) {
      colorItem = item;
      const names = mechanism?.system.labels || ['Entrada', 'Salida'];
      const all = document.createElement('option'); all.value = 'all'; all.textContent = 'Todo el conjunto';
      target.replaceChildren(all, ...(mechanism?.parts || []).map((_, index) => {
        const option = document.createElement('option'); option.value = index;
        option.textContent = (index + 1) + ' · ' + names[index]; return option;
      }));
      target.value = selected;
    }
    const busy = !mechanism || !!app.state.pendingLoads || app.state.projectLoading;
    for (const id of ['gear-color-target', 'gear-part-color', 'gear-color-reset']) $(id).disabled = busy;
    const index = target.value;
    $('gear-part-color').value = index === 'all' ? item?.color || '#ffffff' : partColor(item, Number(index));
    $('gear-color-note').textContent = index === 'all'
      ? 'El color del conjunto tiñe todas las piezas. Al cambiarlo, reemplaza los colores individuales.'
      : item?.mechanism?.system.partTeeth?.[index]?.length > 1
        ? 'Estas dos ruedas forman una sola pieza en el OBJ y comparten color.'
        : 'Cambia solo este engranaje. Las demás piezas conservan su color.';
  }
  function createColors() {
    const section = document.createElement('div'); section.className = 'gear-color-controls';
    const label = document.createElement('label'); label.htmlFor = 'gear-color-target'; label.textContent = '¿Qué quieres colorear?';
    const target = document.createElement('select'); target.id = 'gear-color-target';
    const colorLabel = document.createElement('label'); colorLabel.htmlFor = 'gear-part-color'; colorLabel.textContent = 'Color';
    const picker = document.createElement('input'); picker.type = 'color'; picker.id = 'gear-part-color';
    const note = document.createElement('p'); note.id = 'gear-color-note';
    const reset = document.createElement('button'); reset.type = 'button'; reset.id = 'gear-color-reset'; reset.className = 'study-button'; reset.textContent = 'Recuperar color original';
    section.append(label, target, colorLabel, picker, note, reset);
    target.onchange = syncColors;
    picker.oninput = () => {
      const item = app.state.chosen, mechanism = item?.mechanism;
      if (!mechanism || picker.disabled) return;
      if (target.value === 'all') {
        app.editor.recolor(item, picker.value, true); $('color').value = $('quick-color').value = item.color;
      } else {
        mechanism.state.colors ||= Array(mechanism.parts.length).fill(null);
        mechanism.state.colors[Number(target.value)] = picker.value; applyGearColors(item);
      }
      app.loop.renderFrame();
    };
    reset.onclick = () => {
      const item = app.state.chosen; if (!item?.mechanism) return;
      if (target.value === 'all') { app.editor.recolor(item, '#ffffff', true); $('color').value = $('quick-color').value = item.color; }
      else {
        if (item.mechanism.state.colors) {
          item.mechanism.state.colors[Number(target.value)] = null;
          if (item.mechanism.state.colors.every(color => color === null)) delete item.mechanism.state.colors;
        }
        applyGearColors(item);
      }
      syncColors(); app.loop.renderFrame();
    };
    return section;
  }
  function createVariants() {
    const section = document.createElement('section');
    const note = document.createElement('p'); note.textContent = 'Compara montajes. Al cambiar de variante el mecanismo vuelve montado y en pausa.';
    const grid = document.createElement('div'); grid.className = 'gear-variant-options'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Variantes de transmisión');
    const reading = document.createElement('p'); reading.id = 'gear-variant-reading'; reading.setAttribute('role', 'status');
    const error = document.createElement('p'); error.id = 'gear-variant-error'; error.setAttribute('role', 'alert'); error.hidden = true;
    for (const [id, title] of [['original', 'Original · OBJ'], ...Object.entries(TRANSMISSION_VARIANTS).map(([id, v]) => [id, v.name])]) {
      const option = document.createElement('button'); option.type = 'button'; option.className = 'study-button'; option.dataset.transmissionVariant = id; option.textContent = title;
      option.onclick = async () => {
        error.hidden = true;
        grid.querySelectorAll('button').forEach(b => b.disabled = true);
        try { await app.gearDesigner.replaceTransmission(id === 'original' ? undefined : id); }
        catch (failure) { error.textContent = failure.message; error.hidden = false; }
        finally { syncVariants(); app.pagination.refresh(popup); if (!error.hidden) app.pagination.reveal(error); }
      };
      grid.append(option);
    }
    section.append(note, grid, reading, error); return section;
  }
  function syncVariants() {
    const item = app.state.chosen, m = item?.mechanism;
    for (const b of document.querySelectorAll('[data-transmission-variant]')) {
      b.setAttribute('aria-pressed', String((m?.transmissionVariant || 'original') === b.dataset.transmissionVariant));
      b.disabled = item?.definition.id !== 'engranajes-transmision' || !!app.state.pendingLoads;
    }
    const reading = $('gear-variant-reading'); if (reading && item?.definition.id === 'engranajes-transmision') reading.textContent = m.system.description;
  }
  function sync() {
    if (!active) return;
    const item = app.state.chosen, mechanism = item?.mechanism;
    const busy = !!app.state.pendingLoads || app.state.projectLoading || app.state.catalogLoading;
    const source = $('gear-play'), play = buttons.get('play');
    play.disabled = !mechanism || source.disabled || busy;
    play.setAttribute('aria-pressed', source.getAttribute('aria-pressed') || 'false');
    const playing = !!mechanism?.state.running, label = playing ? 'Pausar' : 'Iniciar';
    if (play.dataset.state !== label) {
      play.dataset.state = label; play.innerHTML = uiIcon(playing ? 'pause' : 'play');
      const caption = document.createElement('span'); caption.textContent = label; play.append(caption);
    }
    for (const key of ['step', 'rpm', 'teeth', 'separate', 'assemble', 'reverse', 'piece', 'reset']) buttons.get(key).disabled = !mechanism || busy;
    buttons.get('reverse').setAttribute('aria-pressed', String(mechanism?.state.direction === -1));
    buttons.get('design').hidden = item?.definition.id !== 'engranajes-rectos';
    buttons.get('design').disabled = busy;
    buttons.get('force').hidden = item?.definition.id !== 'engranajes-rectos';
    buttons.get('force').disabled = busy;
    buttons.get('variants').hidden = item?.definition.id !== 'engranajes-transmision';
    buttons.get('variants').disabled = busy;
    syncVariants();
    if (item !== selectedItem) { selectedItem = item; if (['rpm', 'separate', 'teeth', 'piece', 'design', 'facts', 'colors'].includes(shown)) dismiss(); app.gearDesigner.populate(); }
    if (shown === 'colors') syncColors();
    if (app.state.hudSurface !== 'gear-center') { dismiss(); setMore(false); }
  }
  function activate() {
    if (active) return;
    const modules = new Map([...routes.keys()].map(id => [id, mount(id)]));
    $('gear-center-models').append($('class-model-options'));
    const controls = $('center-controls'), main = document.createElement('div'), extra = document.createElement('div');
    main.id = 'gear-main-actions'; main.className = extra.className = 'gear-button-grid'; extra.id = 'gear-more-actions'; extra.hidden = true;
    controls.append(main, extra);
    button('play', 'Iniciar', 'play', main, () => $('gear-play').click());
    button('step', 'Un paso', 'step', main, () => $('gear-step').click());
    button('rpm', 'Velocidad', 'speed', main);
    button('teeth', 'Dientes', 'settings', main);
    const moreButton = button('more', 'Más', 'more', main, () => { dismiss(); setMore(!more); });
    moreButton.setAttribute('aria-controls', 'gear-more-actions'); moreButton.setAttribute('aria-expanded', 'false');
    button('separate', 'Separar', 'separate', extra);
    button('assemble', 'Juntar', 'assemble', extra, () => { dismiss(); $('gear-assemble').click(); });
    button('direction', 'Ver giro', 'reverse', extra, () => app.gearDirections.toggle()).setAttribute('aria-pressed', String(app.gearDirections.enabled));
    button('sound', 'Sonido', 'sound', extra, () => app.gearSound.toggle()); app.gearSound.sync();
    button('reverse', 'Invertir', 'reverse', extra, () => { dismiss(); $('gear-reverse').click(); });
    button('piece', 'Una pieza', 'piece', extra);
    button('design', 'Diseñar', 'settings', extra);
    const forceButton = button('force', 'Fuerza', 'torque', extra, () => show('torque', buttons.get('force')));
    forceButton.setAttribute('aria-controls', 'gear-context'); forceButton.setAttribute('aria-expanded', 'false');
    button('variants', 'Variantes', 'settings', extra);
    button('colors', 'Color', 'palette', extra);
    button('appearance', 'Aspecto', 'palette', extra);
    button('view', 'Vista', 'view', extra);
    button('reset', 'Reiniciar', 'reset', extra, () => { dismiss(); $('gear-reset').click(); });
    const learn = $('center-learn'), scenes = $('center-scenes'); learn.classList.add('gear-button-grid'); scenes.classList.add('gear-button-grid');
    button('ratio', 'Relación', 'settings', learn); button('speed', 'Giro', 'speed', learn);
    button('torque', 'Torque', 'torque', learn); button('facts', 'Ficha', 'book', learn);
    button('save', 'Guardar / abrir', 'save', scenes); button('models', 'Importar', 'add', scenes); button('objects', 'Objetos', 'piece', scenes);
    card('variants', 'Variantes de transmisión', [createVariants()]);
    card('colors', 'Color por engranaje', [createColors()]);
    const perPart = document.createElement('button'); perPart.type = 'button'; perPart.className = 'study-button'; perPart.textContent = 'Color por engranaje'; perPart.onclick = () => show('colors', buttons.get('colors'));
    $('quick-color').closest('label').after(perPart);
    card('rpm', 'Velocidad de entrada', [document.querySelector('label[for="class-rpm"]'), $('class-rpm'), document.querySelector('label[for="gear-speed"]'), $('gear-speed'), $('gear-reading')]);
    card('separate', 'Separar las ruedas', [document.querySelector('label[for="gear-separation"]'), $('gear-separation'), $('gear-status')]);
    card('teeth', 'Dientes de cada rueda', [$('class-custom'), $('class-fixed'), $('class-error')]);
    const piece = $('gear-piece').closest('details');
    card('piece', 'Examinar una pieza', [...piece.children].filter(node => node.tagName !== 'SUMMARY'));
    for (const [key, id, title] of [
      ['design', 'gear-designer', 'Diseño avanzado'], ['appearance', 'panel', 'Aspecto y posición'], ['view', 'collection-controls', 'Vista y cámara'],
      ['facts', 'inspector', 'Ficha del modelo'], ['save', 'projects', 'Guardar y abrir escenas'], ['models', 'library', 'Añadir o importar modelos'], ['objects', 'scene-panel', 'Objetos de la escena'],
    ]) card(key, title, [modules.get(id)]);
    for (const [key, title] of [['ratio', 'Relación de engranajes'], ['speed', 'Sentido de giro'], ['torque', 'Fuerza y torque']]) card(key, title, [$('class-' + key + '-panel')]);
    app.pagination.mount(popup);
    $('class-return').textContent = 'Mi taller'; $('class-return').onclick = () => openSurface('gears', $('class-return'));
    $('open-gear-class').onclick = () => app.gears.open(); $('open-gear-class').querySelector('span:last-child').textContent = 'Mi taller';
    for (const node of document.querySelectorAll('[aria-controls]')) if (routes.has(node.getAttribute('aria-controls'))) node.setAttribute('aria-controls', 'gear-center');
    active = true; document.body.classList.add('gear-center-active'); select('controls'); sync();
  }
  function openSurface(name, trigger) {
    if (!active || !routes.has(name)) return;
    const [section, key] = routes.get(name); select(section);
    if (shown === 'colors') syncColors();
    if (app.state.hudSurface !== 'gear-center') app.hud.open('gear-center', trigger);
    if (key) show(key, trigger); else $('center-' + section + '-tab').focus({ preventScroll: true });
  }
  for (const [index, key] of keys.entries()) {
    const tab = $('center-' + key + '-tab'); tab.onclick = () => select(key);
    tab.onkeydown = event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1
        : event.key === 'ArrowRight' ? (index + 1) % keys.length : event.key === 'ArrowLeft' ? (index + keys.length - 1) % keys.length : -1;
      if (next >= 0) { event.preventDefault(); select(keys[next], true); }
    };
  }
  root.addEventListener('pointerdown', event => { if (event.target.closest('[data-gear-select]')) dismiss(); });
  $('gear-context-close').onclick = () => dismiss(true);
  document.addEventListener('pointerdown', event => {
    if (active && app.state.hudSurface === 'gear-center' && !root.contains(event.target)) { dismiss(); setMore(false); }
    else if (shown && root.contains(event.target) && !popup.contains(event.target) && !event.target.closest('button')) { dismiss(); setMore(false); }
  });
  document.addEventListener('keydown', event => {
    if (!active || app.state.hudSurface !== 'gear-center' || event.key !== 'Escape') return;
    if (shown || more) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (shown) dismiss(true); else { setMore(false); buttons.get('more').focus(); }
    }
  }, true);
  addEventListener('resize', position); visualViewport?.addEventListener('resize', position);
  return { activate, openSurface, sync, dismiss, handles: name => active && routes.has(name), get active() { return active; }, get section() { return current; }, get control() { return shown; } };
}
