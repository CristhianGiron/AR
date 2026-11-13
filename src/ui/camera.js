import { $ } from "./dom.js";

/** One request at a time; late permissions never reactivate a camera the user stopped. */
export function createCamera(app) {
  let stream = null, requested = false, generation = 0;
  const video = $("video"), button = $("quick-camera");
  const stopTracks = (value) => value?.getTracks().forEach((track) => track.stop());

  function sync(active, pending = false) {
    button.setAttribute("aria-label", pending ? "Cancelar activación de cámara" : active ? "Desactivar cámara" : "Activar cámara");
    button.title = button.getAttribute("aria-label");
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-busy", String(pending));
    $("mode-title").textContent = active ? "Realidad Aumentada" : "Exploración 3D";
  }

  function stop(announce = false) {
    generation++; requested = false;
    const previous = stream; stream = null; stopTracks(previous);
    video.pause(); video.srcObject = null; video.style.display = "none";
    $("stage").style.background = "transparent";
    app.engine.grid.visible = false; sync(false);
    if (announce) {
      $("status").textContent = "Vista 3D activa.";
      app.interface.notify("Vista 3D activa. Sigue explorando tus objetos.");
    }
  }

  async function toggle() {
    if (requested || stream) { stop(true); return; }
    if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      app.interface.notify("Para usar la cámara, abre ExplorAR en un navegador compatible desde HTTPS o localhost.");
      return;
    }
    requested = true; const request = ++generation; sync(false, true);
    let candidate = null;
    try {
      candidate = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (request !== generation || !requested) { stopTracks(candidate); return; }
      stream = candidate;
      for (const track of stream.getVideoTracks()) track.addEventListener("ended", () => {
        if (stream !== candidate) return;
        stop(); app.interface.notify("La cámara se detuvo. Puedes activarla de nuevo o seguir explorando en 3D.");
      }, { once: true });
      video.srcObject = stream;
      await video.play();
      if (request !== generation || !requested) { stopTracks(candidate); return; }
      video.style.display = "block"; app.engine.grid.visible = false; sync(true);
      $("status").textContent = "Cámara activa. Objetos y etiquetas disponibles.";
      app.interface.notify("Cámara activa. Toca los objetos para explorar.");
    } catch (error) {
      stopTracks(candidate);
      if (request !== generation) return;
      stop();
      const message = error.name === "NotAllowedError" ? "No se pudo activar la cámara. Revisa los permisos del navegador."
        : error.name === "NotFoundError" ? "No se encontró una cámara. Puedes seguir explorando en 3D."
        : "No se pudo activar la cámara. Comprueba que esté disponible e inténtalo otra vez.";
      $("status").textContent = message; app.interface.notify(message);
    }
  }

  button.onclick = toggle;
  $("view").onclick = () => stop(true);
  window.addEventListener("pagehide", () => stop());
  sync(false);
  return { stop };
}
