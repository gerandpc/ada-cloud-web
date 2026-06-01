
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
  admin: ["dashboard", "institucion", "usuarios", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "ia", "horarios", "asistencia", "reportes", "comunicados", "importar", "manuscritos"],
  directivo: ["dashboard", "institucion", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "ia", "horarios", "asistencia", "reportes", "comunicados", "manuscritos"],
  secretaria: ["dashboard", "institucion", "usuarios", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "asistencia", "reportes", "comunicados"],
  docente: ["mi-docente", "alumnos", "cursos", "materias", "documentos", "ia", "asistencia", "reportes", "comunicados", "manuscritos"],
  preceptor: ["mi-preceptor", "alumnos", "familias", "asignaciones", "cursos", "documentos", "ia", "asistencia", "reportes", "comunicados"],
  familia: ["mi-familia", "documentos", "ia", "comunicados"],
  alumno: ["mi-alumno", "documentos", "ia", "comunicados"]
};

function adaCurrentPageName() {
  const page = window.location.pathname.split("/").pop();
  return page || "dashboard.html";
}

function adaIsLoginOrIndex() {
  const page = adaCurrentPageName();
  return page === "login.html" || page === "index.html" || page === "";
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
  window.location.href = "login.html";
}

function adaInjectGlobalLogout(perfil) {
  if (adaIsLoginOrIndex()) return;
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
    window.location.replace("login.html");
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
    window.location.replace("login.html");
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
  adaHideUnauthorizedModules(perfil.rol);
  adaInjectGlobalLogout(perfil);

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
