const qs = (id) => document.getElementById(id);
let perfilActual = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function item(title, body, extra = "") {
  return `<div class="portal-item"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>${extra}</div>`;
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function estadoBadge(codigo, nombre, computa) {
  const cls = computa ? "badge-red" : codigo === "tarde" ? "badge-yellow" : "badge-green";
  return `<span class="badge ${cls}">${escapeHtml(nombre || "-")}</span>`;
}

async function cargarAlumno() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  qs("tituloAlumno").textContent = `Hola, ${perfilActual.nombre || "estudiante"}`;

  const [cursoRes, materiasRes, asistenciaRes, seguimientoRes, docsRes] = await Promise.all([
    supabaseClient.from("v_alumno_mi_curso").select("*").eq("alumno_id", perfilActual.id).limit(1).maybeSingle(),
    supabaseClient.from("v_alumno_mis_materias").select("*").eq("alumno_id", perfilActual.id).order("materia"),
    supabaseClient.from("v_reporte_asistencia_detalle").select("*").eq("alumno_id", perfilActual.id).order("fecha", { ascending: false }),
    supabaseClient.from("v_reporte_seguimiento_detalle").select("*").eq("alumno_id", perfilActual.id).eq("visible_familia", true).order("creado_en", { ascending: false }),
    supabaseClient.from("documentos")
      .select("id,titulo,descripcion,tipo_documento,puede_usarse_ia")
      .eq("activo", true)
      .eq("visible_general", true)
      .order("creado_en", { ascending: false })
      .limit(20)
  ]);

  const curso = cursoRes.data;
  const materias = materiasRes.data || [];
  const asistencia = asistenciaRes.data || [];
  const seguimientos = seguimientoRes.data || [];
  const docs = docsRes.data || [];

  const ausencias = asistencia.filter(a => a.computa_inasistencia).length;

  qs("statMaterias").textContent = materias.length;
  qs("statAsistencias").textContent = asistencia.length;
  qs("statAusencias").textContent = ausencias;
  qs("statDocumentos").textContent = docs.length;

  const alerta = qs("alertaAlumno");
  if (ausencias >= 5) {
    alerta.innerHTML = `<div class="alerta-alumno alerta-alta">Atención: tenés ${ausencias} ausencias computables registradas.</div>`;
  } else if (ausencias >= 3) {
    alerta.innerHTML = `<div class="alerta-alumno alerta-media">Revisá tu asistencia: tenés ${ausencias} ausencias computables.</div>`;
  } else {
    alerta.innerHTML = `<div class="alerta-alumno alerta-ok">Tu asistencia no presenta alertas importantes.</div>`;
  }

  qs("miCurso").innerHTML = curso
    ? item(curso.curso || "Curso", `Nivel: ${curso.nivel || "-"} · Año: ${curso.anio || "-"} · División: ${curso.division || "-"} · Modalidad: ${curso.modalidad || "-"}`)
    : "<p class='helper-text'>Todavía no tenés curso asignado.</p>";

  qs("misMaterias").innerHTML = materias.length
    ? materias.map(m => item(
        m.materia || "Materia",
        `${m.tipo_materia || "Materia"} · ${m.carga_horaria_semanal || "-"} hs semanales`,
        `<span class="portal-badge">${escapeHtml(m.curso || "-")}</span>`
      )).join("")
    : "<p class='helper-text'>Todavía no tenés materias asignadas.</p>";

  qs("miAsistencia").innerHTML = tabla(
    ["Fecha", "Curso", "Materia", "Estado", "Observación"],
    asistencia.slice(0, 20).map(a => `<tr><td>${escapeHtml(a.fecha || "-")}</td><td>${escapeHtml(a.curso || "-")}</td><td>${escapeHtml(a.materia || "-")}</td><td>${estadoBadge(a.estado_codigo, a.estado, a.computa_inasistencia)}</td><td>${escapeHtml(a.observacion || "-")}</td></tr>`)
  );

  qs("misSeguimientos").innerHTML = seguimientos.length
    ? seguimientos.slice(0, 10).map(s => item(
        `${s.tipo || "Seguimiento"} · ${s.prioridad || "-"}`,
        s.descripcion || "",
        `<span class="portal-badge">${escapeHtml(s.creado_en ? new Date(s.creado_en).toLocaleDateString("es-AR") : "")}</span>`
      )).join("")
    : "<p class='helper-text'>No hay seguimientos visibles para mostrar.</p>";
}

cargarAlumno().catch((error) => {
  console.error(error);
  const box = qs("miCurso");
  if (box) box.textContent = "No se pudo cargar el espacio del alumno.";
});
