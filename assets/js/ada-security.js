
// ADA Cloud Web - Seguridad estable + logout global
// Cargar después de supabase-config.js y antes del JS propio de cada página.

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
  "dashboard.html": ["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"],

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

  "mi-espacio-alumno.html": ["admin", "directivo", "alumno"],
  "mi-espacio-familia.html": ["admin", "directivo", "familia"],
  "mi-espacio-docente.html": ["admin", "directivo", "docente"],
  "mi-espacio-preceptor.html": ["admin", "directivo", "preceptor"],

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

function adaCurrentPageName() {
  const page = window.location.pathname.split("/").pop();
  return page || "dashboard.html";
}

function adaApplyRoleTheme(rol) {
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

  document.body.classList.add(ADA_ROLE_CLASS_MAP[rol] || "role-alumno");
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
  const page = adaCurrentPageName();

  if (page === "login.html" || page === "index.html") return;
  if (document.querySelector(".ada-global-logout")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ada-global-logout";
  btn.textContent = "Cerrar sesión";
  btn.title = "Cerrar sesión";
  btn.addEventListener("click", adaLogout);

  document.body.appendChild(btn);
}

function adaShowAccessDenied(perfil, pagina) {
  document.body.classList.remove("role-loading");
  adaApplyRoleTheme(perfil.rol);

  document.body.innerHTML = `
    <main class="module-shell">
      <section class="module-view">
        <div class="panel-card" style="max-width:760px;margin:40px auto;">
          <p class="eyebrow">Acceso restringido</p>
          <h1>No tenés permiso para acceder a esta pantalla</h1>
          <p>
            Tu rol actual es <strong>${perfil.rol}</strong> y la página solicitada es
            <strong>${pagina}</strong>.
          </p>
          <p class="helper-text">
            Si creés que deberías tener acceso, consultá al administrador institucional.
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;">
            <a class="btn-primary" href="${ADA_ROLE_HOME[perfil.rol] || "dashboard.html"}">Ir a mi inicio</a>
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
    window.location.href = "login.html";
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
    window.location.href = "login.html";
    return null;
  }

  if (!perfil.activo) {
    document.body.classList.remove("role-loading");
    document.body.innerHTML = `
      <main class="module-shell">
        <section class="module-view">
          <div class="panel-card" style="max-width:760px;margin:40px auto;">
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
  adaInjectGlobalLogout(perfil);

  return { session, perfil };
}

async function adaRequirePageAccess(customAllowedRoles = null) {
  const contexto = await adaGetSessionAndProfile();
  if (!contexto) return null;

  const page = adaCurrentPageName();
  const allowedRoles = customAllowedRoles || ADA_PAGE_ACCESS[page];

  if (allowedRoles && !allowedRoles.includes(contexto.perfil.rol)) {
    adaShowAccessDenied(contexto.perfil, page);
    return null;
  }

  return contexto;
}

// Compatibilidad con módulos anteriores.
async function obtenerSesionPerfil() {
  return await adaRequirePageAccess();
}

window.adaLogout = adaLogout;
window.adaRequirePageAccess = adaRequirePageAccess;
window.adaGetSessionAndProfile = adaGetSessionAndProfile;
window.obtenerSesionPerfil = obtenerSesionPerfil;
