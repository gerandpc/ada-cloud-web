function normalizarPaginaSidebar(href) {
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return "";
  try {
    return new URL(href, window.location.href).pathname.split("/").pop() || "";
  } catch (_) {
    return href.split("/").pop() || "";
  }
}

function marcarEnlaceActivo() {
  const paginaActual = window.location.pathname.split("/").pop() || "dashboard.html";
  document.querySelectorAll(".sidebar a[href]").forEach((link) => {
    const activo = normalizarPaginaSidebar(link.getAttribute("href")) === paginaActual;
    link.classList.toggle("active", activo);
    if (activo) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function cerrarSeccionesSinActivo() {
  document.querySelectorAll(".sidebar-section").forEach((section) => {
    const tieneActivo = Boolean(section.querySelector(".sidebar-submenu a.active:not([hidden])"));
    section.classList.toggle("open", tieneActivo);
    const button = section.querySelector(".sidebar-section-button");
    if (button) button.setAttribute("aria-expanded", tieneActivo ? "true" : "false");
  });
}

function alternarSeccion(button) {
  const section = button.closest(".sidebar-section");
  if (!section || section.hidden) return;
  const abrir = !section.classList.contains("open");
  section.classList.toggle("open", abrir);
  button.setAttribute("aria-expanded", abrir ? "true" : "false");
}

function inicializarSidebar() {
  document.querySelectorAll(".sidebar-section-button").forEach((button) => {
    button.setAttribute("aria-controls", button.getAttribute("aria-controls") || "");
    button.setAttribute("aria-expanded", button.closest(".sidebar-section")?.classList.contains("open") ? "true" : "false");
  });

  if (document.documentElement.dataset.adaSidebarDelegated !== "1") {
    document.documentElement.dataset.adaSidebarDelegated = "1";
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".sidebar-section-button");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      alternarSeccion(button);
    });
  }
}

function ocultarSeccionesVacias() {
  document.querySelectorAll(".sidebar-section").forEach((section) => {
    const visibles = [...section.querySelectorAll(".sidebar-submenu a")].filter((link) => !link.hidden);
    section.hidden = visibles.length === 0;
    if (section.hidden) section.classList.remove("open");
  });
}

function prepararSidebar() {
  marcarEnlaceActivo();
  ocultarSeccionesVacias();
  cerrarSeccionesSinActivo();
  inicializarSidebar();
}

document.addEventListener("DOMContentLoaded", prepararSidebar);
window.addEventListener("ada:role-applied", prepararSidebar);
