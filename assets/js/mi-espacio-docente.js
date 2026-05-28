
const qs = (id) => document.getElementById(id);
let perfilActual = null;

function item(title, body, extra="") {
  return `<div class="role-item"><h3>${title}</h3><p>${body}</p>${extra}</div>`;
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

async function cargarDocente() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  qs("tituloDocente").textContent = `Hola, ${perfilActual.nombre || "docente"}`;

  const [matRes, alumnosRes, segRes, docsRes] = await Promise.all([
    supabaseClient.from("v_docente_mis_materias").select("*").eq("docente_id", perfilActual.id).order("curso"),
    supabaseClient.from("v_docente_mis_alumnos").select("*").eq("docente_id", perfilActual.id).order("alumno_apellido"),
    supabaseClient.from("v_reporte_seguimiento_detalle").select("*").order("creado_en", { ascending:false }).limit(12),
    supabaseClient.from("documentos").select("titulo,descripcion,tipo_documento,puede_usarse_ia").order("creado_en", { ascending:false }).limit(10)
  ]);

  const materias = matRes.data || [];
  const alumnosRows = alumnosRes.data || [];
  const cursosUnicos = [...new Set(materias.map(m => m.curso_id).filter(Boolean))];
  const alumnosUnicos = {};
  alumnosRows.forEach(a => alumnosUnicos[a.alumno_id] = a);

  qs("statMaterias").textContent = materias.length;
  qs("statCursos").textContent = cursosUnicos.length;
  qs("statAlumnos").textContent = Object.keys(alumnosUnicos).length;
  qs("statSeguimientos").textContent = (segRes.data || []).length;

  qs("misMaterias").innerHTML = materias.length
    ? materias.map(m => item(m.materia, `${m.curso || "-"} · ${m.tipo_materia || "Materia"} · ${m.carga_horaria_semanal || "-"} hs semanales`, `<span class="role-badge">${m.curso}</span>`)).join("")
    : "<p class='helper-text'>Todavía no tenés materias asignadas.</p>";

  qs("misAlumnos").innerHTML = tabla(
    ["Alumno","Email","Curso","Materia"],
    alumnosRows.slice(0, 80).map(a => `
      <tr>
        <td>${a.alumno_apellido || ""}, ${a.alumno_nombre || ""}</td>
        <td>${a.alumno_email || ""}</td>
        <td>${a.curso || "-"}</td>
        <td>${a.materia || "-"}</td>
      </tr>
    `)
  );

  qs("seguimientosDocente").innerHTML = (segRes.data || []).length
    ? segRes.data.map(s => item(`${s.alumno_apellido || ""}, ${s.alumno_nombre || ""}`, `${s.tipo} · ${s.prioridad}<br>${s.descripcion}`, `<span class="role-badge">${s.curso || "-"}</span>`)).join("")
    : "<p class='helper-text'>No hay seguimientos recientes.</p>";

  qs("documentosDocente").innerHTML = (docsRes.data || []).length
    ? docsRes.data.map(d => item(d.titulo, d.descripcion || d.tipo_documento || "Documento", d.puede_usarse_ia ? `<span class="role-badge">Usable por ADA IA</span>` : "")).join("")
    : "<p class='helper-text'>No hay documentos habilitados.</p>";
}

cargarDocente();
