const atomicSelector = 'button, input, select, textarea, label, meter, li, summary, p, h3, .axis, .stat, .help-step, #model-data > div, .nav-caption, .reference-fact, [role=alert], #status';

/** Pack whole visual rows; tall prose is supplied as individual text lines. */
export function paginateBands(bands, capacity, totalHeight) {
  const rows = [];
  for (const band of bands.sort((a, b) => a.start - b.start || Number(!!b.breakBefore) - Number(!!a.breakBefore))) {
    const previous = rows.at(-1);
    if (previous && !band.breakBefore && !previous.breakBefore && band.start < previous.end - 0.5) previous.end = Math.max(previous.end, band.end);
    else rows.push({ ...band });
  }
  const pages = [];
  let start = 0, end = 0;
  for (const row of rows) {
    if (row.breakBefore) {
      if (end > start) pages.push({ start, end });
      start = row.start; end = row.start; continue;
    }
    if (row.end - start > capacity && end > start) {
      pages.push({ start, end }); start = row.start;
    }
    // Empty space between sections is not a page of its own.
    if (row.end - start > capacity && row.start > start) start = row.start;
    end = row.end;
  }
  if (end > start || !pages.length) pages.push({ start, end: Math.max(start + 1, end) });
  const last = pages.at(-1);
  last.end = Math.min(last.start + capacity, Math.max(last.end, totalHeight));
  return pages;
}

export function createPagination() {
  const controllers = new Map();
  const arrow = (direction) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction < 0 ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}"/></svg>`;

  function mount(surface) {
    const heading = surface.querySelector(':scope > .dialog-heading, :scope > .panel-heading, :scope > .inspector-head');
    const body = document.createElement('div'), clip = document.createElement('div'), content = document.createElement('div');
    body.className = 'page-body'; clip.className = 'page-clip'; content.className = 'page-content';
    for (const node of [...surface.childNodes]) if (node !== heading) content.append(node);
    clip.append(content); body.append(clip); surface.append(body);
    const footer = document.createElement('div'); footer.className = 'page-navigation';
    footer.setAttribute('role', 'group'); footer.setAttribute('aria-label', 'Páginas de ' + (surface.id === 'inspector' ? 'Ficha y reto' : heading?.textContent.trim() || 'Herramientas'));
    const previous = document.createElement('button'), next = document.createElement('button'), status = document.createElement('span');
    for (const [button, label, direction] of [[previous, 'Página anterior', -1], [next, 'Página siguiente', 1]]) {
      button.type = 'button'; button.className = 'page-arrow round-button'; button.setAttribute('aria-label', label); button.title = label;
      button.innerHTML = arrow(direction);
    }
    const context = document.createElement('span'); context.className = 'page-context';
    const indicator = document.createElement('div'); indicator.className = 'page-indicator';
    status.className = 'page-number'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    indicator.append(context, status); footer.append(previous, indicator, next); surface.append(footer); surface.classList.add('paged-surface');
    let pages = [{ start: 0, end: 1 }], index = 0, busy = false, scheduled = false;
    let units = [], restored = new Map();

    function restore() {
      for (const [element, attributes] of restored) {
        element.inert = attributes.inert;
        if (attributes.aria === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', attributes.aria);
      }
      restored.clear();
    }
    function isVisible(element) {
      if (element.closest('[hidden], .hidden, .sr-only')) return false;
      for (let ancestor = element.parentElement; ancestor && ancestor !== surface; ancestor = ancestor.parentElement) {
        if (ancestor.tagName === 'DETAILS' && !ancestor.open && !ancestor.querySelector(':scope > summary')?.contains(element)) return false;
      }
      return element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    }
    function render(focus = false) {
      restore();
      const page = pages[index];
      const pageHeight = Math.max(1, page.end - page.start);
      const bodyStyle = getComputedStyle(body);
      const insets = parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);
      body.style.height = (pageHeight + insets) + 'px'; clip.style.height = pageHeight + 'px';
      content.style.transform = `translateY(${-page.start}px)`;
      for (const unit of units) {
        if (unit.end <= page.start + 0.5 || unit.start >= page.end - 0.5) {
          restored.set(unit.element, { inert: unit.element.inert, aria: unit.element.getAttribute('aria-hidden') });
          unit.element.inert = true; unit.element.setAttribute('aria-hidden', 'true');
        }
      }
      const firstUnit = units.find((unit) => unit.end > page.start + .5 && unit.start < page.end - .5);
      const section = firstUnit?.element.closest('details, [data-page-title]');
      const sectionTitle = section?.dataset.pageTitle || section?.querySelector(':scope > summary')?.textContent.trim();
      const title = sectionTitle || (surface.id === 'inspector' ? 'Ficha del componente' : heading?.querySelector('h2')?.textContent || 'Herramientas');
      if (context.textContent !== title) context.textContent = title;
      previous.disabled = index === 0; next.disabled = index === pages.length - 1;
      const pageLabel = `${index + 1} / ${pages.length}`;
      if (status.textContent !== pageLabel) status.textContent = pageLabel;
      footer.hidden = pages.length <= 1;
      surface.dataset.pageIndex = String(index); surface.dataset.pageCount = String(pages.length);
      if (focus) {
        const active = document.activeElement;
        if (active === previous && previous.disabled) (next.disabled ? heading || surface : next).focus({ preventScroll: true });
        else if (active === next && next.disabled) previous.focus({ preventScroll: true });
      }
    }
    function refresh(reset = false) {
      if (busy || surface.hidden || (surface.tagName === 'DIALOG' && !surface.open)) return;
      busy = true;
      const oldStart = reset ? 0 : pages[index].start;
      restore(); content.style.transform = 'none'; clip.style.height = 'auto';
      const style = getComputedStyle(surface), header = heading?.getBoundingClientRect().height || 0;
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const bodyStyle = getComputedStyle(body);
      const bottomInset = parseFloat(bodyStyle.paddingBottom);
      // Headers have negative margins in the original card; compute from actual content origin.
      let origin = content.getBoundingClientRect().top;
      const top = surface.getBoundingClientRect().top;
      const occupiedTop = Math.max(0, origin - top);
      const viewportLimit = (visualViewport?.height || innerHeight) - (innerWidth <= 700 ? 24 : Math.max(0, top) + 8);
      const maxHeight = Math.min(parseFloat(style.maxHeight) || innerHeight - 24, viewportLimit);
      const capacityWithoutFooter = Math.max(80, maxHeight - Math.max(header, occupiedTop) - (padding / 2) - bottomInset - 6);
      const totalHeight = Math.ceil(content.getBoundingClientRect().height);
      const hasSections = [...content.querySelectorAll('[data-page-break], details[open]:not(#technical-details)')].some(isVisible);
      const capacity = Math.max(64, capacityWithoutFooter - (totalHeight > capacityWithoutFooter || hasSections ? 60 : 0));
      body.style.height = (Math.min(capacity, totalHeight) + parseFloat(bodyStyle.paddingTop) + bottomInset) + 'px';
      origin = content.getBoundingClientRect().top;
      const candidates = [...content.querySelectorAll(atomicSelector)].filter(isVisible);
      units = candidates.map((element) => {
        const rect = element.getBoundingClientRect();
        const input = element.tagName === 'LABEL' && element.htmlFor ? document.getElementById(element.htmlFor) : null;
        const end = input && content.contains(input) ? Math.max(rect.bottom, input.getBoundingClientRect().bottom) : rect.bottom;
        return { element, start: Math.max(0, rect.top - origin), end: end - origin };
      });
      const bands = [];
      for (const unit of units) {
        if (unit.end - unit.start <= capacity) bands.push({ start: unit.start, end: unit.end });
        else {
          // Long descriptions retain their text and links; only page between complete lines.
          const walker = document.createTreeWalker(unit.element, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const range = document.createRange(); range.selectNodeContents(walker.currentNode);
            for (const rect of range.getClientRects()) if (rect.height && rect.width) bands.push({ start: rect.top - origin, end: rect.bottom - origin });
          }
        }
      }
      // Keep section headings with the first meaningful control or paragraph.
      // Group short related blocks only if the entire block fits this viewport.
      for (const selector of ['.numeric-pair, .position-buttons', '.exact-angles', '.rotation-options', '.learning-steps', '#learning-observation', '.help-step', 'details[open]', '[data-page-group]']) {
        for (const group of [...content.querySelectorAll(selector)].filter(isVisible)) {
          const members = units.filter((unit) => group.contains(unit.element));
          if (!members.length) continue;
          const start = Math.min(...members.map((unit) => unit.start));
          const end = Math.max(...members.map((unit) => unit.end));
          if (end - start <= capacity) bands.push({ start, end });
        }
      }
      for (const unit of units.filter((unit) => unit.element.matches('h3') || (unit.element.matches('summary') && unit.element.parentElement.open))) {
        const following = units.find((other) => other.start >= unit.end - .5 && other.element !== unit.element);
        if (following && following.end - unit.start <= capacity) bands.push({ start: unit.start, end: following.end });
      }
      // A concluding action belongs with the information it acts on, never alone.
      for (const unit of units.filter((unit) => unit.element.matches('[data-keep-previous]'))) {
        const previous = units.filter((other) => other.end <= unit.start + .5 && other.element !== unit.element)
          .sort((a, b) => b.end - a.end)[0];
        if (previous && unit.end - previous.start <= capacity) bands.push({ start: previous.start, end: unit.end });
      }
      for (const section of [...content.querySelectorAll('[data-page-break], details[open]:not(#technical-details)')].filter(isVisible)) {
        const start = section.getBoundingClientRect().top - origin;
        bands.push({ start, end: start, breakBefore: true });
      }
      pages = paginateBands(bands, capacity, totalHeight);
      index = Math.max(0, pages.findIndex((page) => page.end > oldStart + 0.5));
      render(); busy = false;
      const active = document.activeElement;
      if (content.contains(active) && active.closest('[inert]')) reveal(active);
    }
    function schedule() {
      if (scheduled) return;
      scheduled = true; queueMicrotask(() => { scheduled = false; refresh(); });
    }
    function locate(element) {
      refreshIfNeeded();
      const rect = element.getBoundingClientRect(), root = content.getBoundingClientRect();
      const start = rect.top - root.top, end = rect.bottom - root.top;
      const target = pages.findIndex((page) => start >= page.start - 1 && end <= page.end + 1);
      return target;
    }
    function reveal(element) {
      const target = locate(element);
      if (target >= 0 && target !== index) { index = target; render(); }
      return target;
    }
    function refreshIfNeeded() { if (!busy && !units.length) refresh(); }
    previous.onclick = () => { if (index > 0) { index--; render(true); } };
    next.onclick = () => { if (index < pages.length - 1) { index++; render(true); } };
    content.addEventListener('focusin', (event) => { if (!busy) reveal(event.target); });
    content.addEventListener('toggle', schedule, true);
    let validationTarget = null, reportingValidity = false;
    content.addEventListener('invalid', (event) => {
      if (reportingValidity) return;
      event.preventDefault();
      const firstInvalid = [...(event.target.form?.elements || [])].find((element) => element.willValidate && !element.validity.valid);
      if (firstInvalid && firstInvalid !== event.target) return;
      if (validationTarget) return;
      validationTarget = event.target;
      queueMicrotask(() => { validationTarget = null; });
      refresh(); reveal(event.target); event.target.focus({ preventScroll: true });
      reportingValidity = true; event.target.reportValidity(); reportingValidity = false;
    }, true);
    const observer = new MutationObserver(schedule);
    observer.observe(content, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'open', 'class'] });
    const controller = { refresh, reveal, locate, get index() { return index; }, get pages() { return pages; } };
    controllers.set(surface, controller); return controller;
  }
  function refresh(surface, reset = false) { controllers.get(surface)?.refresh(reset); }
  function reveal(element) {
    const surface = element?.closest('.paged-surface');
    return controllers.get(surface)?.reveal(element) ?? -1;
  }
  function initialize() {
    document.querySelectorAll('dialog.hud-dialog, #workspace-panel').forEach(mount);
    const update = () => controllers.forEach((controller) => controller.refresh());
    addEventListener('resize', update); visualViewport?.addEventListener('resize', update);
  }
  function locate(element) {
    const surface = element?.closest('.paged-surface'), controller = controllers.get(surface);
    return controller ? { surface: surface.id, target: controller.locate(element), current: controller.index } : null;
  }
  return { initialize, refresh, reveal, locate };
}
