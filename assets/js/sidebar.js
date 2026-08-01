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

function inicializarSidebar() {
  document.querySelectorAll(".sidebar-section-button").forEach((button) => {
    if (button.dataset.sidebarBound === "1") return;
    button.dataset.sidebarBound = "1";
    button.setAttribute("aria-expanded", button.closest(".sidebar-section")?.classList.contains("open") ? "true" : "false");
    button.addEventListener("click", () => {
      const section = button.closest(".sidebar-section");
      if (!section) return;
      section.classList.toggle("open");
      button.setAttribute("aria-expanded", section.classList.contains("open") ? "true" : "false");
    });
  });
}

function abrirSeccionesConActivo() {
  document.querySelectorAll(".sidebar-submenu a.active").forEach((link) => {
    const section = link.closest(".sidebar-section");
    if (!section) return;
    section.classList.add("open");
    const button = section.querySelector(".sidebar-section-button");
    if (button) button.setAttribute("aria-expanded", "true");
  });
}

function ocultarSeccionesVacias() {
  document.querySelectorAll(".sidebar-section").forEach((section) => {
    const visibles = [...section.querySelectorAll(".sidebar-submenu a")].filter((link) => !link.hidden);
    section.hidden = visibles.length === 0;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  marcarEnlaceActivo();
  inicializarSidebar();
  abrirSeccionesConActivo();
  ocultarSeccionesVacias();
});

window.addEventListener("ada:role-applied", () => {
  marcarEnlaceActivo();
  abrirSeccionesConActivo();
  ocultarSeccionesVacias();
});
