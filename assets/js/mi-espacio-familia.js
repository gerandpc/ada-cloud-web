
const qs = (id) => document.getElementById(id);
let perfilActual = null;
let hijos = [];
let hijoSeleccionado = null;

function item(title, body, extra="") {
  return `<div class="portal-item"><h3>${title}</h3><p>${body}</p>${extra}</div>`;
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay datos para mostrar.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function estadoBadge(codigo, nombre, computa) {
  const cls = computa ? "badge-red" : codigo === "tarde" ? "badge-yellow" : "badge-green";
  return `<span class="badge ${cls}">${nombre || "-"}</span>`;
}

async function cargarFamilia() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  const { data, error } = await supabaseClient
    .from("v_familia_hijos")
    .select("*")
    .eq("familia_id", perfilActual.id)
    .order("alumno_apellido");

  if (error) {
    qs("selectorHijos").innerHTML = `<p class="form-message">Error: ${error.message}</p>`;
    console.error(error);
    return;
  }

  hijos = data || [];
  qs("statHijos").textContent = hijos.length;

  if (!hijos.length) {
    qs("selectorHijos").innerHTML = "<p class='helper-text'>No hay estudiantes vinculados a esta familia.</p>";
    return;
  }

  qs("selectorHijos").innerHTML = hijos.map((h, idx) => `
    <button class="child-button ${idx===0 ? "active" : ""}" data-id="${h.alumno_id}">
      ${h.alumno_apellido || ""}, ${h.alumno_nombre || ""}
    </button>
  `).join("");

  document.querySelectorAll(".child-button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".child-button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      seleccionarHijo(btn.dataset.id);
    });
  });

  seleccionarHijo(hijos[0].alumno_id);
}

async function seleccionarHijo(alumnoId) {
  hijoSeleccionado = hijos.find(h => h.alumno_id === alumnoId);
  if (!hijoSeleccionado) return;

  const [asistenciaRes, seguimientoRes, docsRes] = await Promise.all([
    supabaseClient.from("v_reporte_asistencia_detalle").select("*").eq("alumno_id", alumnoId).order("fecha", { ascending:false }),
    supabaseClient.from("v_reporte_seguimiento_detalle").select("*").eq("alumno_id", alumnoId).eq("visible_familia", true).order("creado_en", { ascending:false }),
    supabaseClient.from("documentos").select("id,titulo,descripcion,tipo_documento,puede_usarse_ia").order("creado_en", { ascending:false })
  ]);

  const asistencia = asistenciaRes.data || [];
  const seguimientos = seguimientoRes.data || [];
  const docs = docsRes.data || [];
  const ausencias = asistencia.filter(a => a.computa_inasistencia).length;

  qs("statRegistros").textContent = asistencia.length;
  qs("statAusencias").textContent = ausencias;
  qs("statSeguimientos").textContent = seguimientos.length;

  if (ausencias >= 5) {
    qs("alertaFamilia").innerHTML = `<div class="alerta-alumno alerta-alta">Atención: ${hijoSeleccionado.alumno_nombre} registra ${ausencias} ausencias computables.</div>`;
  } else if (ausencias >= 3) {
    qs("alertaFamilia").innerHTML = `<div class="alerta-alumno alerta-media">${hijoSeleccionado.alumno_nombre} registra ${ausencias} ausencias computables.</div>`;
  } else {
    qs("alertaFamilia").innerHTML = `<div class="alerta-alumno alerta-ok">Sin alertas importantes de asistencia para ${hijoSeleccionado.alumno_nombre}.</div>`;
  }

  qs("datosHijo").innerHTML = item(
    `${hijoSeleccionado.alumno_apellido || ""}, ${hijoSeleccionado.alumno_nombre || ""}`,
    `Email: ${hijoSeleccionado.alumno_email || "-"} · Curso: ${hijoSeleccionado.curso || "-"} · Parentesco: ${hijoSeleccionado.parentesco || "-"}`
  );

  qs("asistenciaHijo").innerHTML = tabla(
    ["Fecha","Curso","Materia","Estado","Observación"],
    asistencia.slice(0, 20).map(a => `<tr><td>${a.fecha || "-"}</td><td>${a.curso || "-"}</td><td>${a.materia || "-"}</td><td>${estadoBadge(a.estado_codigo,a.estado,a.computa_inasistencia)}</td><td>${a.observacion || "-"}</td></tr>`)
  );

  qs("seguimientosHijo").innerHTML = seguimientos.length
    ? seguimientos.slice(0, 10).map(s => item(`${s.tipo} · ${s.prioridad}`, s.descripcion, `<span class="portal-badge">${s.creado_en ? new Date(s.creado_en).toLocaleDateString("es-AR") : ""}</span>`)).join("")
    : "<p class='helper-text'>No hay seguimientos visibles para familia.</p>";

  qs("documentosFamilia").innerHTML = docs.length
    ? docs.slice(0, 10).map(d => item(d.titulo, d.descripcion || d.tipo_documento || "Documento habilitado", d.puede_usarse_ia ? `<span class="portal-badge">Usable por ADA IA</span>` : "")).join("")
    : "<p class='helper-text'>No hay documentos disponibles.</p>";
}

cargarFamilia();
