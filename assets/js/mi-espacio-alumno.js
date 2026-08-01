const qs = (id) => document.getElementById(id);
let perfilActual = null;

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function item(title, body, extra = "") { return `<div class="portal-item"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>${extra}</div>`; }
function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}
function estadoBadge(codigo, nombre, computa) {
  const cls = computa ? "badge-red" : codigo === "tarde" ? "badge-yellow" : "badge-green";
  return `<span class="badge ${cls}">${escapeHtml(nombre || "-")}</span>`;
}
function fechaAR(value) { return value ? new Date(value).toLocaleDateString("es-AR") : "Sin fecha"; }
function hoyISO() { return new Date().toISOString().slice(0, 10); }
async function safe(query, fallback = []) {
  try { const { data, error } = await query; if (error) throw error; return data ?? fallback; }
  catch (error) { console.warn("ADA Alumno: consulta no disponible", error); return fallback; }
}

function renderActividad(a, entrega) {
  const vencida = a.fecha_entrega && a.fecha_entrega < hoyISO() && !entrega;
  const estado = entrega?.estado || (vencida ? "Vencida" : "Pendiente");
  const cls = vencida ? "danger" : entrega ? "" : "warn";
  return `<article class="alumno-task">
    <div><h3>${escapeHtml(a.titulo || "Actividad")}</h3><p>${escapeHtml(a.materias?.nombre || "Materia")} · ${escapeHtml(a.cursos?.nombre || "Curso")}</p>
    <div class="alumno-task-meta"><span class="alumno-chip ${cls}">${escapeHtml(estado)}</span><span class="alumno-chip">Entrega: ${escapeHtml(fechaAR(a.fecha_entrega))}</span></div></div>
    <a class="btn-secondary" href="entregas.html">Abrir</a>
  </article>`;
}

async function cargarAlumno() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;
  qs("tituloAlumno").textContent = `Hola, ${perfilActual.nombre || "estudiante"}`;

  const inscripciones = await safe(supabaseClient.from("alumno_cursos").select("curso_id").eq("alumno_id", perfilActual.id).eq("activo", true));
  const cursoIds = [...new Set(inscripciones.map(i => i.curso_id).filter(Boolean))];

  const [curso, materias, asistencia, seguimientos, docs, entregas, boletines] = await Promise.all([
    safe(supabaseClient.from("v_alumno_mi_curso").select("*").eq("alumno_id", perfilActual.id).limit(1).maybeSingle(), null),
    safe(supabaseClient.from("v_alumno_mis_materias").select("*").eq("alumno_id", perfilActual.id).order("materia")),
    safe(supabaseClient.from("v_reporte_asistencia_detalle").select("*").eq("alumno_id", perfilActual.id).order("fecha", { ascending: false })),
    safe(supabaseClient.from("v_reporte_seguimiento_detalle").select("*").eq("alumno_id", perfilActual.id).eq("visible_familia", true).order("creado_en", { ascending: false })),
    safe(supabaseClient.from("documentos").select("id,titulo,descripcion,tipo_documento").eq("activo", true).eq("visible_general", true).order("creado_en", { ascending: false }).limit(20)),
    safe(supabaseClient.from("entregas_actividades").select("id,actividad_id,estado,calificacion,devolucion,entregado_en,actividades(id,titulo,fecha_entrega,materia_id,curso_id,materias(id,nombre),cursos(id,nombre))").eq("alumno_id", perfilActual.id).order("entregado_en", { ascending: false }).limit(100)),
    safe(supabaseClient.from("boletines").select("id,estado,promedio_general,emitido_en,periodos_academicos(id,nombre),cursos(id,nombre)").eq("alumno_id", perfilActual.id).eq("estado", "emitido").order("emitido_en", { ascending: false }).limit(20))
  ]);

  let actividades = [];
  if (cursoIds.length) {
    actividades = await safe(supabaseClient.from("actividades").select("id,titulo,descripcion,estado,fecha_entrega,curso_id,materia_id,cursos(id,nombre),materias(id,nombre)").in("curso_id", cursoIds).eq("estado", "publicada").order("fecha_entrega", { ascending: true }).limit(100));
  }

  const entregasPorActividad = new Map(entregas.map(e => [e.actividad_id, e]));
  const pendientes = actividades.filter(a => !entregasPorActividad.has(a.id));
  const ausencias = asistencia.filter(a => a.computa_inasistencia).length;

  qs("statMaterias").textContent = materias.length;
  qs("statPendientes").textContent = pendientes.length;
  qs("statEntregadas").textContent = entregas.length;
  qs("statAusencias").textContent = ausencias;
  qs("statBoletines").textContent = boletines.length;

  const alerta = qs("alertaAlumno");
  if (ausencias >= 5) alerta.innerHTML = `<div class="alumno-alert danger">Atención: tenés ${ausencias} ausencias computables registradas.</div>`;
  else if (pendientes.some(a => a.fecha_entrega && a.fecha_entrega < hoyISO())) alerta.innerHTML = `<div class="alumno-alert warn">Tenés actividades vencidas o pendientes de entrega.</div>`;
  else if (pendientes.length) alerta.innerHTML = `<div class="alumno-alert warn">Tenés ${pendientes.length} actividad${pendientes.length === 1 ? "" : "es"} pendiente${pendientes.length === 1 ? "" : "s"}.</div>`;
  else alerta.innerHTML = `<div class="alumno-alert ok">No tenés alertas académicas importantes.</div>`;

  qs("miCurso").innerHTML = curso ? item(curso.curso || "Curso", `Nivel: ${curso.nivel || "-"} · Año: ${curso.anio || "-"} · División: ${curso.division || "-"} · Modalidad: ${curso.modalidad || "-"}`) : "<p class='helper-text'>Todavía no tenés curso asignado.</p>";

  qs("misMaterias").innerHTML = materias.length ? materias.slice(0, 10).map(m => item(m.materia || "Materia", `${m.tipo_materia || "Materia"} · ${m.carga_horaria_semanal || "-"} hs semanales`, `<span class="portal-badge">${escapeHtml(m.curso || "-")}</span>`)).join("") : "<p class='helper-text'>Todavía no tenés materias asignadas.</p>";

  qs("proximasActividades").innerHTML = actividades.length ? actividades.slice(0, 6).map(a => renderActividad(a, entregasPorActividad.get(a.id))).join("") : `<div class="alumno-empty">No hay actividades publicadas para tu curso.</div>`;

  qs("ultimasEntregas").innerHTML = entregas.length ? entregas.slice(0, 6).map(e => item(e.actividades?.titulo || "Entrega", `${e.actividades?.materias?.nombre || "Materia"} · ${fechaAR(e.entregado_en)}`, `<span class="portal-badge">${escapeHtml(e.estado || "entregada")}${e.calificacion != null ? ` · Nota: ${escapeHtml(e.calificacion)}` : ""}</span>`)).join("") : "<p class='helper-text'>Todavía no registraste entregas.</p>";

  qs("misBoletines").innerHTML = boletines.length ? boletines.slice(0, 5).map(b => item(b.periodos_academicos?.nombre || "Boletín", `${b.cursos?.nombre || "Curso"} · Publicado el ${fechaAR(b.emitido_en)}`, `<span class="portal-badge">Promedio: ${escapeHtml(b.promedio_general ?? "-")}</span>`)).join("") : "<p class='helper-text'>No hay boletines publicados.</p>";

  qs("miAsistencia").innerHTML = tabla(["Fecha", "Curso", "Materia", "Estado", "Observación"], asistencia.slice(0, 20).map(a => `<tr><td>${escapeHtml(a.fecha || "-")}</td><td>${escapeHtml(a.curso || "-")}</td><td>${escapeHtml(a.materia || "-")}</td><td>${estadoBadge(a.estado_codigo, a.estado, a.computa_inasistencia)}</td><td>${escapeHtml(a.observacion || "-")}</td></tr>`));

  qs("misSeguimientos").innerHTML = seguimientos.length ? seguimientos.slice(0, 10).map(s => item(`${s.tipo || "Seguimiento"} · ${s.prioridad || "-"}`, s.descripcion || "", `<span class="portal-badge">${escapeHtml(fechaAR(s.creado_en))}</span>`)).join("") : "<p class='helper-text'>No hay seguimientos visibles para mostrar.</p>";
}

cargarAlumno().catch((error) => {
  console.error(error);
  const box = qs("miCurso");
  if (box) box.textContent = "No se pudo cargar el espacio del alumno.";
});
