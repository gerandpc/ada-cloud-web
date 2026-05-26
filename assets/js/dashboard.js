const estadoSesion = document.getElementById("estadoSesion");
const datosUsuario = document.getElementById("datosUsuario");
const nombreUsuario = document.getElementById("nombreUsuario");
const emailUsuario = document.getElementById("emailUsuario");
const rolUsuario = document.getElementById("rolUsuario");
const btnSalir = document.getElementById("btnSalir");
const rolVisual = document.getElementById("rolVisual");
const tituloRol = document.getElementById("tituloRol");
const descripcionRol = document.getElementById("descripcionRol");
const rolePill = document.getElementById("rolePill");

const roleConfig = {
  admin: {
    className: "role-admin",
    label: "Administrador",
    title: "Panel administrador",
    description: "Acceso completo a todos los usuarios, módulos, permisos, reportes, IA, horarios y configuración institucional.",
    modules: ["institucion", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "ia", "horarios", "manuscritos", "reportes"]
  },
  directivo: {
    className: "role-directivo",
    label: "Directivo",
    title: "Panel directivo",
    description: "Gestión institucional, seguimiento pedagógico, reportes, documentos y decisiones escolares.",
    modules: ["institucion", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "ia", "horarios", "reportes"]
  },
  secretaria: {
    className: "role-secretaria",
    label: "Secretaría",
    title: "Panel de secretaría",
    description: "Administración escolar, estudiantes, familias, docentes, cursos y documentación institucional.",
    modules: ["institucion", "docentes", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "reportes"]
  },
  docente: {
    className: "role-docente",
    label: "Docente",
    title: "Panel docente",
    description: "Cursos, materias, materiales, asistencia, trabajos, IA docente y seguimiento pedagógico.",
    modules: ["alumnos", "cursos", "materias", "documentos", "ia", "manuscritos", "reportes"]
  },
  preceptor: {
    className: "role-preceptor",
    label: "Preceptoría",
    title: "Panel de preceptoría",
    description: "Seguimiento de estudiantes, asistencia, comunicaciones y alertas institucionales.",
    modules: ["alumnos", "familias", "asignaciones", "cursos", "documentos", "ia", "reportes"]
  },
  familia: {
    className: "role-familia",
    label: "Familia",
    title: "Panel familia",
    description: "Acceso a comunicaciones, materiales habilitados, seguimiento y novedades del estudiante.",
    modules: ["familias", "alumnos", "documentos", "ia", "reportes"]
  },
  alumno: {
    className: "role-alumno",
    label: "Alumno",
    title: "Panel alumno",
    description: "Espacio de aprendizaje con materiales, actividades, asistencia inteligente y ADA Tutor.",
    modules: ["alumnos", "materias", "documentos", "ia"]
  }
};

function aplicarTemaPorRol(rol) {
  const config = roleConfig[rol] || roleConfig.alumno;

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

  document.body.classList.add(config.className);

  if (rolVisual) rolVisual.textContent = config.label;
  if (tituloRol) tituloRol.textContent = config.title;
  if (descripcionRol) descripcionRol.textContent = config.description;
  if (rolePill) rolePill.textContent = config.label;

  document.querySelectorAll("[data-module]").forEach((item) => {
    const moduleName = item.getAttribute("data-module");

    item.classList.remove("module-disabled");
    item.removeAttribute("aria-disabled");

    if (!config.modules.includes(moduleName)) {
      item.classList.add("module-disabled");
      item.setAttribute("aria-disabled", "true");

      if (item.tagName.toLowerCase() === "a") {
        item.addEventListener("click", (event) => {
          event.preventDefault();
        });
      }
    }
  });
}

async function cargarDashboard() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    estadoSesion.textContent = "Error al verificar la sesión.";
    return;
  }

  const session = sessionData.session;

  if (!session) {
    estadoSesion.textContent = "No hay sesión activa. Redirigiendo al login...";
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
    return;
  }

  const user = session.user;

  const { data: perfil, error: perfilError } = await supabaseClient
    .from("profiles")
    .select("nombre, apellido, email, rol, activo")
    .eq("id", user.id)
    .single();

  if (perfilError) {
    estadoSesion.textContent = "Sesión iniciada, pero no se encontró el perfil del usuario.";
    console.error(perfilError);
    return;
  }

  if (!perfil.activo) {
    estadoSesion.textContent = "Usuario inactivo. Contactá al administrador.";
    return;
  }

  aplicarTemaPorRol(perfil.rol);

  estadoSesion.textContent = "Sesión iniciada correctamente.";
  datosUsuario.style.display = "block";

  nombreUsuario.textContent = `${perfil.nombre} ${perfil.apellido}`;
  emailUsuario.textContent = perfil.email;
  rolUsuario.textContent = perfil.rol;
}

btnSalir.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

cargarDashboard();
