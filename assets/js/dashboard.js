// ADA Cloud Web - Dashboard institucional por rol
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
    description: "Resumen ejecutivo, aprobaciones académicas, seguimiento institucional, asistencia, cierres, boletines y reportes."
  },
  secretaria: {
    label: "Secretaría",
    title: "Panel de secretaría",
    description: "Administración escolar, documentación, cursos, materias, asistencia, calificaciones, cierres y boletines."
  }
};

function dSet(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "—";
}

function aplicarDashboardPorRol(perfil) {
  const config = roleConfig[perfil.rol] || roleConfig.secretaria;
  if (rolVisual) rolVisual.textContent = config.label;
  if (tituloRol) tituloRol.textContent = config.title;
  if (descripcionRol) descripcionRol.textContent = config.description;
  if (rolePill) rolePill.textContent = config.label;
  if (typeof adaHideUnauthorizedModules === "function") adaHideUnauthorizedModules(perfil.rol);
}

async function dCountProfiles(rol) {
  const { count, error } = await supabaseClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("rol", rol)
    .eq("activo", true);
  if (error) throw error;
  return count || 0;
}

async function dCountTable(table, configure) {
  let query = supabaseClient.from(table).select("id", { count: "exact", head: true });
  if (typeof configure === "function") query = configure(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

function dRenderPendientes(programas, cierres) {
  const box = document.getElementById("directivoPendientes");
  if (!box) return;
  const items = [
    {
      href: "programas.html",
      title: "Programas enviados a revisión",
      detail: programas ? "Hay decisiones pendientes de aprobación u observación." : "No hay programas pendientes.",
      value: programas,
      cls: programas ? "warn" : "ok"
    },
    {
      href: "cierres-academicos.html",
      title: "Cierres académicos pendientes",
      detail: cierres ? "Revisá períodos y cierres que aún no fueron finalizados." : "No se detectaron cierres pendientes.",
      value: cierres,
      cls: cierres ? "warn" : "ok"
    }
  ];
  box.innerHTML = items.map((item) => `
    <div class="directivo-item">
      <div><a href="${item.href}">${item.title}</a><p>${item.detail}</p></div>
      <span class="directivo-badge ${item.cls}">${item.value}</span>
    </div>
  `).join("");
}

async function cargarPanelDirectivo() {
  const section = document.getElementById("directivoExecutive");
  if (!section) return;
  section.hidden = false;
  const status = document.getElementById("directivoResumenEstado");
  try {
    const [alumnos, docentes, programas, cursos, cierres] = await Promise.all([
      dCountProfiles("alumno"),
      dCountProfiles("docente"),
      dCountTable("programas_materia", (q) => q.eq("estado", "pendiente")),
      dCountTable("cursos", (q) => q.eq("activo", true)),
      dCountTable("cierres_academicos", (q) => q.neq("estado", "cerrado"))
    ]);
    dSet("dirKpiAlumnos", alumnos);
    dSet("dirKpiDocentes", docentes);
    dSet("dirKpiProgramas", programas);
    dSet("dirKpiCursos", cursos);
    dRenderPendientes(programas, cierres);
    if (status) status.textContent = "Indicadores actualizados con la información disponible para tu perfil.";
  } catch (error) {
    console.error("No se pudo cargar el resumen directivo:", error);
    if (status) status.textContent = "El panel está disponible, pero uno o más indicadores no pudieron consultarse.";
    const box = document.getElementById("directivoPendientes");
    if (box) box.innerHTML = '<div class="directivo-alert error">No se pudieron cargar los pendientes. Verificá permisos RLS o la estructura de las tablas.</div>';
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
  if (perfil.rol === "directivo") await cargarPanelDirectivo();
}

if (btnSalir) btnSalir.addEventListener("click", adaLogout);
cargarDashboard();
