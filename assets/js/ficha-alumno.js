
let fichaPerfil = null;
let fichaAlumnos = [];
let fichaCursos = [];
let fichaAlumnoActual = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    fichaPerfil = await obtenerSesionPerfil();
    if (!fichaPerfil) return;
    setupFichaTabs();
    await cargarCatalogosFicha();
    bindFichaEvents();
    setMensajeFicha("Seleccioná un alumno para consultar la ficha integral.", "info");
  } catch (error) {
    console.error(error);
    setMensajeFicha(error.message || "No se pudo cargar la ficha integral.", "error");
  }
});

function bindFichaEvents() {
  document.getElementById("btnCargarFicha")?.addEventListener("click", cargarFichaSeleccionada);
  document.getElementById("selectorAlumno")?.addEventListener("change", cargarFichaSeleccionada);
  document.getElementById("busquedaAlumno")?.addEventListener("input", filtrarAlumnosFicha);
}

function setupFichaTabs() {
  document.querySelectorAll(".ficha-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".ficha-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".ficha-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab)?.classList.add("active");
    });
  });
}

async function cargarCatalogosFicha() {
  const [alumnosRes, cursosRes] = await Promise.all([
    safeSelect("alumnos", "id,nombre,apellido,email,documento,dni,curso_id,familia_id,activo,created_at", "apellido"),
    safeSelect("cursos", "id,nombre,anio,division,turno,nivel", "anio")
  ]);

  fichaAlumnos = alumnosRes || [];
  fichaCursos = cursosRes || [];

  // Para familia/alumno intentamos limitar visualmente si existen vínculos en el perfil.
  const rol = (fichaPerfil?.rol || "").toLowerCase();
  if (rol === "familia" && fichaPerfil.familia_id) {
    fichaAlumnos = fichaAlumnos.filter(a => String(a.familia_id || "") === String(fichaPerfil.familia_id));
  }
  if (rol === "alumno" && fichaPerfil.alumno_id) {
    fichaAlumnos = fichaAlumnos.filter(a => String(a.id || "") === String(fichaPerfil.alumno_id));
  }

  renderSelectorAlumnos(fichaAlumnos);
  if (fichaAlumnos.length === 1) {
    document.getElementById("selectorAlumno").value = fichaAlumnos[0].id;
    await cargarFichaSeleccionada();
  }
}

function renderSelectorAlumnos(lista) {
  const select = document.getElementById("selectorAlumno");
  if (!select) return;
  select.innerHTML = `<option value="">Seleccionar alumno...</option>` + lista.map(a => {
    const doc = a.documento || a.dni || "";
    return `<option value="${a.id}">${a.apellido || ""}, ${a.nombre || ""}${doc ? " · " + doc : ""}</option>`;
  }).join("");
}

function filtrarAlumnosFicha() {
  const q = (document.getElementById("busquedaAlumno")?.value || "").toLowerCase().trim();
  const filtrados = fichaAlumnos.filter(a => `${a.apellido || ""} ${a.nombre || ""} ${a.documento || ""} ${a.dni || ""}`.toLowerCase().includes(q));
  renderSelectorAlumnos(filtrados);
}

async function cargarFichaSeleccionada() {
  const id = document.getElementById("selectorAlumno")?.value;
  if (!id) return;
  fichaAlumnoActual = fichaAlumnos.find(a => String(a.id) === String(id));
  if (!fichaAlumnoActual) return;

  document.getElementById("fichaContenido")?.classList.remove("hidden");
  renderCabeceraAlumno(fichaAlumnoActual);

  const [notas, asistencia, actividades, documentacion, convivencia] = await Promise.all([
    cargarNotas(id),
    cargarAsistencia(id),
    cargarActividades(id),
    cargarDocumentacion(id),
    cargarConvivencia(id)
  ]);

  renderResumen(fichaAlumnoActual, notas, asistencia, actividades, documentacion, convivencia);
  renderTabla("tablaNotas", notas, n => `<tr><td>${n.materia_nombre || n.materia || "-"}</td><td>${n.evaluacion_nombre || n.evaluacion || "-"}</td><td>${n.nota ?? "-"}</td><td>${fecha(n.fecha || n.created_at)}</td><td>${n.observacion || ""}</td></tr>`);
  renderTabla("tablaAsistencia", asistencia, a => `<tr><td>${fecha(a.fecha || a.created_at)}</td><td>${a.estado || a.estado_asistencia || "-"}</td><td>${a.materia_nombre || a.clase || "-"}</td><td>${a.observacion || ""}</td></tr>`);
  renderTabla("tablaActividades", actividades, e => `<tr><td>${e.actividad_titulo || e.titulo || "-"}</td><td>${e.materia_nombre || "-"}</td><td>${e.estado || "-"}</td><td>${fecha(e.fecha_entrega || e.created_at)}</td><td>${e.calificacion ?? "-"}</td></tr>`);
  renderTabla("tablaDocumentacion", documentacion, d => `<tr><td>${d.titulo || d.tipo_tramite || "-"}</td><td>${d.origen_area || d.origen || "-"}</td><td>${d.estado || "-"}</td><td>${fecha(d.created_at || d.fecha_envio)}</td><td>${d.observacion_revision || d.observacion || ""}</td></tr>`);
  renderTabla("tablaConvivencia", convivencia, c => `<tr><td>${fecha(c.fecha_hecho || c.created_at)}</td><td>${c.gravedad || "-"}</td><td>${c.descripcion || "-"}</td><td>${c.sancion_aplicada || "-"}</td><td>${c.descreditos || 0}</td><td>${c.estado || "-"}</td></tr>`);

  setMensajeFicha("Ficha cargada correctamente.", "success");
}

function renderCabeceraAlumno(a) {
  const curso = fichaCursos.find(c => String(c.id) === String(a.curso_id));
  const nombre = `${a.apellido || ""}, ${a.nombre || ""}`.trim().replace(/^,/, "");
  document.getElementById("nombreAlumno").textContent = nombre || "Alumno";
  document.getElementById("avatarAlumno").textContent = (a.apellido || a.nombre || "A").charAt(0).toUpperCase();
  document.getElementById("datosAlumno").textContent = `${curso?.nombre || curso?.anio || "Curso no definido"} · ${a.email || a.documento || a.dni || ""}`;
  document.getElementById("badgeCurso").textContent = curso?.nombre || `${curso?.anio || ""} ${curso?.division || ""}`.trim() || "Sin curso";
  document.getElementById("badgeEstado").textContent = a.activo === false ? "Inactivo" : "Activo";
}

function renderResumen(alumno, notas, asistencia, actividades, docs, conv) {
  const promedio = calcularPromedio(notas);
  const inasistencias = asistencia.filter(a => `${a.estado || a.estado_asistencia || ""}`.toLowerCase().includes("aus") || `${a.estado || ""}`.toLowerCase().includes("inas")).length;
  const entregasPend = actividades.filter(e => ["pendiente","sin_entregar","observado"].includes(`${e.estado || ""}`.toLowerCase())).length;
  const docsPend = docs.filter(d => ["pendiente","observado","vencido","notificado"].includes(`${d.estado || ""}`.toLowerCase())).length;
  const descreditos = conv.reduce((acc,c) => acc + Number(c.descreditos || 0), 0);

  setText("kpiPromedio", promedio || "-");
  setText("kpiInasistencias", inasistencias);
  setText("kpiEntregas", entregasPend);
  setText("kpiDocumentos", docsPend);
  setText("kpiDescreditos", descreditos);
  setText("kpiConvivencia", conv.length);

  const curso = fichaCursos.find(c => String(c.id) === String(alumno.curso_id));
  document.getElementById("resumenDatos").innerHTML = `
    <div class="detail-item"><strong>Nombre</strong><span>${alumno.nombre || "-"}</span></div>
    <div class="detail-item"><strong>Apellido</strong><span>${alumno.apellido || "-"}</span></div>
    <div class="detail-item"><strong>Documento</strong><span>${alumno.documento || alumno.dni || "-"}</span></div>
    <div class="detail-item"><strong>Curso</strong><span>${curso?.nombre || "-"}</span></div>
    <div class="detail-item"><strong>Email</strong><span>${alumno.email || "-"}</span></div>`;

  document.getElementById("resumenFamilia").innerHTML = `
    <div class="detail-item"><strong>Familia ID</strong><span>${alumno.familia_id || "-"}</span></div>
    <div class="detail-item"><strong>Contacto</strong><span>Ver módulo Familias</span></div>`;

  const alerts = [];
  if (descreditos > 0) alerts.push(`<div class="alert-pill danger">Tiene ${descreditos} descrédito/s acumulado/s.</div>`);
  if (docsPend > 0) alerts.push(`<div class="alert-pill warn">Tiene ${docsPend} documentación/es pendiente/s.</div>`);
  if (entregasPend > 0) alerts.push(`<div class="alert-pill warn">Tiene ${entregasPend} entrega/s pendiente/s.</div>`);
  if (inasistencias > 0) alerts.push(`<div class="alert-pill warn">Registra ${inasistencias} inasistencia/s.</div>`);
  document.getElementById("resumenAlertas").innerHTML = alerts.join("") || `<div class="alert-pill">Sin alertas críticas registradas.</div>`;
}

async function cargarNotas(alumnoId) {
  const data = await safeSelectWhere("calificaciones", "*", "alumno_id", alumnoId, "created_at");
  return data || [];
}
async function cargarAsistencia(alumnoId) {
  let data = await safeSelectWhere("asistencia_registros", "*", "alumno_id", alumnoId, "created_at");
  if (!data?.length) data = await safeSelectWhere("asistencias", "*", "alumno_id", alumnoId, "created_at");
  return data || [];
}
async function cargarActividades(alumnoId) {
  let data = await safeSelectWhere("entregas_actividades", "*", "alumno_id", alumnoId, "created_at");
  if (!data?.length) data = await safeSelectWhere("entregas", "*", "alumno_id", alumnoId, "created_at");
  return data || [];
}
async function cargarDocumentacion(alumnoId) {
  let data = await safeSelectWhere("documentacion_destinatarios", "*", "alumno_id", alumnoId, "created_at");
  if (!data?.length) data = await safeSelectWhere("documentacion_devoluciones", "*", "alumno_id", alumnoId, "created_at");
  return data || [];
}
async function cargarConvivencia(alumnoId) {
  return await safeSelectWhere("convivencia_casos", "*", "alumno_id", alumnoId, "fecha_hecho") || [];
}

async function safeSelect(table, columns="*", orderCol=null) {
  try {
    let q = supabaseClient.from(table).select(columns);
    if (orderCol) q = q.order(orderCol, { ascending:true });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn(`No se pudo leer ${table}:`, e.message);
    return [];
  }
}
async function safeSelectWhere(table, columns, field, value, orderCol=null) {
  try {
    let q = supabaseClient.from(table).select(columns).eq(field, value);
    if (orderCol) q = q.order(orderCol, { ascending:false });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn(`No se pudo leer ${table}:`, e.message);
    return [];
  }
}

function renderTabla(id, rows, rowFn) {
  const tbody = document.getElementById(id);
  if (!tbody) return;
  tbody.innerHTML = rows?.length ? rows.map(rowFn).join("") : `<tr><td colspan="6">Sin datos registrados.</td></tr>`;
}
function calcularPromedio(notas) {
  const nums = notas.map(n => Number(n.nota)).filter(n => !Number.isNaN(n));
  if (!nums.length) return "";
  return (nums.reduce((a,b)=>a+b,0) / nums.length).toFixed(2);
}
function fecha(v) {
  if (!v) return "-";
  try { return new Date(v).toLocaleDateString("es-AR"); } catch { return v; }
}
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function setMensajeFicha(text, type="info") {
  const el = document.getElementById("mensajeFicha");
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${type}`;
}
