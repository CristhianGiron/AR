const paths = {
  sound: '<path d="M11 5 6 9H3v6h3l5 4V5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  muted: '<path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l6 6m0-6-6 6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  speed: '<path d="M4 19a9 9 0 1 1 16 0M12 13l5-6M7 17h10"/>',
  separate: '<path d="M10 4v16M14 4v16M7 12H2m0 0 3-3m-3 3 3 3M17 12h5m0 0-3-3m3 3-3 3"/>',
  assemble: '<path d="M9 4v16M15 4v16M2 12h5m0 0-3-3m3 3-3 3M22 12h-5m0 0 3-3m-3 3 3 3"/>',
  reverse: '<path d="M4 8h16m0 0-4-4m4 4-4 4M20 16H4m0 0 4-4m-4 4 4 4"/>',
  piece: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-4-5-6-9-6Z"/><circle cx="7" cy="9" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="17" cy="8" r="1"/>',
  view: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  reset: '<path d="M4 4v6h6M4 10a8 8 0 1 1 1 8"/>',
  torque: '<path d="M4 19h16M7 19V5l12 7M7 5l10-2M18 5v10m0 0-3-3m3 3 3-3"/>',
  book: '<path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v15"/>',
  save: '<path d="M4 3h13l4 4v14H3V3h1ZM7 3v6h9V3M7 21v-8h10v8"/>',
  add: '<path d="M12 4v16M4 12h16"/>',

  play: '<path d="m8 5 10 7-10 7Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M9 6v12M15 6v12" stroke-width="3"/>',
  step: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5M12 8v4l3 2"/>',
  settings: '<path d="m9 3-.5 3-2 1-2.5-1-2 4 2.5 2v2L2 16l2 4 3-1 2 1 1 2h4l1-2 2-1 3 1 2-4-2.5-2v-2L22 10l-2-4-2.5 1-2-1L15 3H9Z"/><circle cx="12" cy="12" r="3"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
export function uiIcon(name) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
}
export function installInterfaceIcons() {
  document.querySelectorAll('button[data-close], #gear-inline-close, #gear-context-close').forEach((button) => {
    if (!button.querySelector('svg') && button.textContent.trim() === '×') button.innerHTML = uiIcon('close');
  });
  for (const id of ['open-gears', 'open-gear-class']) {
    const decorative = document.getElementById(id)?.querySelector(':scope > span[aria-hidden="true"]');
    if (decorative) decorative.outerHTML = uiIcon('settings');
  }
}
