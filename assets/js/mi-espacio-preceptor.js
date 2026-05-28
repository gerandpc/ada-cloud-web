
const qs = (id) => document.getElementById(id);

function configurarTabs() {
  document.querySelectorAll(".role-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".role-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".role-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      qs("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

function item(title, body, extra="") {
  return `<div class="role-item"><h3>${title}</h3><p>${body}</p>${extra}</div>`;
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

async function cargarPreceptor() {
  await obtenerSesionPerfil();

  const [cursosRes, alumnosRes, asistenciaRes, segRes, familiasRes] = await Promise.all([
    supabaseClient.from("v_preceptor_cursos_resumen").select("*").order("curso"),
    supabaseClient.from("alumno_cursos").select("alumno_id, curso_id, cursos(nombre), profiles(nombre,apellido,email)").eq("activo", true),
    supabaseClient.from("v_reporte_asistencia_detalle").select("*").order("fecha", { ascending:false }),
    supabaseClient.from("v_reporte_seguimiento_detalle").select("*").order("creado_en", { ascending:false }).limit(20),
    supabaseClient.from("familia_alumnos").select("parentesco, familia:profiles!familia_alumnos_familia_id_fkey(nombre,apellido,email), alumno:profiles!familia_alumnos_alumno_id_fkey(nombre,apellido,email)").eq("activo", true)
  ]);

  const cursos = cursosRes.data || [];
  const alumnos = alumnosRes.data || [];
  const asistencia = asistenciaRes.data || [];
  const seguimientos = segRes.data || [];
  const familias = familiasRes.data || [];

  const ausencias = asistencia.filter(a => a.computa_inasistencia);
  const alertas = {};
  ausencias.forEach(a => {
    if (!alertas[a.alumno_id]) {
      alertas[a.alumno_id] = { alumno: `${a.alumno_apellido || ""}, ${a.alumno_nombre || ""}`, cantidad: 0 };
    }
    alertas[a.alumno_id].cantidad++;
  });
  const alertasLista = Object.values(alertas).sort((a,b) => b.cantidad - a.cantidad).filter(a => a.cantidad >= 3);

  qs("statCursos").textContent = cursos.length;
  qs("statAlumnos").textContent = alumnos.length;
  qs("statAusencias").textContent = ausencias.length;
  qs("statAlertas").textContent = alertasLista.length;

  qs("tablaCursosPreceptor").innerHTML = tabla(
    ["Curso","Alumnos"],
    cursos.map(c => `<tr><td>${c.curso || "-"}</td><td>${c.alumnos || 0}</td></tr>`)
  );

  qs("alertasPreceptor").innerHTML = alertasLista.length
    ? alertasLista.map(a => {
        const cls = a.cantidad >= 5 ? "alerta-alta" : "alerta-media";
        return `<div class="alerta-preceptor ${cls}">${a.alumno}: ${a.cantidad} ausencias computables.</div>`;
      }).join("")
    : `<div class="alerta-preceptor alerta-ok">No hay alertas importantes de asistencia.</div>`;

  qs("seguimientosPreceptor").innerHTML = seguimientos.length
    ? seguimientos.map(s => item(`${s.alumno_apellido || ""}, ${s.alumno_nombre || ""}`, `${s.tipo} · ${s.prioridad}<br>${s.descripcion}`, `<span class="role-badge">${s.curso || "-"}</span>`)).join("")
    : "<p class='helper-text'>No hay seguimientos recientes.</p>";

  qs("tablaFamiliasPreceptor").innerHTML = tabla(
    ["Alumno","Familia","Email","Parentesco"],
    familias.map(f => `
      <tr>
        <td>${f.alumno?.apellido || ""}, ${f.alumno?.nombre || ""}</td>
        <td>${f.familia?.apellido || ""}, ${f.familia?.nombre || ""}</td>
        <td>${f.familia?.email || ""}</td>
        <td>${f.parentesco || "-"}</td>
      </tr>
    `)
  );
}

configurarTabs();
cargarPreceptor();
