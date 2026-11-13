if (location.protocol === "file:") {
  const message = document.getElementById("notice");
  message.textContent = "Para cargar los modelos, abre el proyecto con un servidor local (por ejemplo, Live Server).";
  message.hidden = false;
  document.getElementById("loading-indicator").hidden = true;
}
