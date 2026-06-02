const b25 = (id) => document.getElementById(id);
let b25Contexto = null;
let b25Perfil = null;
let b25Rol = null;
let b25Periodos = [];
let b25Cursos = [];
let b25Materias = [];
let b25Alumnos = [];
let b25Evaluaciones = [];
let b25Calificaciones = [];

const B25_CAN_MANAGE = ["admin", "directivo", "docente"];

function b25Option(items, placeholder, getLabel = (x) => x.nombre || x.titulo || x.email || x.id) {
  return `<option value="">${placeholder}</option>` + (items || []).map((item) => `<option value="${item.id}">${getLabel(item)}</option>`).join("");
}

function b25NotaBadge(nota, estado) {
  if (estado === "pendiente") return `<span class="b25-pill warn">Pendiente</span>`;
  if (estado === "ausente") return `<span class="b25-pill danger">Ausente</span>`;
  const n = Number(nota);
  if (!Number.isFinite(n)) return `<span class="b25-pill warn">Sin nota</span>`;
  return `<span class="b25-pill ${n >= 7 ? "ok" : n >= 4 ? "warn" : "danger"}">${n.toFixed(2)}</span>`;
}

function b25Table(headers, rows) {
  if (!rows.length) return `<p class="helper-text">No hay datos para mostrar.</p>`;
  return `<table class="ada-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function b25ShowSetupError(error) {
  const msg = `No se pudo cargar el Bloque 25. Verificá que hayas ejecutado el SQL docs/sql/ada_bloque_25_calificaciones_boletines.sql. Detalle: ${error.message}`;
  ["tablaEvaluaciones", "tablaCalificaciones", "tablaConsultaCalificaciones"].forEach(id => {
    const el = b25(id); if (el) el.innerHTML = `<p class="form-message is-error">${msg}</p>`;
  });
}

function b25InitTabs() {
  document.querySelectorAll(".b25-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".b25-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".b25-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      b25(`tab-${btn.dataset.tab}`)?.classList.add("active");
    });
  });
}

function b25ApplyRoleMode() {
  const canManage = B25_CAN_MANAGE.includes(b25Rol);
  document.querySelectorAll("[data-b25-manage]").forEach(el => {
    el.style.display = canManage ? "" : "none";
  });
}

async function b25LoadBase() {
  const [periodosRes, cursosRes, materiasRes, alumnosRes] = await Promise.all([
    supabaseClient.from("periodos_academicos").select("*").eq("activo", true).order("orden", { ascending: true }),
    supabaseClient.from("cursos").select("id,nombre").eq("activo", true).order("nombre", { ascending: true }),
    supabaseClient.from("materias").select("id,nombre,curso_id,cursos(id,nombre)").order("nombre", { ascending: true }),
    supabaseClient.from("profiles").select("id,nombre,apellido,email,rol,activo").eq("rol", "alumno").eq("activo", true).order("apellido", { ascending: true })
  ]);
  for (const r of [periodosRes, cursosRes, materiasRes, alumnosRes]) if (r.error) throw r.error;
  b25Periodos = periodosRes.data || [];
  b25Cursos = cursosRes.data || [];
  b25Materias = materiasRes.data || [];
  b25Alumnos = alumnosRes.data || [];

  // Filtro visual para alumno/familia. RLS debe reforzarlo en base.
  if (b25Rol === "alumno") b25Alumnos = b25Alumnos.filter(a => a.id === b25Perfil.id);

  const alumnoLabel = (a) => `${a.apellido || ""}, ${a.nombre || ""} · ${a.email || ""}`;
  const materiaLabel = (m) => `${m.nombre || "Materia"}${m.cursos?.nombre ? " · " + m.cursos.nombre : ""}`;

  ["evaluacionPeriodo", "filtroPeriodo"].forEach(id => b25(id).innerHTML = b25Option(b25Periodos, "Seleccionar período"));
  ["evaluacionCurso"].forEach(id => b25(id).innerHTML = b25Option(b25Cursos, "Seleccionar curso"));
  ["evaluacionMateria", "filtroMateria"].forEach(id => b25(id).innerHTML = b25Option(b25Materias, "Seleccionar materia", materiaLabel));
  ["calificacionAlumno", "filtroAlumno"].forEach(id => b25(id).innerHTML = b25Option(b25Alumnos, "Seleccionar alumno", alumnoLabel));
  b25("evaluacionFecha").valueAsDate = new Date();
}

async function b25LoadEvaluaciones() {
  const res = await supabaseClient
    .from("evaluaciones")
    .select("*, materias(id,nombre,cursos(id,nombre)), periodos_academicos(id,nombre)")
    .order("fecha", { ascending: false })
    .limit(200);
  if (res.error) throw res.error;
  b25Evaluaciones = res.data || [];
  b25("calificacionEvaluacion").innerHTML = b25Option(b25Evaluaciones, "Seleccionar evaluación", e => `${e.titulo} · ${e.materias?.nombre || "Materia"} · ${e.periodos_academicos?.nombre || "Período"}`);
  b25("tablaEvaluaciones").innerHTML = b25Table(["Fecha", "Título", "Materia", "Período", "Tipo"], b25Evaluaciones.map(e => `<tr><td>${e.fecha || "-"}</td><td><strong>${e.titulo || "-"}</strong></td><td>${e.materias?.nombre || "-"}</td><td>${e.periodos_academicos?.nombre || "-"}</td><td>${e.tipo || "-"}</td></tr>`));
}

async function b25LoadCalificaciones() {
  let query = supabaseClient
    .from("calificaciones")
    .select("*, alumno:profiles!calificaciones_alumno_id_fkey(id,nombre,apellido,email), evaluaciones(id,titulo,tipo,fecha), materias(id,nombre), cursos(id,nombre), periodos_academicos(id,nombre)")
    .order("actualizado_en", { ascending: false })
    .limit(300);

  if (b25Rol === "alumno") query = query.eq("alumno_id", b25Perfil.id);

  const res = await query;
  if (res.error) throw res.error;
  b25Calificaciones = res.data || [];
  renderCalificaciones(b25Calificaciones);
  actualizarKpis();
}

function renderCalificaciones(rows) {
  const mapped = rows.map(c => `<tr><td>${c.alumno?.apellido || ""}, ${c.alumno?.nombre || ""}</td><td>${c.materias?.nombre || "-"}</td><td>${c.evaluaciones?.titulo || "-"}</td><td>${c.periodos_academicos?.nombre || "-"}</td><td>${b25NotaBadge(c.nota, c.estado)}</td><td>${c.observacion || "-"}</td></tr>`);
  const html = b25Table(["Alumno", "Materia", "Evaluación", "Período", "Nota", "Observación"], mapped);
  b25("tablaCalificaciones").innerHTML = html;
  b25("tablaConsultaCalificaciones").innerHTML = html;
}

function actualizarKpis() {
  b25("kpiEvaluaciones").textContent = b25Evaluaciones.length;
  b25("kpiCalificaciones").textContent = b25Calificaciones.length;
  const notas = b25Calificaciones.map(c => Number(c.nota)).filter(n => Number.isFinite(n));
  b25("kpiPromedio").textContent = notas.length ? (notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(2) : "-";
  b25("kpiPendientes").textContent = b25Calificaciones.filter(c => c.estado === "pendiente" || c.nota === null).length;
}

async function guardarEvaluacion(e) {
  e.preventDefault();
  b25("msgEvaluacion").textContent = "Guardando evaluación...";
  const payload = {
    periodo_id: b25("evaluacionPeriodo").value,
    curso_id: b25("evaluacionCurso").value || null,
    materia_id: b25("evaluacionMateria").value,
    titulo: b25("evaluacionTitulo").value.trim(),
    tipo: b25("evaluacionTipo").value,
    fecha: b25("evaluacionFecha").value,
    ponderacion: Number(b25("evaluacionPonderacion").value || 100),
    observaciones: b25("evaluacionObservaciones").value.trim() || null,
    creado_por: b25Perfil.id
  };
  const { error } = await supabaseClient.from("evaluaciones").insert(payload);
  if (error) { b25("msgEvaluacion").textContent = "Error: " + error.message; return; }
  b25("msgEvaluacion").textContent = "Evaluación guardada correctamente.";
  e.target.reset(); b25("evaluacionFecha").valueAsDate = new Date();
  await b25LoadEvaluaciones(); actualizarKpis();
}

async function guardarCalificacion(e) {
  e.preventDefault();
  const evaluacion = b25Evaluaciones.find(ev => ev.id === b25("calificacionEvaluacion").value);
  b25("msgCalificacion").textContent = "Guardando nota...";
  const payload = {
    evaluacion_id: b25("calificacionEvaluacion").value,
    alumno_id: b25("calificacionAlumno").value,
    curso_id: evaluacion?.curso_id || evaluacion?.materias?.cursos?.id || null,
    materia_id: evaluacion?.materia_id || null,
    periodo_id: evaluacion?.periodo_id || null,
    nota: b25("calificacionEstado").value === "calificado" || b25("calificacionEstado").value === "recuperatorio" ? Number(b25("calificacionNota").value) : null,
    estado: b25("calificacionEstado").value,
    observacion: b25("calificacionObservacion").value.trim() || null,
    cargado_por: b25Perfil.id
  };
  const { error } = await supabaseClient.from("calificaciones").upsert(payload, { onConflict: "evaluacion_id,alumno_id" });
  if (error) { b25("msgCalificacion").textContent = "Error: " + error.message; return; }
  b25("msgCalificacion").textContent = "Calificación guardada correctamente.";
  e.target.reset();
  await b25LoadCalificaciones();
}

function aplicarFiltros() {
  const alumno = b25("filtroAlumno").value;
  const materia = b25("filtroMateria").value;
  const periodo = b25("filtroPeriodo").value;
  const filtradas = b25Calificaciones.filter(c => (!alumno || c.alumno_id === alumno) && (!materia || c.materia_id === materia) && (!periodo || c.periodo_id === periodo));
  renderCalificaciones(filtradas);
}

async function iniciarBloque25Calificaciones() {
  b25InitTabs();
  b25Contexto = await obtenerSesionPerfil();
  if (!b25Contexto) return;
  b25Perfil = b25Contexto.perfil;
  b25Rol = b25Perfil.rol;
  b25ApplyRoleMode();
  try {
    await b25LoadBase();
    await b25LoadEvaluaciones();
    await b25LoadCalificaciones();
  } catch (error) {
    console.error(error);
    b25ShowSetupError(error);
  }
}

b25("formEvaluacion")?.addEventListener("submit", guardarEvaluacion);
b25("formCalificacion")?.addEventListener("submit", guardarCalificacion);
b25("btnFiltrarCalificaciones")?.addEventListener("click", aplicarFiltros);
b25("btnLimpiarFiltros")?.addEventListener("click", () => { b25("filtroAlumno").value=""; b25("filtroMateria").value=""; b25("filtroPeriodo").value=""; renderCalificaciones(b25Calificaciones); });

iniciarBloque25Calificaciones();
