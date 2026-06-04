// ADA Cloud Web - Login viejo deshabilitado
// La entrada oficial ahora es el portal visual index.html.

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname || "";
  const target = path.includes("/pages/") ? "../index.html" : "index.html";
  window.location.replace(target);
});
