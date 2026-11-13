import { $ } from "./dom.js";

/** Integrated navigation stays independent of the single secondary dialog. */
export function createHud(app) {
  const state = app.state;
  const surfaces = new Map([
    ["surfaces", $("surfaces")],
    ["echo-experiment", $("echo-experiment")], ["missions", $("missions")], ["parts", $("parts")], ["experiment", $("experiment")], ["projects", $("projects")], ["library", $("library")],
    ["scene-panel", $("scene-panel")], ["help-panel", $("help-panel")],
    ["challenge", $("challenge")], ["technical", $("technical")],
    ["panel", $("panel")], ["inspector", $("inspector")],
    ["collection-controls", $("collection-controls")],
  ]);
  const triggers = new Map([
    ["open-surfaces", "surfaces"],
    ["open-parts", "parts"], ["open-experiment", "experiment"], ["open-projects", "projects"], ["experiment-save", "projects"], ["open-challenge", "challenge"], ["open-technical", "technical"],
    ["explore", "library"], ["add-shortcut", "library"],
    ["my-scene", "scene-panel"], ["help", "help-panel"], ["toggle", "panel"],
    ["object-more", "panel"], ["object-inspect", "inspector"], ["mobile-inspect", "inspector"],
    ["view-controls-toggle", "collection-controls"],
  ]);
  const compact = matchMedia("(max-width: 700px)");
  const navigation = $("workspace-panel");

  function setNavigation(expanded, restoreFocus = false) {
    const returnFocus = restoreFocus || (!expanded && navigation.contains(document.activeElement));
    state.navigationExpanded = expanded;
    navigation.hidden = !expanded;
    navigation.inert = !expanded;
    document.body.classList.toggle("navigation-open", expanded);
    $("workspace-toggle").setAttribute("aria-expanded", String(expanded));
    const label = expanded ? "Ocultar herramientas" : "Mostrar herramientas";
    $("workspace-toggle").setAttribute("aria-label", label);
    $("workspace-toggle").title = label;
    if (returnFocus) $("workspace-toggle").focus({ preventScroll: true });
    app.pagination.refresh(navigation);
    app.layout.positionMenu();
  }

  const docked = matchMedia("(min-width: 1100px) and (min-height: 650px)");
  const informational = new Set(["inspector", "technical", "challenge", "parts", "experiment", "echo-experiment", "missions"]);
  function isDocked() { return informational.has(state.hudSurface) && docked.matches; }
  function dockedPanel() { return isDocked() ? surfaces.get(state.hudSurface) : null; }
  function isBlocking() { return !!state.hudSurface && !isDocked(); }
  let opener = null;

  function sync() {
    document.body.classList.toggle("has-hud-surface", isBlocking());
    document.body.classList.toggle("has-docked-panel", isDocked());
    for (const [id, name] of triggers) $(id).setAttribute("aria-expanded", String(state.hudSurface === (id === "open-experiment" ? app.experiment.surface() : name)));
    $("tools").hidden = !state.chosen || state.collectionMode || isBlocking();
  }

  function visible(element) {
    return element?.isConnected && !element.disabled && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden";
  }

  function close(restoreFocus = true) {
    const dialog = surfaces.get(state.hudSurface);
    if (!dialog) return;
    if (restoreFocus && state.missionId && ["inspector", "technical", "challenge", "parts", "experiment", "echo-experiment"].includes(state.hudSurface)) {
      close(false); app.missions.open(); return;
    }
    if (restoreFocus && ["challenge", "technical", "parts", "experiment", "echo-experiment"].includes(state.hudSurface) && state.chosen) {
      const target = state.hudSurface === "echo-experiment" ? $("open-experiment") : $("open-" + state.hudSurface);
      close(false); open("inspector", $("object-inspect")); target.focus({ preventScroll: true }); return;
    }
    const returnTarget = opener;
    state.hudSurface = null; opener = null; sync();
    if (dialog.open) dialog.close();
    dialog.hidden = true; dialog.classList.add("hidden");
    dialog.classList.remove("info-open");
    app.layout.positionMenu();
    if (restoreFocus) {
      const fallback = state.chosen && !state.collectionMode ? $("object-more") : $("workspace-toggle");
      (visible(returnTarget) ? returnTarget : visible(fallback) ? fallback : $("workspace-toggle")).focus({ preventScroll: true });
    }
  }

  function open(name, trigger = document.activeElement) {
    if (!surfaces.has(name)) throw new Error("Superficie HUD desconocida: " + name);
    if (state.hudSurface === name) { close(); return; }
    close(false);
    if (["panel", ...informational].includes(name) && state.chosen && state.collectionMode) app.view.setCollectionMode(false);
    state.hudSurface = name; opener = trigger;
    const dialog = surfaces.get(name);
    if (compact.matches) setNavigation(false);
    dialog.hidden = false; dialog.classList.remove("hidden"); dialog.inert = false;
    dialog.classList.toggle("info-open", name === "inspector");
    sync();
    if (isDocked()) dialog.show(); else dialog.showModal();
    app.pagination.refresh(dialog, true);
    const heading = dialog.querySelector("h1, h2");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }

  function initialize() {
    setNavigation(!compact.matches);
    docked.addEventListener("change", () => {
      if (!informational.has(state.hudSurface)) return;
      const name = state.hudSurface, dialog = surfaces.get(name);
      state.hudSurface = null; dialog.close(); state.hudSurface = name;
      sync(); if (isDocked()) dialog.show(); else dialog.showModal();
      app.pagination.refresh(dialog); app.layout.positionMenu();
    });
    $("workspace-toggle").onclick = () => setNavigation(!state.navigationExpanded);
    compact.addEventListener("change", () => setNavigation(!compact.matches && !state.hudHidden));
    navigation.addEventListener("click", (event) => {
      if (compact.matches && event.target.closest("#navigation button")) setNavigation(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isDocked()) { event.preventDefault(); close(); return; }
      if (event.key === "Escape" && !state.hudSurface && state.navigationExpanded &&
          (compact.matches || navigation.contains(document.activeElement))) {
        event.preventDefault(); setNavigation(false, true);
      }
    });
    for (const [name, dialog] of surfaces) {
      dialog.hidden = true; dialog.classList.add("hidden");
      dialog.addEventListener("keydown", (event) => {
        if (event.key !== "Tab" || !dialog.matches(":modal")) return;
        const controls = [...dialog.querySelectorAll('button, input, select, textarea, summary, a[href], [tabindex]')]
          .filter((element) => element.tabIndex >= 0 && !element.disabled && visible(element) && !element.closest('[hidden], [inert], [aria-hidden="true"]'))
          .filter((element) => {
            for (let parent = element.parentElement; parent && parent !== dialog; parent = parent.parentElement) {
              if (parent.tagName === "DETAILS" && !parent.open && !parent.querySelector(':scope > summary')?.contains(element)) return false;
            }
            return true;
          });
        const first = controls[0], last = controls.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement.tabIndex < 0)) {
          event.preventDefault(); last.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus({ preventScroll: true });
        }
      });
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
      dialog.addEventListener("close", () => { if (state.hudSurface === name && !dialog.open) close(); });
      dialog.addEventListener("click", (event) => {
        const rect = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) close();
      });
    }
    for (const [id, name] of triggers) $(id).onclick = () => {
      if (id === "open-experiment") { app.experiment.open(); return; }
      if (id === "explore") $("manual-upload").open = false;
      open(name, $(id));
      if (name === "surfaces") app.spatial.support();
      if (name === "projects") app.projects.refreshList();
      if (id === "add-shortcut") {
        $("manual-upload").open = true;
        app.pagination.refresh($("library")); app.pagination.reveal($("local-file"));
      }
    };
    document.querySelectorAll("[data-return-card]").forEach((button) => { button.onclick = () => close(); });
    document.querySelectorAll("[data-close], [data-close-surface]").forEach((button) => {
      button.onclick = () => close();
    });
    sync();
  }
  return { open, close, initialize, setNavigation, isDocked, dockedPanel, isBlocking };
}
