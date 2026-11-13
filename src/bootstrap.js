// Keep a readable fallback even when WebGL or module startup is unavailable.
import("./main.js").catch((error) => {
  console.error("No se pudo iniciar ExplorAR:", error);
  document.getElementById("loading-indicator").hidden = true;
  const notice = document.getElementById("notice");
  notice.textContent = "No se pudo iniciar la vista 3D. Prueba un navegador actualizado con gráficos 3D disponibles y vuelve a cargar la página.";
  notice.hidden = false;
});
