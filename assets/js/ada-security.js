// ADA Cloud Web - Bloque 24
// Base visual, navegación y permisos por rol.
// Debe cargarse después de supabase-config.js y antes del JS propio de cada página.

const ADA_ROLE_CLASS_MAP = {
  admin: "role-admin",
  directivo: "role-directivo",
  secretaria: "role-secretaria",
  docente: "role-docente",
  preceptor: "role-preceptor",
  familia: "role-familia",
  alumno: "role-alumno"
};

const ADA_ROLE_LABELS = {
  admin: "Administrador",
  directivo: "Directivo",
  secretaria: "Secretaría",
  docente: "Docente",
  preceptor: "Preceptoría",
  familia: "Familia",
  alumno: "Alumno"
};

const ADA_ROLE_ICONS = {
  admin: "⚙️",
  directivo: "🏫",
  secretaria: "🗂️",
  docente: "👩‍🏫",
  preceptor: "📋",
  familia: "👨‍👩‍👧",
  alumno: "🎒"
};

const ADA_PAGE_ACCESS = {
  "dashboard.html": ["admin", "directivo", "secretaria"],
  "calificaciones.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],
  "boletines.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],
  "actividades.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],
  "entregas.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],
  "programas.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],

  "institucion.html": ["admin", "directivo", "secretaria"],
  "usuarios.html": ["admin", "directivo", "secretaria"],
  "importar-usuarios.html": ["admin"],
  "importar-datos.html": ["admin"],
  "importar-excel.html": ["admin"],

  "directivos.html": ["admin", "directivo"],
  "secretaria.html": ["admin", "directivo", "secretaria"],
  "docentes.html": ["admin", "directivo", "secretaria"],
  "preceptoria.html": ["admin", "directivo", "secretaria", "preceptor"],
  "alumnos.html": ["admin", "directivo", "secretaria", "preceptor", "docente"],
  "familias.html": ["admin", "directivo", "secretaria", "preceptor"],

  "cursos.html": ["admin", "directivo", "secretaria", "preceptor", "docente"],
  "materias.html": ["admin", "directivo", "secretaria", "docente"],
  "asignaciones.html": ["admin", "directivo", "secretaria", "preceptor"],

  "documentos.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],
  "ia.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],

  "horarios.html": ["admin", "directivo", "secretaria"],
  "asistencia.html": ["admin", "directivo", "secretaria", "docente", "preceptor"],
  "reportes.html": ["admin", "directivo", "secretaria", "docente", "preceptor"],
  "comunicados.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],

  "mi-espacio-alumno.html": ["alumno"],
  "mi-espacio-familia.html": ["familia"],
  "mi-espacio-docente.html": ["docente"],
  "mi-espacio-preceptor.html": ["preceptor"],

  "manuscritos.html": ["admin", "directivo", "secretaria", "docente"]
};

const ADA_ROLE_HOME = {
  admin: "dashboard.html",
  directivo: "dashboard.html",
  secretaria: "dashboard.html",
  docente: "mi-espacio-docente.html",
  preceptor: "mi-espacio-preceptor.html",
  familia: "mi-espacio-familia.html",
  alumno: "mi-espacio-alumno.html"
};

const ADA_ROLE_MODULES = {
  admin: ["dashboard", "institucion", "usuarios", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "ia", "horarios", "asistencia", "calificaciones", "boletines", "actividades", "entregas", "programas", "reportes", "comunicados", "importar", "manuscritos"],
  directivo: ["dashboard", "institucion", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "ia", "horarios", "asistencia", "calificaciones", "boletines", "actividades", "entregas", "programas", "reportes", "comunicados", "manuscritos"],
  secretaria: ["dashboard", "institucion", "usuarios", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "asistencia", "calificaciones", "boletines", "actividades", "entregas", "programas", "reportes", "comunicados"],
  docente: ["mi-docente", "asistencia", "calificaciones", "boletines", "actividades", "entregas", "programas", "alumnos", "cursos", "materias", "documentos", "comunicados", "ia", "reportes", "manuscritos"],
  preceptor: ["mi-preceptor", "asistencia", "calificaciones", "boletines", "actividades", "entregas", "programas", "alumnos", "familias", "cursos", "documentos", "comunicados", "ia", "reportes"],
  familia: ["mi-familia", "calificaciones", "boletines", "actividades", "entregas", "programas", "comunicados", "documentos", "ia"],
  alumno: ["mi-alumno", "calificaciones", "boletines", "actividades", "entregas", "programas", "comunicados", "documentos", "ia"]
};

const ADA_MODULES = {
  dashboard: { label: "Inicio institucional", icon: "🏠", href: "dashboard.html", group: "Inicio" },
  "mi-docente": { label: "Mi espacio docente", icon: "👩‍🏫", href: "mi-espacio-docente.html", group: "Inicio" },
  "mi-preceptor": { label: "Mi espacio preceptor", icon: "📋", href: "mi-espacio-preceptor.html", group: "Inicio" },
  "mi-familia": { label: "Mi espacio familia", icon: "👨‍👩‍👧", href: "mi-espacio-familia.html", group: "Inicio" },
  "mi-alumno": { label: "Mi espacio alumno", icon: "🎒", href: "mi-espacio-alumno.html", group: "Inicio" },

  institucion: { label: "Institución", icon: "🏫", href: "institucion.html", group: "Gestión institucional" },
  usuarios: { label: "Usuarios", icon: "👥", href: "usuarios.html", group: "Gestión institucional" },
  directivos: { label: "Directivos", icon: "🧭", href: "directivos.html", group: "Gestión institucional" },
  secretaria: { label: "Secretaría", icon: "🗂️", href: "secretaria.html", group: "Gestión institucional" },
  docentes: { label: "Docentes", icon: "👩‍🏫", href: "docentes.html", group: "Gestión institucional" },
  preceptoria: { label: "Preceptoría", icon: "🧩", href: "preceptoria.html", group: "Gestión institucional" },
  alumnos: { label: "Alumnos", icon: "🎒", href: "alumnos.html", group: "Gestión escolar" },
  familias: { label: "Familias", icon: "👨‍👩‍👧", href: "familias.html", group: "Gestión escolar" },
  asignaciones: { label: "Asignaciones", icon: "🔗", href: "asignaciones.html", group: "Gestión escolar" },
  cursos: { label: "Cursos", icon: "📚", href: "cursos.html", group: "Gestión escolar" },
  materias: { label: "Materias", icon: "📘", href: "materias.html", group: "Gestión escolar" },

  asistencia: { label: "Asistencia", icon: "✅", href: "asistencia.html", group: "Trabajo diario" },
  calificaciones: { label: "Calificaciones", icon: "📝", href: "calificaciones.html", group: "Trabajo diario" },
  boletines: { label: "Boletines", icon: "📑", href: "boletines.html", group: "Trabajo diario" },
  actividades: { label: "Actividades", icon: "🧩", href: "actividades.html", group: "Trabajo diario" },
  entregas: { label: "Entregas", icon: "📬", href: "entregas.html", group: "Trabajo diario" },
  programas: { label: "Programas y bibliografía", icon: "📚", href: "programas.html", group: "Trabajo diario" },
  comunicados: { label: "Comunicados", icon: "📣", href: "comunicados.html", group: "Trabajo diario" },
  documentos: { label: "Documentos", icon: "📄", href: "documentos.html", group: "Trabajo diario" },

  ia: { label: "ADA IA", icon: "🤖", href: "ia.html", group: "Herramientas ADA" },
  horarios: { label: "Horarios", icon: "🗓️", href: "horarios.html", group: "Herramientas ADA" },
  reportes: { label: "Reportes", icon: "📊", href: "reportes.html", group: "Herramientas ADA" },
  manuscritos: { label: "Manuscritos", icon: "✍️", href: "manuscritos.html", group: "Herramientas ADA" },
  importar: { label: "Importaciones", icon: "⬆️", href: "importar-usuarios.html", group: "Herramientas ADA" }
};

function adaCurrentPageName() {
  const page = window.location.pathname.split("/").pop();
  return page || "index.html";
}

function adaIsLoginOrIndex() {
  const page = adaCurrentPageName();
  return page === "login.html" || page === "index.html" || page === "";
}

function adaIsInsidePagesFolder() {
  return window.location.pathname.includes("/pages/");
}

function adaPortalHref() {
  return adaIsInsidePagesFolder() ? "../index.html" : "index.html";
}

function adaNormalizeRole(rol) {
  const value = (rol || "alumno").toString().trim().toLowerCase();
  if (value === "preceptoria") return "preceptor";
  return value;
}

function adaApplyRoleTheme(rol) {
  const normalized = adaNormalizeRole(rol);
  document.body.classList.remove(
    "role-loading",
    "role-admin",
    "role-directivo",
    "role-secretaria",
    "role-docente",
    "role-preceptor",
    "role-familia",
    "role-alumno"
  );
  document.body.classList.add(ADA_ROLE_CLASS_MAP[normalized] || "role-alumno");
  document.documentElement.setAttribute("data-ada-role", normalized);
}

function adaGetModuleLabel(moduleName) {
  return ADA_MODULES[moduleName]?.label || moduleName;
}

function adaGetModuleIcon(moduleName) {
  return ADA_MODULES[moduleName]?.icon || "•";
}

function adaModuleToHref(moduleName, rol) {
  return ADA_MODULES[moduleName]?.href || (ADA_ROLE_HOME[rol] || "dashboard.html");
}

function adaGetUserDisplayName(perfil) {
  const full = `${perfil?.nombre || ""} ${perfil?.apellido || ""}`.trim();
  return full || perfil?.email || "Usuario ADA";
}

function adaHideUnauthorizedModules(rol) {
  const normalized = adaNormalizeRole(rol);
  const allowedModules = ADA_ROLE_MODULES[normalized] || [];

  document.querySelectorAll("[data-module]").forEach((item) => {
    const moduleName = item.getAttribute("data-module");
    const allowed = allowedModules.includes(moduleName);
    item.classList.toggle("ada-hidden-by-role", !allowed);
    if (!allowed) {
      item.setAttribute("hidden", "hidden");
      item.setAttribute("aria-hidden", "true");
      item.setAttribute("tabindex", "-1");
    } else {
      item.removeAttribute("hidden");
      item.removeAttribute("aria-hidden");
      item.removeAttribute("tabindex");
    }
  });

  document.querySelectorAll(".sidebar-section").forEach((section) => {
    const visibleLinks = section.querySelectorAll(".sidebar-submenu a:not([hidden])");
    const hide = visibleLinks.length === 0;
    section.classList.toggle("ada-hidden-by-role", hide);
    if (hide) section.setAttribute("hidden", "hidden");
    else section.removeAttribute("hidden");
  });
}

async function adaLogout() {
  try {
    sessionStorage.setItem("ada_force_portal", "1");
  } catch (e) {}

  try {
    if (window.supabaseClient?.auth) {
      await supabaseClient.auth.signOut({ scope: "global" });
    }
  } catch (error) {
    console.warn("No se pudo cerrar globalmente, se limpia sesión local:", error);
    try {
      if (window.supabaseClient?.auth) await supabaseClient.auth.signOut({ scope: "local" });
    } catch (e) {}
  }

  // Limpieza defensiva de tokens locales de Supabase para evitar que el portal reabra admin.
  try {
    Object.keys(localStorage).forEach((key) => {
      const k = key.toLowerCase();
      if (k.includes("supabase") || k.includes("sb-")) localStorage.removeItem(key);
    });
    Object.keys(sessionStorage).forEach((key) => {
      const k = key.toLowerCase();
      if (k.includes("supabase") || k.includes("sb-")) sessionStorage.removeItem(key);
    });
    sessionStorage.setItem("ada_force_portal", "1");
  } catch (e) {}

  window.location.replace(adaPortalHref() + "?logout=1");
}

function adaBindLogoutButtons() {
  document.querySelectorAll(".sidebar-logout, [data-logout], .ada-global-logout").forEach((button) => {
    if (button.dataset.adaBound === "1") return;
    button.dataset.adaBound = "1";
    button.addEventListener("click", adaLogout);
  });
}

function adaToggleSidebar(open) {
  document.body.classList.toggle("ada-sidebar-open", Boolean(open));
}

function adaEnsureMobileMenuButton() {
  if (adaIsLoginOrIndex()) return;
  if (document.querySelector(".ada-menu-toggle")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ada-menu-toggle";
  button.setAttribute("aria-label", "Abrir o cerrar menú ADA");
  button.innerHTML = "☰ <span>Menú</span>";
  button.addEventListener("click", () => adaToggleSidebar(!document.body.classList.contains("ada-sidebar-open")));
  document.body.appendChild(button);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") adaToggleSidebar(false);
  });
}

function adaBuildSidebarGroups(rol) {
  const allowed = ADA_ROLE_MODULES[rol] || [];
  const order = ["Inicio", "Trabajo diario", "Gestión institucional", "Gestión escolar", "Herramientas ADA"];

  return order.map((groupName) => {
    const modules = allowed.filter((moduleName) => ADA_MODULES[moduleName]?.group === groupName);
    return { title: groupName, modules };
  }).filter((group) => group.modules.length > 0);
}

function adaInjectRoleSidebar(perfil) {
  if (adaIsLoginOrIndex()) return;

  const rol = adaNormalizeRole(perfil.rol);
  const page = adaCurrentPageName();
  const groups = adaBuildSidebarGroups(rol);
  const displayName = adaGetUserDisplayName(perfil);

  document.querySelectorAll("aside.sidebar").forEach((existing) => existing.remove());

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar ada-role-sidebar";
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="ada-sidebar-mark">ADA</div>
      <div>
        <h2>ADA</h2>
        <span>Cloud Web</span>
      </div>
    </div>

    <div class="ada-sidebar-user">
      <div class="ada-sidebar-avatar">${ADA_ROLE_ICONS[rol] || "👤"}</div>
      <div>
        <strong>${displayName}</strong>
        <small>${ADA_ROLE_LABELS[rol] || rol}</small>
      </div>
    </div>

    <nav class="sidebar-nav" aria-label="Navegación principal ADA">
      ${groups.map((group) => `
        <div class="sidebar-section open">
          <button class="sidebar-section-button" type="button">${group.title}<span class="chevron">›</span></button>
          <div class="sidebar-submenu">
            ${group.modules.map((moduleName) => {
              const href = adaModuleToHref(moduleName, rol);
              const active = page === href ? "active" : "";
              return `<a href="${href}" data-module="${moduleName}" class="${active}"><span class="ada-nav-icon">${adaGetModuleIcon(moduleName)}</span><span>${adaGetModuleLabel(moduleName)}</span></a>`;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </nav>

    <div class="ada-sidebar-footer">
      <button type="button" class="sidebar-logout" data-logout>Cerrar sesión</button>
    </div>
  `;

  document.body.insertBefore(sidebar, document.body.firstChild);
  document.body.classList.add("dashboard-body", "ada-with-sidebar");

  sidebar.querySelectorAll(".sidebar-section-button").forEach((button) => {
    button.addEventListener("click", () => button.closest(".sidebar-section").classList.toggle("open"));
  });

  sidebar.querySelectorAll(".sidebar-submenu a").forEach((link) => {
    link.addEventListener("click", () => adaToggleSidebar(false));
  });

  const backLink = document.querySelector(".back-link");
  if (backLink) {
    backLink.href = ADA_ROLE_HOME[rol] || "dashboard.html";
    backLink.textContent = "← Mi inicio";
  }

  adaHideUnauthorizedModules(rol);
  adaEnsureMobileMenuButton();
  adaBindLogoutButtons();
}

function adaInjectGlobalLogout(perfil) {
  if (adaIsLoginOrIndex()) return;
  if (document.querySelector(".sidebar")) return;
  if (document.querySelector(".ada-global-logout")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ada-global-logout";
  btn.textContent = "Cerrar sesión";
  btn.title = "Cerrar sesión";
  btn.addEventListener("click", adaLogout);
  document.body.appendChild(btn);
}

function adaApplyBasePolish(perfil) {
  if (adaIsLoginOrIndex()) return;
  document.querySelectorAll(".module-view, .panel-card, .dashboard-header, .role-banner").forEach((el) => {
    el.classList.add("ada-surface");
  });
  document.querySelectorAll("table").forEach((table) => {
    if (!table.classList.contains("ada-table")) table.classList.add("ada-table");
  });
}

function adaBuildAccessDenied(perfil, pagina) {
  window.ADA_ACCESS_DENIED = true;
  const rol = adaNormalizeRole(perfil.rol);
  adaApplyRoleTheme(rol);

  document.body.innerHTML = `
    <main class="module-shell ada-access-denied-shell">
      <section class="module-view access-denied-card">
        <p class="eyebrow">Acceso restringido</p>
        <h1>No tenés permiso para acceder a esta pantalla</h1>
        <p>Tu rol actual es <strong>${ADA_ROLE_LABELS[rol] || rol}</strong> y la página solicitada es <strong>${pagina}</strong>.</p>
        <p class="helper-text">Este bloqueo solo aparece si se intenta ingresar por URL directa. Desde el menú ADA solo se muestran las pantallas habilitadas para tu rol.</p>
        <div class="ada-action-row">
          <a class="btn-primary" href="${ADA_ROLE_HOME[rol] || "dashboard.html"}">Ir a mi inicio</a>
          <button class="btn-secondary" type="button" data-logout>Cerrar sesión</button>
        </div>
      </section>
    </main>
  `;
  adaInjectRoleSidebar(perfil);
  adaBindLogoutButtons();
}

function adaBuildInactiveUser(perfil) {
  const rol = adaNormalizeRole(perfil.rol);
  adaApplyRoleTheme(rol);
  document.body.innerHTML = `
    <main class="module-shell ada-access-denied-shell">
      <section class="module-view access-denied-card">
        <p class="eyebrow">Usuario inactivo</p>
        <h1>Tu usuario está inactivo</h1>
        <p>Contactá al administrador institucional para solicitar la reactivación.</p>
        <button class="btn-primary" type="button" data-logout>Cerrar sesión</button>
      </section>
    </main>
  `;
  adaBindLogoutButtons();
}

async function adaGetSessionAndProfile() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    window.location.replace(adaPortalHref());
    return null;
  }

  const session = sessionData.session;

  const { data: perfil, error: perfilError } = await supabaseClient
    .from("profiles")
    .select("id, nombre, apellido, email, rol, activo")
    .eq("id", session.user.id)
    .single();

  if (perfilError || !perfil) {
    console.error("No se encontró perfil:", perfilError);
    await supabaseClient.auth.signOut();
    window.location.replace(adaPortalHref());
    return null;
  }

  perfil.rol = adaNormalizeRole(perfil.rol);

  if (!perfil.activo) {
    adaBuildInactiveUser(perfil);
    return null;
  }

  adaApplyRoleTheme(perfil.rol);
  adaInjectRoleSidebar(perfil);
  adaHideUnauthorizedModules(perfil.rol);
  adaInjectGlobalLogout(perfil);
  adaApplyBasePolish(perfil);

  return { session, perfil };
}

async function adaRequirePageAccess(customAllowedRoles = null) {
  const contexto = await adaGetSessionAndProfile();
  if (!contexto) return null;

  const page = adaCurrentPageName();
  const rol = contexto.perfil.rol;

  if (page === "dashboard.html" && ADA_ROLE_HOME[rol] && ADA_ROLE_HOME[rol] !== "dashboard.html") {
    window.location.replace(ADA_ROLE_HOME[rol]);
    return null;
  }

  const allowedRoles = customAllowedRoles || ADA_PAGE_ACCESS[page];
  if (allowedRoles && !allowedRoles.includes(rol)) {
    adaBuildAccessDenied(contexto.perfil, page);
    return null;
  }

  document.body.classList.add("ada-page-ready");
  return contexto;
}

async function obtenerSesionPerfil() {
  return await adaRequirePageAccess();
}

window.adaLogout = adaLogout;
window.adaRequirePageAccess = adaRequirePageAccess;
window.adaGetSessionAndProfile = adaGetSessionAndProfile;
window.obtenerSesionPerfil = obtenerSesionPerfil;
window.adaHideUnauthorizedModules = adaHideUnauthorizedModules;
window.ADA_ROLE_HOME = ADA_ROLE_HOME;
window.ADA_ROLE_MODULES = ADA_ROLE_MODULES;
window.ADA_MODULES = ADA_MODULES;

// Aplicación automática para pantallas protegidas que no tienen JS propio.
document.addEventListener("DOMContentLoaded", () => {
  if (!adaIsLoginOrIndex() && document.body.classList.contains("role-loading")) {
    adaRequirePageAccess();
  }
});
