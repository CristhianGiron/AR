import { $ } from "../ui/dom.js";
import { validateLessons, evaluateAnswer } from "./lessons.js";

export function createLearning(app) {
  const state = app.state;
  let lessons = new Map(), currentKey = null, previousView = null;
  const responses = new Map();

  function closeInspector(returnFocus = false) {
    if (["inspector", "challenge", "technical"].includes(state.hudSurface)) app.hud.close(returnFocus);
  }

  function openInspector() {
    if (state.chosen) app.hud.open("inspector", $("mobile-inspect"));
  }

  function updateFocusButton() {
    $("focus-component").textContent = state.isolatedItem ? "Volver a todos" : "Explorar en 3D";
    $("focus-component").setAttribute("aria-pressed", String(!!state.isolatedItem));
  }

  function showAll() {
    state.isolatedItem = null;
    state.entries.forEach((item) => { item.anchor.visible = true; });
    if (previousView) Object.assign(state.viewState, previousView);
    previousView = null;
    app.view.syncCollectionControls();
    updateFocusButton();
  }

  function focusComponent() {
    if (!state.chosen) return;
    if (state.isolatedItem) { showAll(); return; }
    previousView = { ...state.viewState };
    state.isolatedItem = state.chosen;
    state.entries.forEach((item) => { item.anchor.visible = item === state.chosen; });
    Object.assign(state.viewState, { x: 0, y: 0, zoom: 1.65 });
    app.view.syncCollectionControls();
    updateFocusButton();
    if (state.missionId && state.hudSurface === 'inspector') {
      app.hud.close(false); $('object-inspect').focus({ preventScroll: true });
    } else closeInspector(true);
    app.interface.notify("Observa las partes de " + state.chosen.name + ". Puedes volver a todos cuando quieras.");
  }

  function showStep(step) {
    const observe = step === "observe";
    $("learning-observation").hidden = !observe;
    $("learning-check").hidden = observe;
    $("learning-observe-tab").setAttribute("aria-pressed", String(observe));
    $("learning-quiz-tab").setAttribute("aria-pressed", String(!observe));
    app.pagination?.refresh($("challenge"));
    app.pagination?.reveal($(observe ? "learning-goal" : "learning-question"));
  }

  function getSummary(item) {
    return item ? lessons.get(item.definition.id)?.resumen || item.definition.descripcion : "";
  }

  function updateFeedback(lesson) {
    const response = responses.get(lesson.modelo);
    $("learning-feedback").hidden = !response;
    $("learning-feedback").textContent = response?.message || "";
    $("learning-feedback").classList.toggle("correct", !!response?.correct);
    $("retry-lesson").hidden = !response?.correct;
    [...$("learning-choices").children].forEach((button, index) => {
      button.setAttribute("aria-pressed", String(response?.index === index));
      button.disabled = !!response?.correct;
    });
  }

  function render(item) {
    $("mobile-inspect").hidden = !item;
    $("learning-card").hidden = !item;
    $("open-challenge").disabled = $("open-technical").disabled = !item;
    if (!item) { currentKey = null; if (["parts", "experiment", "echo-experiment"].includes(state.hudSurface)) app.hud.close(false); else closeInspector(); return; }
    if (state.isolatedItem && state.isolatedItem !== item) {
      state.isolatedItem = item;
      state.entries.forEach((entry) => { entry.anchor.visible = entry === item; });
    }
    updateFocusButton();
    const key = item.definition.id;
    if (currentKey === key) return;
    currentKey = key;
    const lesson = lessons.get(key);
    showStep("observe");
    $("learning-quiz-tab").hidden = !lesson;
    $("learning-choices").replaceChildren();
    $("learning-feedback").hidden = $("retry-lesson").hidden = true;
    $("learning-deeper").open = false;
    $("learning-goal").textContent = lesson?.objetivo || "Explora la forma y las partes de este modelo.";
    $("learning-observe").textContent = lesson?.observa || "Gira el componente, observa sus caras y describe dos partes que puedas distinguir.";
    $("learning-question").textContent = lesson?.pregunta || "¿Qué has observado?";
    $("learning-extension").textContent = lesson?.profundiza || "Compara este modelo con un sensor de la colección. ¿En qué se parecen y en qué se diferencian?";
    if (!lesson) return;
    lesson.opciones.forEach((text, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.textContent = text; button.className = "learning-choice";
      button.onclick = () => {
        responses.set(key, { ...evaluateAnswer(lesson, index), index });
        updateFeedback(lesson);
        app.pagination.refresh($("challenge"));
        app.pagination.reveal($("learning-feedback"));
        if (responses.get(key).correct) $("learning-feedback").focus({ preventScroll: true });
      };
      $("learning-choices").append(button);
    });
    updateFeedback(lesson);
  }

  async function load() {
    try {
      const response = await fetch(new URL("./contenido/retos.json", document.baseURI));
      if (!response.ok) throw new Error("No se pudieron leer los retos.");
      lessons = validateLessons(await response.json());
    } catch (error) { console.warn("Se mantiene la exploración libre:", error.message); }
    currentKey = null; app.interface.refreshInspector();
  }

  $("learning-observe-tab").onclick = () => showStep("observe");
  $("learning-quiz-tab").onclick = () => showStep("quiz");
  $("mobile-inspect").onclick = openInspector;
  $("focus-component").onclick = focusComponent;
  $("retry-lesson").onclick = () => {
    if (!state.chosen) return;
    responses.delete(state.chosen.definition.id); currentKey = null; render(state.chosen); showStep("quiz");
    app.pagination.refresh($("challenge"));
    app.pagination.reveal($("learning-choices").firstElementChild);
    $("learning-choices").firstElementChild?.focus();
  };
  function snapshot() {
    return { answers: [...responses].map(([model, response]) => ({ model, index: response.index })), returnView: previousView ? { ...previousView } : null };
  }
  function restoreSnapshot(document) {
    responses.clear(); currentKey = null;
    for (const answer of document.answers) {
      const lesson = lessons.get(answer.model);
      if (lesson && answer.index < lesson.opciones.length) responses.set(answer.model, { ...evaluateAnswer(lesson, answer.index), index: answer.index });
    }
    state.isolatedItem = document.isolated === null ? null : state.entries[document.isolated];
    previousView = document.returnView;
    state.entries.forEach((item) => { item.anchor.visible = !state.isolatedItem || item === state.isolatedItem; });
    updateFocusButton();
  }
  function getEvidence(model) {
    const lesson = lessons.get(model), response = responses.get(model);
    return lesson && response ? { question: lesson.pregunta, answer: lesson.opciones[response.index], feedback: response.message } : null;
  }
  return { render, load, getEvidence, showStep, isCorrect: (model) => !!responses.get(model)?.correct, ensureFocused: () => { if (state.chosen && state.isolatedItem !== state.chosen) focusComponent(); }, snapshot, restoreSnapshot, closeInspector, showAll, openInspector, getSummary };
}
