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
  return `<div class="role-item"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>${extra}</div>`;
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function cursoPerteneceAlDocente(row, cursoIds, cursoNombres) {
  if (!row) return false;
  if (row.curso_id && cursoIds.has(String(row.curso_id))) return true;
  if (row.curso && cursoNombres.has(String(row.curso))) return true;
  return false;
}

function fechaCorta(value) {
  if (!value) return "Sin fecha";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Sin fecha" : d.toLocaleDateString("es-AR");
}

async function consultaSegura(promise, fallback = []) {
  try {
    const result = await promise;
    if (result?.error) throw result.error;
    return result?.data || fallback;
  } catch (error) {
    console.warn("Consulta opcional del espacio docente:", error.message);
    return fallback;
  }
}

function renderEstadoTrabajo(programas, actividades, entregas) {
  const programasPendientes = programas.filter(p => p.estado === "pendiente").length;
  const programasObservados = programas.filter(p => p.estado === "observado").length;
  const actividadesBorrador = actividades.filter(a => ["borrador", "pausada"].includes(a.estado)).length;
  const actividadesPublicadas = actividades.filter(a => a.estado === "publicada").length;
  const entregasPendientes = entregas.filter(e => !e.calificacion && !e.corregido_en && e.estado !== "corregida").length;

  qs("statProgramas").textContent = programas.length;
  qs("statActividades").textContent = actividadesPublicadas;
  qs("statCorrecciones").textContent = entregasPendientes;

  const alertas = [];
  if (programasPendientes) alertas.push(item("Programas en revisión", `${programasPendientes} programa(s) enviados a Dirección.`, '<a class="role-action-link" href="programas.html">Ver programas</a>'));
  if (programasObservados) alertas.push(item("Programas observados", `${programasObservados} programa(s) requieren correcciones.`, '<a class="role-action-link" href="programas.html">Corregir ahora</a>'));
  if (actividadesBorrador) alertas.push(item("Actividades sin publicar", `${actividadesBorrador} actividad(es) continúan en borrador.`, '<a class="role-action-link" href="actividades.html">Revisar actividades</a>'));
  if (entregasPendientes) alertas.push(item("Correcciones pendientes", `${entregasPendientes} entrega(s) esperan devolución.`, '<a class="role-action-link" href="entregas.html">Corregir entregas</a>'));

  qs("pendientesDocente").innerHTML = alertas.length
    ? alertas.join("")
    : item("Trabajo al día", "No hay observaciones ni correcciones pendientes.", '<span class="role-badge role-badge-ok">Sin pendientes</span>');

  const proximas = actividades
    .filter(a => a.estado === "publicada")
    .sort((a, b) => new Date(a.fecha_entrega || "2999-12-31") - new Date(b.fecha_entrega || "2999-12-31"))
    .slice(0, 6);

  qs("proximasActividades").innerHTML = proximas.length
    ? proximas.map(a => item(
        a.titulo || "Actividad",
        `${a.materias?.nombre || "Materia"} · ${a.cursos?.nombre || "Curso"} · entrega ${fechaCorta(a.fecha_entrega)}`,
        '<a class="role-action-link" href="actividades.html">Abrir actividad</a>'
      )).join("")
    : "<p class='helper-text'>No hay actividades publicadas próximas.</p>";
}

async function cargarDocente() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  qs("tituloDocente").textContent = `Hola, ${perfilActual.nombre || "docente"}`;

  const [materias, alumnosRows, documentos, programas, actividades, entregas] = await Promise.all([
    consultaSegura(supabaseClient.from("v_docente_mis_materias").select("*").eq("docente_id", perfilActual.id).order("curso")),
    consultaSegura(supabaseClient.from("v_docente_mis_alumnos").select("*").eq("docente_id", perfilActual.id).order("alumno_apellido")),
    consultaSegura(supabaseClient.from("documentos").select("titulo,descripcion,tipo_documento,puede_usarse_ia").eq("activo", true).eq("visible_general", true).order("creado_en", { ascending: false }).limit(10)),
    consultaSegura(supabaseClient.from("programas_materia").select("id,titulo,estado,curso_id,materia_id").eq("creado_por", perfilActual.id).limit(200)),
    consultaSegura(supabaseClient.from("actividades").select("id,titulo,estado,fecha_entrega,curso_id,materia_id,cursos(id,nombre),materias(id,nombre)").eq("docente_id", perfilActual.id).limit(250)),
    consultaSegura(supabaseClient.from("entregas_actividades").select("id,actividad_id,estado,calificacion,corregido_en,actividades!inner(docente_id)").eq("actividades.docente_id", perfilActual.id).limit(500))
  ]);

  const cursosUnicos = [...new Set(materias.map(m => m.curso_id).filter(Boolean))];
  const cursoIds = new Set(cursosUnicos.map(String));
  const cursoNombres = new Set(materias.map(m => m.curso).filter(Boolean).map(String));
  const alumnosUnicos = {};
  alumnosRows.forEach(a => { if (a.alumno_id) alumnosUnicos[a.alumno_id] = a; });

  let seguimientos = [];
  if (cursoIds.size || cursoNombres.size) {
    const segRes = await consultaSegura(
      supabaseClient.from("v_reporte_seguimiento_detalle").select("*").order("creado_en", { ascending: false }).limit(100)
    );
    seguimientos = segRes.filter(row => cursoPerteneceAlDocente(row, cursoIds, cursoNombres)).slice(0, 12);
  }

  qs("statMaterias").textContent = materias.length;
  qs("statCursos").textContent = cursosUnicos.length;
  qs("statAlumnos").textContent = Object.keys(alumnosUnicos).length;
  qs("statSeguimientos").textContent = seguimientos.length;

  renderEstadoTrabajo(programas, actividades, entregas);

  qs("misMaterias").innerHTML = materias.length
    ? materias.map(m => item(
        m.materia || "Materia",
        `${m.curso || "-"} · ${m.tipo_materia || "Materia"} · ${m.carga_horaria_semanal || "-"} hs semanales`,
        `<div class="role-item-actions"><span class="role-badge">${escapeHtml(m.curso || "-")}</span><a class="role-action-link" href="calificaciones.html">Calificaciones</a><a class="role-action-link" href="asistencia.html">Asistencia</a></div>`
      )).join("")
    : "<p class='helper-text'>Todavía no tenés materias asignadas.</p>";

  qs("misAlumnos").innerHTML = tabla(
    ["Alumno", "Email", "Curso", "Materia"],
    alumnosRows.slice(0, 80).map(a => `
      <tr>
        <td>${escapeHtml(`${a.alumno_apellido || ""}, ${a.alumno_nombre || ""}`)}</td>
        <td>${escapeHtml(a.alumno_email || "")}</td>
        <td>${escapeHtml(a.curso || "-")}</td>
        <td>${escapeHtml(a.materia || "-")}</td>
      </tr>
    `)
  );

  qs("seguimientosDocente").innerHTML = seguimientos.length
    ? seguimientos.map(s => item(
        `${s.alumno_apellido || ""}, ${s.alumno_nombre || ""}`,
        `${s.tipo || "Seguimiento"} · ${s.prioridad || "-"} — ${s.descripcion || ""}`,
        `<span class="role-badge">${escapeHtml(s.curso || "-")}</span>`
      )).join("")
    : "<p class='helper-text'>No hay seguimientos recientes de tus cursos.</p>";

  qs("documentosDocente").innerHTML = documentos.length
    ? documentos.map(d => item(
        d.titulo || "Documento",
        d.descripcion || d.tipo_documento || "Documento",
        d.puede_usarse_ia ? '<span class="role-badge">Usable por ADA IA</span>' : ""
      )).join("")
    : "<p class='helper-text'>No hay documentos generales habilitados.</p>";
}

cargarDocente().catch((error) => {
  console.error(error);
  const box = qs("pendientesDocente") || qs("seguimientosDocente");
  if (box) box.textContent = "No se pudo cargar el espacio docente.";
});
