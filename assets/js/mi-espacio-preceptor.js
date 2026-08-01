const qs = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function configurarTabs() {
  document.querySelectorAll(".role-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".role-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".role-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      const target = qs("tab-" + btn.dataset.tab);
      if (target) target.classList.add("active");
    });
  });
}

function item(title, body, extra = "") {
  return `<div class="role-item"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>${extra}</div>`;
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function perteneceACursos(row, ids, nombres) {
  if (!row) return false;
  if (row.curso_id && ids.has(String(row.curso_id))) return true;
  if (row.curso && nombres.has(String(row.curso))) return true;
  return false;
}

async function cargarPreceptor() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  const perfil = contexto.perfil;

  let cursosQuery = supabaseClient.from("v_preceptor_cursos_resumen").select("*").order("curso");
  const cursosRes = await cursosQuery;
  const cursos = (cursosRes.data || []).filter(c => !c.preceptor_id || String(c.preceptor_id) === String(perfil.id));
  const cursoIds = new Set(cursos.map(c => c.curso_id).filter(Boolean).map(String));
  const cursoNombres = new Set(cursos.map(c => c.curso).filter(Boolean).map(String));

  const [alumnosRes, asistenciaRes, segRes, familiasRes] = await Promise.all([
    supabaseClient.from("alumno_cursos").select("alumno_id, curso_id, cursos(nombre), profiles(nombre,apellido,email)").eq("activo", true),
    supabaseClient.from("v_reporte_asistencia_detalle").select("*").order("fecha", { ascending: false }).limit(1000),
    supabaseClient.from("v_reporte_seguimiento_detalle").select("*").order("creado_en", { ascending: false }).limit(200),
    supabaseClient.from("familia_alumnos").select("parentesco, familia:profiles!familia_alumnos_familia_id_fkey(nombre,apellido,email), alumno:profiles!familia_alumnos_alumno_id_fkey(id,nombre,apellido,email)").eq("activo", true)
  ]);

  const alumnos = (alumnosRes.data || []).filter(a => cursoIds.has(String(a.curso_id)));
  const alumnoIds = new Set(alumnos.map(a => a.alumno_id).filter(Boolean).map(String));
  const asistencia = (asistenciaRes.data || []).filter(a => alumnoIds.has(String(a.alumno_id)) || perteneceACursos(a, cursoIds, cursoNombres));
  const seguimientos = (segRes.data || []).filter(s => alumnoIds.has(String(s.alumno_id)) || perteneceACursos(s, cursoIds, cursoNombres)).slice(0, 20);
  const familias = (familiasRes.data || []).filter(f => f.alumno?.id && alumnoIds.has(String(f.alumno.id)));

  const ausencias = asistencia.filter(a => a.computa_inasistencia);
  const alertas = {};
  ausencias.forEach(a => {
    const key = a.alumno_id || `${a.alumno_apellido || ""}-${a.alumno_nombre || ""}`;
    if (!alertas[key]) {
      alertas[key] = { alumno: `${a.alumno_apellido || ""}, ${a.alumno_nombre || ""}`, cantidad: 0 };
    }
    alertas[key].cantidad++;
  });
  const alertasLista = Object.values(alertas)
    .sort((a, b) => b.cantidad - a.cantidad)
    .filter(a => a.cantidad >= 3);

  qs("statCursos").textContent = cursos.length;
  qs("statAlumnos").textContent = alumnos.length;
  qs("statAusencias").textContent = ausencias.length;
  qs("statAlertas").textContent = alertasLista.length;

  qs("tablaCursosPreceptor").innerHTML = tabla(
    ["Curso", "Alumnos"],
    cursos.map(c => `<tr><td>${escapeHtml(c.curso || "-")}</td><td>${escapeHtml(c.alumnos || 0)}</td></tr>`)
  );

  qs("alertasPreceptor").innerHTML = alertasLista.length
    ? alertasLista.map(a => {
        const cls = a.cantidad >= 5 ? "alerta-alta" : "alerta-media";
        return `<article class="alerta-preceptor ${cls}">
          <div>
            <strong>${escapeHtml(a.alumno || "Alumno")}</strong>
            <span>${a.cantidad} ausencias computables</span>
          </div>
          <a href="asistencia.html" class="alerta-action">Revisar</a>
        </article>`;
      }).join("")
    : `<div class="alerta-preceptor alerta-ok">No hay alertas importantes de asistencia.</div>`;

  qs("seguimientosPreceptor").innerHTML = seguimientos.length
    ? seguimientos.map(s => item(
        `${s.alumno_apellido || ""}, ${s.alumno_nombre || ""}`,
        `${s.tipo || "Seguimiento"} · ${s.prioridad || "-"} — ${s.descripcion || ""}`,
        `<span class="role-badge">${escapeHtml(s.curso || "-")}</span>`
      )).join("")
    : "<p class='helper-text'>No hay seguimientos recientes de tus cursos.</p>";

  qs("tablaFamiliasPreceptor").innerHTML = tabla(
    ["Alumno", "Familia", "Email", "Parentesco"],
    familias.map(f => `
      <tr>
        <td>${escapeHtml(`${f.alumno?.apellido || ""}, ${f.alumno?.nombre || ""}`)}</td>
        <td>${escapeHtml(`${f.familia?.apellido || ""}, ${f.familia?.nombre || ""}`)}</td>
        <td>${escapeHtml(f.familia?.email || "")}</td>
        <td>${escapeHtml(f.parentesco || "-")}</td>
      </tr>
    `)
  );
}

configurarTabs();
cargarPreceptor().catch((error) => {
  console.error(error);
  const box = qs("tablaCursosPreceptor");
  if (box) box.innerHTML = `<div class="preceptor-error">No se pudo cargar el espacio de preceptoría. Verificá la conexión con ADA e intentá nuevamente.</div>`;
});
