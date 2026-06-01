
// ADA Cloud Web - Dashboard institucional restringido
// Este dashboard queda reservado a admin, directivo y secretaría.

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
    description: "Acceso completo a módulos, usuarios, estructura, reportes, seguridad, IA y configuración institucional."
  },
  directivo: {
    label: "Directivo",
    title: "Panel directivo",
    description: "Gestión institucional, seguimiento pedagógico, reportes, comunicados, documentos e IA."
  },
  secretaria: {
    label: "Secretaría",
    title: "Panel de secretaría",
    description: "Administración escolar, usuarios, documentación, cursos, materias, asistencia y comunicados."
  }
};

function aplicarDashboardPorRol(perfil) {
  const config = roleConfig[perfil.rol] || roleConfig.secretaria;

  if (rolVisual) rolVisual.textContent = config.label;
  if (tituloRol) tituloRol.textContent = config.title;
  if (descripcionRol) descripcionRol.textContent = config.description;
  if (rolePill) rolePill.textContent = config.label;

  if (typeof adaHideUnauthorizedModules === "function") {
    adaHideUnauthorizedModules(perfil.rol);
  }
}

async function cargarDashboard() {
  const contexto = await adaRequirePageAccess(["admin", "directivo", "secretaria"]);
  if (!contexto) return;

  const perfil = contexto.perfil;
  aplicarDashboardPorRol(perfil);

  if (estadoSesion) estadoSesion.textContent = "Sesión iniciada correctamente.";
  if (datosUsuario) datosUsuario.style.display = "block";
  if (nombreUsuario) nombreUsuario.textContent = `${perfil.nombre || ""} ${perfil.apellido || ""}`.trim();
  if (emailUsuario) emailUsuario.textContent = perfil.email || "";
  if (rolUsuario) rolUsuario.textContent = perfil.rol || "";
}

if (btnSalir) {
  btnSalir.addEventListener("click", adaLogout);
}

cargarDashboard();
