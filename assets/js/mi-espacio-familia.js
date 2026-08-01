const fam = (id) => document.getElementById(id);
let famContexto = null;
let famPerfil = null;
let famHijos = [];
let famHijoSeleccionado = null;

function famEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function famFecha(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? famEscape(value) : d.toLocaleDateString("es-AR");
}
function famItem(title, body, extra = "") {
  return `<div class="portal-item"><h3>${famEscape(title)}</h3><p>${famEscape(body)}</p>${extra}</div>`;
}
function famEmpty(text) { return `<div class="familia-empty">${famEscape(text)}</div>`; }
function famTable(headers, rows) {
  if (!rows.length) return famEmpty("No hay datos para mostrar.");
  return `<table class="ada-table"><thead><tr>${headers.map(h => `<th>${famEscape(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}
function famEstadoBadge(codigo, nombre, computa) {
  const cls = computa ? "badge-red" : codigo === "tarde" ? "badge-yellow" : "badge-green";
  return `<span class="badge ${cls}">${famEscape(nombre || "-")}</span>`;
}
async function famSafeQuery(promise, label) {
  try {
    const result = await promise;
    if (result?.error) throw result.error;
    return result?.data || [];
  } catch (error) {
    console.warn(`ADA Familia: no se pudo cargar ${label}`, error);
    return [];
  }
}
function famSetStatus(text, type = "") {
  const el = fam("estadoCargaFamilia");
  if (!el) return;
  el.textContent = text;
  el.className = `familia-status ${type}`.trim();
}

async function famCargarHijos() {
  const data = await famSafeQuery(
    supabaseClient.from("v_familia_hijos").select("*").eq("familia_id", famPerfil.id).order("alumno_apellido"),
    "los estudiantes vinculados"
  );
  famHijos = data;
  fam("statHijos").textContent = famHijos.length;
  if (!famHijos.length) {
    fam("selectorHijos").innerHTML = famEmpty("No hay estudiantes vinculados a esta cuenta familiar.");
    famSetStatus("Sin vinculaciones", "error");
    return false;
  }
  fam("selectorHijos").innerHTML = famHijos.map((h, index) => `
    <button type="button" class="child-button ${index === 0 ? "active" : ""}" data-id="${famEscape(h.alumno_id)}">
      ${famEscape(`${h.alumno_apellido || ""}, ${h.alumno_nombre || ""}`)}
    </button>`).join("");
  document.querySelectorAll(".child-button").forEach(btn => btn.addEventListener("click", async () => {
    document.querySelectorAll(".child-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    await famSeleccionarHijo(btn.dataset.id);
  }));
  famSetStatus(`${famHijos.length} vinculación${famHijos.length === 1 ? "" : "es"}`, "ok");
  return true;
}

async function famCargarActividades(alumnoId, cursoId) {
  if (!cursoId) return [];
  const actividades = await famSafeQuery(
    supabaseClient.from("actividades")
      .select("id,titulo,descripcion,fecha_entrega,estado,curso_id,materia_id,materias(id,nombre)")
      .eq("curso_id", cursoId)
      .eq("estado", "publicada")
      .order("fecha_entrega", { ascending: true })
      .limit(20),
    "las actividades"
  );
  const entregas = await famSafeQuery(
    supabaseClient.from("entregas_actividades")
      .select("actividad_id,estado,entregado_en")
      .eq("alumno_id", alumnoId),
    "las entregas"
  );
  const entregadas = new Set(entregas.map(e => String(e.actividad_id)));
  return actividades.map(a => ({ ...a, entregada: entregadas.has(String(a.id)) }));
}

async function famSeleccionarHijo(alumnoId) {
  famHijoSeleccionado = famHijos.find(h => String(h.alumno_id) === String(alumnoId));
  if (!famHijoSeleccionado) return;
  famSetStatus("Actualizando...", "");
  const cursoId = famHijoSeleccionado.curso_id || famHijoSeleccionado.alumno_curso_id || null;

  const [asistencia, seguimientos, documentos, boletines, actividades] = await Promise.all([
    famSafeQuery(supabaseClient.from("v_reporte_asistencia_detalle").select("*").eq("alumno_id", alumnoId).order("fecha", { ascending: false }).limit(80), "la asistencia"),
    famSafeQuery(supabaseClient.from("v_reporte_seguimiento_detalle").select("*").eq("alumno_id", alumnoId).eq("visible_familia", true).order("creado_en", { ascending: false }).limit(20), "los seguimientos"),
    famSafeQuery(supabaseClient.from("documentos").select("id,titulo,descripcion,tipo_documento,puede_usarse_ia").eq("activo", true).eq("visible_general", true).order("creado_en", { ascending: false }).limit(10), "los documentos"),
    famSafeQuery(supabaseClient.from("boletines").select("id,promedio_general,estado,emitido_en,periodos_academicos(id,nombre),cursos(id,nombre)").eq("alumno_id", alumnoId).eq("estado", "emitido").order("emitido_en", { ascending: false }).limit(10), "los boletines"),
    famCargarActividades(alumnoId, cursoId)
  ]);

  const ausencias = asistencia.filter(a => a.computa_inasistencia).length;
  const pendientes = actividades.filter(a => !a.entregada).length;
  fam("statPendientes").textContent = pendientes;
  fam("statAusencias").textContent = ausencias;
  fam("statBoletines").textContent = boletines.length;
  fam("statSeguimientos").textContent = seguimientos.length;

  const nombre = `${famHijoSeleccionado.alumno_nombre || "El estudiante"}`;
  if (ausencias >= 5) {
    fam("alertaFamilia").innerHTML = `<div class="familia-alert danger">Atención: ${famEscape(nombre)} registra ${ausencias} ausencias computables.</div>`;
  } else if (pendientes >= 3 || ausencias >= 3) {
    fam("alertaFamilia").innerHTML = `<div class="familia-alert warn">Revisar seguimiento: ${famEscape(nombre)} tiene ${pendientes} actividad${pendientes === 1 ? "" : "es"} pendiente${pendientes === 1 ? "" : "s"} y ${ausencias} ausencia${ausencias === 1 ? "" : "s"}.</div>`;
  } else {
    fam("alertaFamilia").innerHTML = `<div class="familia-alert ok">Sin alertas prioritarias para ${famEscape(nombre)}.</div>`;
  }

  fam("datosHijo").innerHTML = famItem(
    `${famHijoSeleccionado.alumno_apellido || ""}, ${famHijoSeleccionado.alumno_nombre || ""}`,
    `Curso: ${famHijoSeleccionado.curso || famHijoSeleccionado.curso_nombre || "-"} · Parentesco: ${famHijoSeleccionado.parentesco || "-"} · Email: ${famHijoSeleccionado.alumno_email || "-"}`
  );

  const proximas = actividades.filter(a => !a.entregada).slice(0, 6);
  fam("actividadesHijo").innerHTML = proximas.length ? proximas.map(a => {
    const vencida = a.fecha_entrega && a.fecha_entrega < new Date().toISOString().slice(0, 10);
    return `<article class="familia-task"><h3>${famEscape(a.titulo || "Actividad")}</h3><p>${famEscape(a.descripcion || "Sin descripción")}</p><div class="familia-task-meta"><span class="familia-chip">${famEscape(a.materias?.nombre || "Materia")}</span><span class="familia-chip ${vencida ? "danger" : "warn"}">${vencida ? "Vencida" : `Entrega: ${famFecha(a.fecha_entrega)}`}</span></div></article>`;
  }).join("") : famEmpty("No hay actividades pendientes publicadas.");

  fam("boletinesHijo").innerHTML = boletines.length ? boletines.slice(0, 5).map(b => famItem(
    b.periodos_academicos?.nombre || "Boletín",
    `Promedio general: ${b.promedio_general ?? "-"} · Curso: ${b.cursos?.nombre || famHijoSeleccionado.curso || "-"}`,
    `<span class="portal-badge">Emitido ${famFecha(b.emitido_en)}</span>`
  )).join("") : famEmpty("No hay boletines publicados.");

  fam("seguimientosHijo").innerHTML = seguimientos.length ? seguimientos.slice(0, 10).map(s => famItem(
    `${s.tipo || "Seguimiento"} · ${s.prioridad || "sin prioridad"}`,
    s.descripcion || "",
    `<span class="portal-badge">${famFecha(s.creado_en)}</span>`
  )).join("") : famEmpty("No hay seguimientos visibles para la familia.");

  fam("asistenciaHijo").innerHTML = famTable(
    ["Fecha", "Curso", "Materia", "Estado", "Observación"],
    asistencia.slice(0, 20).map(a => `<tr><td>${famFecha(a.fecha)}</td><td>${famEscape(a.curso || "-")}</td><td>${famEscape(a.materia || "-")}</td><td>${famEstadoBadge(a.estado_codigo, a.estado, a.computa_inasistencia)}</td><td>${famEscape(a.observacion || "-")}</td></tr>`)
  );

  fam("documentosFamilia").innerHTML = documentos.length ? documentos.map(d => famItem(
    d.titulo || "Documento",
    d.descripcion || d.tipo_documento || "Documento habilitado",
    d.puede_usarse_ia ? `<span class="portal-badge">Disponible para ADA IA</span>` : ""
  )).join("") : famEmpty("No hay documentos generales disponibles.");

  famSetStatus(`${famHijoSeleccionado.alumno_apellido || ""}, ${famHijoSeleccionado.alumno_nombre || ""}`, "ok");
}

async function famIniciar() {
  famContexto = await obtenerSesionPerfil();
  if (!famContexto) return;
  famPerfil = famContexto.perfil;
  if (famPerfil.rol !== "familia") return;
  const tieneHijos = await famCargarHijos();
  if (tieneHijos) await famSeleccionarHijo(String(famHijos[0].alumno_id));
}

famIniciar().catch(error => {
  console.error(error);
  famSetStatus("No se pudo cargar", "error");
  if (fam("selectorHijos")) fam("selectorHijos").innerHTML = famEmpty("No se pudo cargar el espacio familiar.");
});
