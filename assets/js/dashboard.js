// ADA Cloud Web - Dashboard integrado por rol
// Requiere ada-security.js cargado previamente.

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
    label: "Administrador",
    title: "Panel administrador",
    description: "Acceso completo a módulos, usuarios, estructura, reportes, seguridad, IA y configuración institucional.",
    modules: ["institucion", "usuarios", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "ia", "horarios", "asistencia", "reportes", "comunicados", "importar", "manuscritos"]
  },
  directivo: {
    label: "Directivo",
    title: "Panel directivo",
    description: "Gestión institucional, seguimiento pedagógico, reportes, comunicados, documentos e IA.",
    modules: ["institucion", "directivos", "secretaria", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "ia", "horarios", "asistencia", "reportes", "comunicados", "manuscritos"]
  },
  secretaria: {
    label: "Secretaría",
    title: "Panel de secretaría",
    description: "Administración escolar, usuarios, documentación, cursos, materias, asistencia y comunicados.",
    modules: ["institucion", "usuarios", "docentes", "preceptoria", "alumnos", "familias", "asignaciones", "cursos", "materias", "documentos", "asistencia", "reportes", "comunicados"]
  },
  docente: {
    label: "Docente",
    title: "Panel docente",
    description: "Espacio docente para cursos, alumnos, asistencia, documentos, comunicados e IA.",
    modules: ["mi-docente", "alumnos", "cursos", "materias", "documentos", "ia", "asistencia", "reportes", "comunicados", "manuscritos"]
  },
  preceptor: {
    label: "Preceptoría",
    title: "Panel de preceptoría",
    description: "Seguimiento de estudiantes, asistencia, familias, comunicados, alertas y reportes.",
    modules: ["mi-preceptor", "alumnos", "familias", "asignaciones", "cursos", "documentos", "ia", "asistencia", "reportes", "comunicados"]
  },
  familia: {
    label: "Familia",
    title: "Panel familia",
    description: "Acceso a hijos vinculados, asistencia, documentos, comunicados e IA.",
    modules: ["mi-familia", "documentos", "ia", "comunicados"]
  },
  alumno: {
    label: "Alumno",
    title: "Panel alumno",
    description: "Espacio de aprendizaje con materias, documentos, comunicados y ADA IA.",
    modules: ["mi-alumno", "documentos", "ia", "comunicados"]
  }
};

function aplicarDashboardPorRol(perfil) {
  const config = roleConfig[perfil.rol] || roleConfig.alumno;

  if (rolVisual) rolVisual.textContent = config.label;
  if (tituloRol) tituloRol.textContent = config.title;
  if (descripcionRol) descripcionRol.textContent = config.description;
  if (rolePill) rolePill.textContent = config.label;

  document.querySelectorAll("[data-module]").forEach((item) => {
    const moduleName = item.getAttribute("data-module");
    const permitido = config.modules.includes(moduleName);

    item.classList.toggle("module-disabled", !permitido);
    item.hidden = !permitido;
    item.setAttribute("aria-hidden", permitido ? "false" : "true");
    item.setAttribute("aria-disabled", permitido ? "false" : "true");

    if (!permitido && item.tagName.toLowerCase() === "a") {
      item.addEventListener("click", (event) => event.preventDefault(), { once: true });
    }
  });

  document.querySelectorAll(".dashboard-group").forEach((group) => {
    const visibles = group.querySelectorAll("[data-module]:not([hidden])").length;
    group.hidden = visibles === 0;
  });
}

async function cargarDashboard() {
  try {
    const contexto = await adaRequirePageAccess(["admin", "directivo", "secretaria", "docente", "preceptor", "familia", "alumno"]);
    if (!contexto) return;

    const perfil = contexto.perfil;
    aplicarDashboardPorRol(perfil);

    if (estadoSesion) estadoSesion.textContent = "Sesión iniciada correctamente.";
    if (datosUsuario) datosUsuario.style.display = "block";
    if (nombreUsuario) nombreUsuario.textContent = `${perfil.nombre || ""} ${perfil.apellido || ""}`.trim();
    if (emailUsuario) emailUsuario.textContent = perfil.email || "";
    if (rolUsuario) rolUsuario.textContent = perfil.rol || "";
  } catch (error) {
    console.warn("Carga de dashboard detenida:", error.message);
  }
}

if (btnSalir) {
  btnSalir.addEventListener("click", adaLogout);
}

cargarDashboard();
