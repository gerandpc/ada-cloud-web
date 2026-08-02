
function adaGoToPortal() {
  const path = window.location.pathname || "";
  const isInsidePages = path.includes("/pages/");
  window.location.href = isInsidePages ? "../index.html" : "index.html";
}


// ADA Cloud Web - Cierre de seguridad por rol
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

const ADA_PAGE_ACCESS = {
  "dashboard.html": ["admin", "directivo", "secretaria"],

  "institucion.html": ["admin", "directivo", "secretaria"],
  "usuarios.html": ["admin", "directivo", "secretaria"],
  "importar-usuarios.html": ["admin"],
  "importar-datos.html": ["admin"],
  "importar-excel.html": ["admin"],

  "directivos.html": ["admin", "directivo"],
  "secretaria.html": ["admin", "directivo", "secretaria"],
  "docentes.html": ["admin", "directivo", "secretaria"],
  "preceptoria.html": ["admin", "directivo", "secretaria", "preceptor"],
  "alumnos.html": ["admin", "directivo", "secretaria", "preceptor"],
  "familias.html": ["admin", "directivo", "secretaria", "preceptor"],

  "cursos.html": ["admin", "directivo", "secretaria", "preceptor", "docente"],
  "materias.html": ["admin", "directivo", "secretaria", "docente"],
  "asignaciones.html": ["admin", "directivo", "secretaria"],

  "documentos.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],
  "ia.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],

  "horarios.html": ["admin", "directivo", "secretaria"],
  "asistencia.html": ["admin", "directivo", "secretaria", "docente", "preceptor"],
  "reportes.html": ["admin", "directivo", "secretaria", "docente", "preceptor"],
  "inteligencia-institucional.html": ["admin", "directivo"],
  "comunicados.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],

  "mi-espacio-alumno.html": ["alumno"],
  "mi-espacio-familia.html": ["familia"],
  "mi-espacio-docente.html": ["docente"],
  "mi-espacio-preceptor.html": ["preceptor"],

  "convivencia.html": ["admin", "directivo", "secretaria", "preceptor"],
  "ficha-alumno.html": ["admin", "directivo", "secretaria", "preceptor", "docente"],
  "calificaciones.html": ["admin", "directivo", "secretaria", "docente"],
  "libro-calificaciones.html": ["admin", "directivo", "secretaria", "docente"],
  "planillas-secretaria.html": ["admin", "directivo", "secretaria"],
  "libres-materia.html": ["admin", "directivo", "secretaria", "preceptor"],
  "cierres-academicos.html": ["admin", "directivo", "secretaria"],
  "boletines-actas.html": ["admin", "directivo", "secretaria"],

  // Flujos pedagógicos y académicos
  "programas.html": ["admin", "directivo", "docente", "alumno", "familia"],
  "actividades.html": ["admin", "directivo", "docente", "alumno"],
  "entregas.html": ["admin", "directivo", "docente", "alumno"],
  "boletines.html": ["admin", "directivo", "secretaria", "alumno", "familia"],
  "documentacion.html": ["admin", "directivo", "secretaria", "preceptor", "familia", "alumno"],
  "auditoria.html": ["admin", "directivo"],
  "permisos.html": ["admin", "directivo"],
  "logs.html": ["admin"],
  "estado-sistema.html": ["admin", "directivo", "secretaria"],
  "mi-perfil.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],
  "ayuda.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],
  "acerca.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],
  "qa-final.html": ["admin", "directivo"]
};

const ADA_ROLE_HOME = {
  admin: "dashboard.html",
  directivo: "dashboard.html",
  secretaria: "secretaria.html",
  docente: "mi-espacio-docente.html",
  preceptor: "mi-espacio-preceptor.html",
  familia: "mi-espacio-familia.html",
  alumno: "mi-espacio-alumno.html"
};

const ADA_ROLE_MODULES = {
  admin: ["mi-perfil", "dashboard", "institucion", "usuarios", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "programas", "actividades", "entregas", "documentos", "documentacion", "ia", "horarios", "asistencia", "calificaciones", "libro-calificaciones", "planillas-secretaria", "libres-materia", "cierres-academicos", "boletines", "boletines-actas", "reportes", "inteligencia-institucional", "comunicados", "convivencia", "ficha-alumno", "importar", "auditoria", "permisos", "logs", "estado-sistema", "ayuda", "acerca", "qa-final"],
  directivo: ["mi-perfil", "dashboard", "institucion", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "programas", "actividades", "entregas", "documentos", "documentacion", "ia", "horarios", "asistencia", "calificaciones", "libro-calificaciones", "planillas-secretaria", "libres-materia", "cierres-academicos", "boletines", "boletines-actas", "reportes", "inteligencia-institucional", "comunicados", "convivencia", "ficha-alumno", "auditoria", "estado-sistema", "ayuda", "acerca", "qa-final"],
  secretaria: ["mi-perfil", "secretaria", "institucion", "usuarios", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "documentacion", "horarios", "asistencia", "calificaciones", "libro-calificaciones", "planillas-secretaria", "libres-materia", "cierres-academicos", "boletines", "boletines-actas", "reportes", "comunicados", "convivencia", "ficha-alumno", "estado-sistema", "ayuda", "acerca"],
  docente: ["mi-perfil", "mi-docente", "cursos", "materias", "programas", "actividades", "entregas", "documentos", "ia", "asistencia", "calificaciones", "libro-calificaciones", "reportes", "comunicados", "ficha-alumno", "ayuda", "acerca"],
  preceptor: ["mi-perfil", "mi-preceptor", "alumnos", "familias", "cursos", "documentos", "documentacion", "ia", "asistencia", "libres-materia", "reportes", "comunicados", "convivencia", "ficha-alumno", "ayuda", "acerca"],
  familia: ["mi-perfil", "mi-familia", "programas", "boletines", "documentos", "documentacion", "ia", "comunicados", "ayuda", "acerca"],
  alumno: ["mi-perfil", "mi-alumno", "programas", "actividades", "entregas", "boletines", "documentos", "documentacion", "ia", "comunicados", "ayuda", "acerca"]
};

function adaCurrentPageName() {
  const page = window.location.pathname.split("/").pop();
  return page || "dashboard.html";
}

function adaIsLoginOrIndex() {
  const page = adaCurrentPageName();
  return page === "../index.html" || page === "index.html" || page === "";
}

function adaNormalizeRole(rol) {
  return (rol || "alumno").toString().trim().toLowerCase();
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
}

function adaHideUnauthorizedModules(rol) {
  const normalized = adaNormalizeRole(rol);
  const allowedModules = ADA_ROLE_MODULES[normalized] || [];

  document.querySelectorAll("[data-module]").forEach((item) => {
    const moduleName = item.getAttribute("data-module");
    if (!allowedModules.includes(moduleName)) {
      item.classList.add("ada-hidden-by-role");
      item.setAttribute("hidden", "hidden");
      item.setAttribute("aria-hidden", "true");
      if (item.tagName.toLowerCase() === "a") {
        item.setAttribute("tabindex", "-1");
      }
    } else {
      item.classList.remove("ada-hidden-by-role");
      item.removeAttribute("hidden");
      item.removeAttribute("aria-hidden");
      item.removeAttribute("tabindex");
    }
  });

  document.querySelectorAll(".sidebar-section").forEach((section) => {
    const visibleLinks = section.querySelectorAll(".sidebar-submenu a:not([hidden])");
    if (visibleLinks.length === 0) {
      section.classList.add("ada-hidden-by-role");
      section.setAttribute("hidden", "hidden");
    } else {
      section.classList.remove("ada-hidden-by-role");
      section.removeAttribute("hidden");
    }
  });
}

async function adaLogout() {
  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error("Error cerrando sesión:", error);
  }

  try {
    localStorage.removeItem("supabase.auth.token");
    sessionStorage.clear();
  } catch (storageError) {
    console.warn("No se pudo limpiar storage local:", storageError);
  }

  adaGoToPortal();
}

function adaGetModuleLabel(moduleName) {
  const labels = {
    dashboard: "Inicio",
    "mi-docente": "Mi espacio docente",
    "mi-preceptor": "Mi espacio preceptor",
    "mi-familia": "Mi espacio familia",
    "mi-alumno": "Mi espacio alumno",
    institucion: "Institución",
    usuarios: "Usuarios",
    directivos: "Directivos",
    secretaria: "Secretaría",
    docentes: "Docentes",
    preceptoria: "Preceptoría",
    alumnos: "Alumnos",
    familias: "Familias",
    asignaciones: "Asignaciones",
    cursos: "Cursos",
    materias: "Materias",
    programas: "Programas",
    actividades: "Actividades",
    entregas: "Entregas",
    boletines: "Boletines",
    documentacion: "Documentación",
    documentos: "Documentos",
    ia: "ADA IA",
    horarios: "Horarios",
    asistencia: "Asistencia",
    calificaciones: "Calificaciones",
    "libro-calificaciones": "Libro de calificaciones",
    "planillas-secretaria": "Planillas Secretaría",
    "libres-materia": "Libres por materia",
    reportes: "Reportes",
    "inteligencia-institucional": "Inteligencia institucional",
    "cierres-academicos": "Cierres académicos",
    "boletines-actas": "Boletines y actas",
    comunicados: "Comunicados",
    convivencia: "Convivencia",
    "ficha-alumno": "Ficha integral",
    manuscritos: "Manuscritos",
    importar: "Importaciones",
    auditoria: "Auditoría",
    permisos: "Permisos y accesos",
    logs: "Logs",
    "estado-sistema": "Estado del sistema",
    "mi-perfil": "Mi perfil",
    ayuda: "Ayuda",
    acerca: "Acerca de ADA",
    "qa-final": "Control de calidad"
  };
  return labels[moduleName] || moduleName;
}

function adaModuleToHref(moduleName, rol) {
  const homeByModule = {
    dashboard: "dashboard.html",
    "mi-docente": "mi-espacio-docente.html",
    "mi-preceptor": "mi-espacio-preceptor.html",
    "mi-familia": "mi-espacio-familia.html",
    "mi-alumno": "mi-espacio-alumno.html",
    institucion: "institucion.html",
    usuarios: "usuarios.html",
    directivos: "directivos.html",
    secretaria: "secretaria.html",
    docentes: "docentes.html",
    preceptoria: "preceptoria.html",
    alumnos: "alumnos.html",
    familias: "familias.html",
    asignaciones: "asignaciones.html",
    cursos: "cursos.html",
    materias: "materias.html",
    programas: "programas.html",
    actividades: "actividades.html",
    entregas: "entregas.html",
    boletines: "boletines.html",
    documentacion: "documentacion.html",
    documentos: "documentos.html",
    ia: "ia.html",
    horarios: "horarios.html",
    asistencia: "asistencia.html",
    calificaciones: "calificaciones.html",
    "libro-calificaciones": "libro-calificaciones.html",
    "planillas-secretaria": "planillas-secretaria.html",
    "libres-materia": "libres-materia.html",
    reportes: "reportes.html",
    "inteligencia-institucional": "inteligencia-institucional.html",
    "cierres-academicos": "cierres-academicos.html",
    "boletines-actas": "boletines-actas.html",
    comunicados: "comunicados.html",
    convivencia: "convivencia.html",
    "ficha-alumno": "ficha-alumno.html",
    manuscritos: "manuscritos.html",
    importar: "importar-usuarios.html",
    auditoria: "auditoria.html",
    permisos: "permisos.html",
    logs: "logs.html",
    "estado-sistema": "estado-sistema.html",
    "mi-perfil": "mi-perfil.html",
    ayuda: "ayuda.html",
    acerca: "acerca.html",
    "qa-final": "qa-final.html"
  };
  return homeByModule[moduleName] || (ADA_ROLE_HOME[rol] || "dashboard.html");
}

function adaBindExistingSidebar(perfil) {
  if (adaIsLoginOrIndex()) return false;

  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return false;

  const rol = adaNormalizeRole(perfil.rol);
  const home = ADA_ROLE_HOME[rol] || "dashboard.html";
  const page = adaCurrentPageName();

  document.body.classList.add("dashboard-body", "ada-with-sidebar");

  // Ajusta Inicio y enlaces activos aunque el menú sea estático en el HTML.
  sidebar.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle("active", href === page);
  });

  const homeLinks = sidebar.querySelectorAll("[data-home-link]");
  homeLinks.forEach((link) => {
    link.href = home;
  });

  sidebar.querySelectorAll(".sidebar-logout, [data-logout]").forEach((button) => {
    if (button.dataset.adaBound === "1") return;
    button.dataset.adaBound = "1";
    button.addEventListener("click", adaLogout);
  });

  const backLink = document.querySelector(".back-link");
  if (backLink) {
    backLink.href = home;
    backLink.textContent = "← Mi inicio";
  }

  adaHideUnauthorizedModules(rol);
  window.dispatchEvent(new CustomEvent("ada:role-applied", { detail: { rol } }));
  return true;
}

function adaInjectRoleSidebar(perfil) {
  if (adaIsLoginOrIndex()) return;
  if (adaBindExistingSidebar(perfil)) return;

  const rol = adaNormalizeRole(perfil.rol);
  const allowed = ADA_ROLE_MODULES[rol] || [];
  const page = adaCurrentPageName();
  const home = ADA_ROLE_HOME[rol] || "dashboard.html";

  const groups = [
    { title: "Inicio", modules: allowed.filter(m => m.startsWith("mi-") || m === "dashboard") },
    { title: "Trabajo diario", modules: allowed.filter(m => ["programas", "actividades", "entregas", "asistencia", "calificaciones", "libro-calificaciones", "libres-materia", "cierres-academicos", "boletines", "boletines-actas", "alumnos", "cursos", "materias", "documentos", "documentacion", "comunicados"].includes(m)) },
    { title: "Gestión", modules: allowed.filter(m => ["institucion", "usuarios", "planillas-secretaria", "directivos", "secretaria", "docentes", "preceptoria", "familias", "asignaciones", "importar"].includes(m)) },
    { title: "Herramientas ADA", modules: allowed.filter(m => ["ia", "cierres-academicos", "boletines-actas", "reportes", "horarios", "auditoria", "permisos", "logs", "estado-sistema", "qa-final", "ayuda", "acerca"].includes(m)) }
  ].filter(g => g.modules.length > 0);

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar ada-role-sidebar";
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <h2>ADA</h2>
      <span>${adaGetModuleLabel(allowed.find(m => m.startsWith("mi-")) || "dashboard")}</span>
    </div>
    <nav class="sidebar-nav">
      <a href="${home}" class="sidebar-link ${page === home ? "active" : ""}">Inicio</a>
      ${groups.map(group => `
        <div class="sidebar-section">
          <button class="sidebar-section-button" type="button">${group.title} <span class="chevron">›</span></button>
          <div class="sidebar-submenu">
            ${group.modules.map(m => {
              const href = adaModuleToHref(m, rol);
              return `<a href="${href}" data-module="${m}" class="${page === href ? "active" : ""}">${adaGetModuleLabel(m)}</a>`;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </nav>
    <button type="button" class="sidebar-logout" id="adaSidebarLogout">Cerrar sesión</button>
  `;

  document.body.insertBefore(sidebar, document.body.firstChild);
  document.body.classList.add("dashboard-body", "ada-with-sidebar");

  window.dispatchEvent(new CustomEvent("ada:role-applied", { detail: { rol } }));

  const logout = sidebar.querySelector("#adaSidebarLogout");
  if (logout) logout.addEventListener("click", adaLogout);

  const backLink = document.querySelector(".back-link");
  if (backLink) {
    backLink.href = home;
    backLink.textContent = "← Mi inicio";
  }
}

function adaInjectAccountAccess(perfil) {
  if (adaIsLoginOrIndex() || adaCurrentPageName() === "mi-perfil.html") return;
  if (document.querySelector(".ada-account-access")) return;

  const link = document.createElement("a");
  link.href = "mi-perfil.html";
  link.className = "ada-account-access";
  link.setAttribute("aria-label", "Abrir mi perfil");
  link.title = "Mi perfil y seguridad";
  const initials = `${perfil?.nombre || ""} ${perfil?.apellido || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "U";
  link.innerHTML = `<span class="ada-account-avatar">${initials}</span><span class="ada-account-label">Mi perfil</span>`;
  document.body.appendChild(link);
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


function adaBuildAccessDenied(perfil, pagina) {
  const rol = adaNormalizeRole(perfil.rol);
  document.body.classList.remove("role-loading");
  adaApplyRoleTheme(rol);

  document.body.innerHTML = `
    <main class="module-shell">
      <section class="module-view">
        <div class="panel-card access-denied-card">
          <p class="eyebrow">Acceso restringido</p>
          <h1>No tenés permiso para acceder a esta pantalla</h1>
          <p>Tu rol actual es <strong>${rol}</strong> y la página solicitada es <strong>${pagina}</strong>.</p>
          <p class="helper-text">Este acceso queda bloqueado por seguridad. Desde el menú solo deben mostrarse las pantallas habilitadas para tu rol.</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;">
            <a class="btn-primary" href="${ADA_ROLE_HOME[rol] || "dashboard.html"}">Ir a mi inicio</a>
            <button class="btn-secondary" onclick="adaLogout()">Cerrar sesión</button>
          </div>
        </div>
      </section>
    </main>
  `;
  adaInjectGlobalLogout(perfil);
}

async function adaGetSessionAndProfile() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    adaGoToPortal();
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
    adaGoToPortal();
    return null;
  }

  perfil.rol = adaNormalizeRole(perfil.rol);

  if (!perfil.activo) {
    document.body.classList.remove("role-loading");
    adaApplyRoleTheme(perfil.rol);
    document.body.innerHTML = `
      <main class="module-shell">
        <section class="module-view">
          <div class="panel-card access-denied-card">
            <p class="eyebrow">Usuario inactivo</p>
            <h1>Tu usuario está inactivo</h1>
            <p>Contactá al administrador institucional para solicitar la reactivación.</p>
            <button class="btn-primary" onclick="adaLogout()">Cerrar sesión</button>
          </div>
        </section>
      </main>
    `;
    return null;
  }

  adaApplyRoleTheme(perfil.rol);
  adaInjectRoleSidebar(perfil);
  adaHideUnauthorizedModules(perfil.rol);
  adaInjectGlobalLogout(perfil);
  adaInjectAccountAccess(perfil);

  return { session, perfil };
}

async function adaRequirePageAccess(customAllowedRoles = null) {
  const contexto = await adaGetSessionAndProfile();
  if (!contexto) return null;

  const page = adaCurrentPageName();
  const rol = contexto.perfil.rol;

  // Los roles operativos no deben caer en el dashboard institucional completo.
  // Su inicio real es su espacio propio.
  if (page === "dashboard.html" && ADA_ROLE_HOME[rol] && ADA_ROLE_HOME[rol] !== "dashboard.html") {
    window.location.replace(ADA_ROLE_HOME[rol]);
    return null;
  }

  const allowedRoles = customAllowedRoles || ADA_PAGE_ACCESS[page];

  // Seguridad por defecto: toda página no declarada queda bloqueada.
  if (!Array.isArray(allowedRoles) || !allowedRoles.includes(rol)) {
    console.warn(`[ADA SECURITY] Acceso denegado. Página: ${page}; rol: ${rol}; regla:`, allowedRoles);
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
window.adaInjectAccountAccess = adaInjectAccountAccess;
window.ADA_ROLE_HOME = ADA_ROLE_HOME;
window.ADA_ROLE_MODULES = ADA_ROLE_MODULES;
window.ADA_PAGE_ACCESS = ADA_PAGE_ACCESS;
function adaLoadFinalRuntime() {
  if (!document.querySelector('link[data-ada-final="1"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../assets/css/ada-final.css";
    link.dataset.adaFinal = "1";
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-ada-final="1"]')) {
    const script = document.createElement("script");
    script.src = "../assets/js/ada-final.js";
    script.defer = true;
    script.dataset.adaFinal = "1";
    document.head.appendChild(script);
  }
}

adaLoadFinalRuntime();

