(function () {
  "use strict";

  const MODULES = [
    { page: "programas.html", label: "Programas", icon: "📘", roles: ["admin", "directivo", "docente", "alumno", "familia"] },
    { page: "planificaciones.html", label: "Planificaciones", icon: "🗓️", roles: ["admin", "directivo", "docente", "alumno", "familia"] },
    { page: "actividades.html", label: "Actividades", icon: "📝", roles: ["admin", "directivo", "docente", "alumno"] },
    { page: "entregas.html", label: "Entregas", icon: "📤", roles: ["admin", "directivo", "docente", "alumno"] },
    { page: "asistencia.html", label: "Asistencia", icon: "📅", roles: ["admin", "directivo", "secretaria", "docente", "preceptor"] },
    { page: "calificaciones.html", label: "Calificaciones", icon: "✅", roles: ["admin", "directivo", "secretaria", "docente"] },
    { page: "libro-calificaciones.html", label: "Libro", icon: "📗", roles: ["admin", "directivo", "secretaria", "docente"] },
    { page: "boletines.html", label: "Boletines", icon: "📄", roles: ["admin", "directivo", "secretaria", "alumno", "familia"] },
    { page: "cierres-academicos.html", label: "Cierres", icon: "🔒", roles: ["admin", "directivo", "secretaria"] },
    { page: "boletines-actas.html", label: "Actas", icon: "🗂️", roles: ["admin", "directivo", "secretaria"] },
    { page: "libres-materia.html", label: "Libres", icon: "⚠️", roles: ["admin", "directivo", "secretaria", "preceptor"] },
    { page: "horarios.html", label: "Horarios", icon: "🕒", roles: ["admin", "directivo", "secretaria"] },
    { page: "reportes.html", label: "Reportes", icon: "📊", roles: ["admin", "directivo", "secretaria", "docente", "preceptor"] }
  ];

  function currentPage() {
    return (location.pathname.split("/").pop() || "").toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
  }

  function getRole() {
    return String(window.ADA_CONTEXT?.rol || document.body.dataset.role || "").trim().toLowerCase();
  }

  function insertNavigation(role) {
    const page = currentPage();
    const available = MODULES.filter((item) => item.roles.includes(role));
    if (!available.length || document.querySelector(".ada-academic-suite")) return;

    const main = document.querySelector("main") || document.querySelector(".main-content") || document.querySelector(".content") || document.body;
    const anchor = main.querySelector(".page-header, .content-header, .hero, h1") || main.firstElementChild;
    const nav = document.createElement("section");
    nav.className = "ada-academic-suite";
    nav.setAttribute("aria-label", "Navegación académica");
    nav.innerHTML = `
      <div class="ada-academic-suite__head">
        <div>
          <span class="ada-academic-suite__eyebrow">ADA Gestión</span>
          <strong>Circuito académico</strong>
        </div>
        <button type="button" class="ada-academic-suite__toggle" aria-expanded="false">Módulos</button>
      </div>
      <nav class="ada-academic-suite__links">
        ${available.map((item) => `
          <a href="${escapeHtml(item.page)}" class="${item.page === page ? "is-active" : ""}" ${item.page === page ? 'aria-current="page"' : ""}>
            <span aria-hidden="true">${item.icon}</span><span>${escapeHtml(item.label)}</span>
          </a>`).join("")}
      </nav>`;

    if (anchor && anchor.parentNode === main) main.insertBefore(nav, anchor.nextSibling);
    else main.insertBefore(nav, main.firstChild);

    const toggle = nav.querySelector(".ada-academic-suite__toggle");
    const links = nav.querySelector(".ada-academic-suite__links");
    toggle?.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      links.hidden = !open && window.matchMedia("(max-width: 760px)").matches;
    });

    const media = window.matchMedia("(max-width: 760px)");
    const applyMedia = () => {
      if (!links) return;
      if (media.matches) {
        links.hidden = !nav.classList.contains("is-open");
        toggle.hidden = false;
      } else {
        links.hidden = false;
        toggle.hidden = true;
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    };
    media.addEventListener?.("change", applyMedia);
    applyMedia();
  }

  async function boot() {
    let tries = 0;
    while (!getRole() && tries < 40) {
      await new Promise((resolve) => setTimeout(resolve, 75));
      tries += 1;
    }
    const role = getRole();
    if (role) insertNavigation(role);
  }

  document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
