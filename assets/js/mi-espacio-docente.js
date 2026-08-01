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

async function cargarDocente() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  qs("tituloDocente").textContent = `Hola, ${perfilActual.nombre || "docente"}`;

  const [matRes, alumnosRes, docsRes] = await Promise.all([
    supabaseClient.from("v_docente_mis_materias").select("*").eq("docente_id", perfilActual.id).order("curso"),
    supabaseClient.from("v_docente_mis_alumnos").select("*").eq("docente_id", perfilActual.id).order("alumno_apellido"),
    supabaseClient.from("documentos")
      .select("titulo,descripcion,tipo_documento,puede_usarse_ia")
      .eq("activo", true)
      .eq("visible_general", true)
      .order("creado_en", { ascending: false })
      .limit(10)
  ]);

  const materias = matRes.data || [];
  const alumnosRows = alumnosRes.data || [];
  const cursosUnicos = [...new Set(materias.map(m => m.curso_id).filter(Boolean))];
  const cursoIds = new Set(cursosUnicos.map(String));
  const cursoNombres = new Set(materias.map(m => m.curso).filter(Boolean).map(String));
  const alumnosUnicos = {};
  alumnosRows.forEach(a => { if (a.alumno_id) alumnosUnicos[a.alumno_id] = a; });

  let seguimientos = [];
  if (cursoIds.size || cursoNombres.size) {
    const segRes = await supabaseClient
      .from("v_reporte_seguimiento_detalle")
      .select("*")
      .order("creado_en", { ascending: false })
      .limit(100);
    seguimientos = (segRes.data || []).filter(row => cursoPerteneceAlDocente(row, cursoIds, cursoNombres)).slice(0, 12);
  }

  const documentos = docsRes.data || [];

  qs("statMaterias").textContent = materias.length;
  qs("statCursos").textContent = cursosUnicos.length;
  qs("statAlumnos").textContent = Object.keys(alumnosUnicos).length;
  qs("statSeguimientos").textContent = seguimientos.length;

  qs("misMaterias").innerHTML = materias.length
    ? materias.map(m => item(
        m.materia || "Materia",
        `${m.curso || "-"} · ${m.tipo_materia || "Materia"} · ${m.carga_horaria_semanal || "-"} hs semanales`,
        `<span class="role-badge">${escapeHtml(m.curso || "-")}</span>`
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
        d.puede_usarse_ia ? `<span class="role-badge">Usable por ADA IA</span>` : ""
      )).join("")
    : "<p class='helper-text'>No hay documentos generales habilitados.</p>";
}

cargarDocente().catch((error) => {
  console.error(error);
  const box = qs("seguimientosDocente");
  if (box) box.textContent = "No se pudo cargar el espacio docente.";
});
