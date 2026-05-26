function inicializarSidebar() {
  document.querySelectorAll(".sidebar-section-button").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.closest(".sidebar-section");
      section.classList.toggle("open");
    });
  });
}

function abrirSeccionesConActivo() {
  document.querySelectorAll(".sidebar-submenu a.active").forEach((link) => {
    const section = link.closest(".sidebar-section");
    if (section) section.classList.add("open");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarSidebar();
  abrirSeccionesConActivo();
});
