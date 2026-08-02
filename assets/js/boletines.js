const bb = (id) => document.getElementById(id);
let bbContexto = null;
let bbPerfil = null;
let bbRol = null;
let bbPeriodos = [];
let bbCursos = [];
let bbAlumnos = [];
let bbBoletines = [];
let bbSeleccionado = null;

const BB_CAN_DRAFT = ["admin", "secretaria"];
const BB_CAN_REVIEW = ["admin", "directivo"];
const BB_CAN_ISSUE = ["admin", "directivo", "secretaria"];
const BB_VISIBLE_PUBLIC = ["alumno", "familia"];

function bbEscape(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}
function bbFecha(v) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-AR");
}
function bbNombreAlumno(a) {
  return `${a?.apellido || ""}, ${a?.nombre || ""}`.replace(/^,\s*/, "").trim() || a?.email || "Alumno";
}
function bbSetMessage(id, text, type = "") {
  const el = bb(id);
  if (!el) return;
  el.textContent = text || "";
  el.className = `form-message${type ? ` is-${type}` : ""}`;
}
function bbOption(items, placeholder, getLabel = x => x.nombre || x.email || x.id) {
  return `<option value="">${bbEscape(placeholder)}</option>` + (items || []).map(item =>
    `<option value="${bbEscape(item.id)}">${bbEscape(getLabel(item))}</option>`
  ).join("");
}
function bbTable(headers, rows) {
  if (!rows.length) return `<p class="helper-text">No hay información para mostrar.</p>`;
  return `<table class="ada-table"><thead><tr>${headers.map(h => `<th>${bbEscape(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}
function bbEstadoLabel(estado) {
  return ({
    borrador: "Borrador",
    revision: "En revisión",
    observado: "Observado",
    aprobado: "Aprobado",
    emitido: "Emitido"
  })[estado] || estado || "Borrador";
}
function bbEstadoClass(estado) {
  if (["aprobado", "emitido"].includes(estado)) return "ok";
  if (["observado"].includes(estado)) return "danger";
  return "warn";
}

function bbInitTabs() {
  document.querySelectorAll(".b25-tab").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".b25-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".b25-section").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    bb(`tab-${btn.dataset.tab}`)?.classList.add("active");
  }));
}
function bbApplyRoleMode() {
  document.querySelectorAll("[data-boletin-draft]").forEach(el => el.hidden = !BB_CAN_DRAFT.includes(bbRol));
  document.querySelectorAll("[data-boletin-review]").forEach(el => el.hidden = !BB_CAN_REVIEW.includes(bbRol));
  const publicOnly = BB_VISIBLE_PUBLIC.includes(bbRol);
  document.querySelectorAll("[data-boletin-management]").forEach(el => el.hidden = publicOnly);
  if (publicOnly) {
    document.querySelector('[data-tab="consulta"]')?.click();
  }
}
function bbSetupError(error) {
  console.error(error);
  ["vistaPreviaBoletin", "tablaBoletines", "tablaRevisionBoletines"].forEach(id => {
    const el = bb(id);
    if (el) el.innerHTML = `<p class="form-message is-error">No se pudo cargar la información de boletines.</p>`;
  });
}

async function bbLoadBase() {
  const [periodosRes, cursosRes, alumnosRes] = await Promise.all([
    supabaseClient.from("periodos_academicos").select("*").eq("activo", true).order("orden", { ascending: true }),
    supabaseClient.from("cursos").select("id,nombre").eq("activo", true).order("nombre", { ascending: true }),
    supabaseClient.from("profiles").select("id,nombre,apellido,email,rol,activo").eq("rol", "alumno").eq("activo", true).order("apellido", { ascending: true })
  ]);
  for (const r of [periodosRes, cursosRes, alumnosRes]) if (r.error) throw r.error;
  bbPeriodos = periodosRes.data || [];
  bbCursos = cursosRes.data || [];
  bbAlumnos = alumnosRes.data || [];

  if (bbRol === "alumno") bbAlumnos = bbAlumnos.filter(a => a.id === bbPerfil.id);
  if (bbRol === "familia") {
    const vinc = await supabaseClient.from("v_familia_hijos").select("alumno_id").eq("familia_id", bbPerfil.id);
    if (vinc.error) throw vinc.error;
    const ids = new Set((vinc.data || []).map(x => x.alumno_id));
    bbAlumnos = bbAlumnos.filter(a => ids.has(a.id));
  }

  const alumnoLabel = a => `${a.apellido || ""}, ${a.nombre || ""}${a.email ? ` · ${a.email}` : ""}`;
  ["boletinAlumno", "filtroBoletinAlumno"].forEach(id => {
    if (bb(id)) bb(id).innerHTML = bbOption(bbAlumnos, "Seleccionar alumno", alumnoLabel);
  });
  if (bb("boletinCurso")) bb("boletinCurso").innerHTML = bbOption(bbCursos, "Seleccionar curso");
  ["boletinPeriodo", "filtroBoletinPeriodo"].forEach(id => {
    if (bb(id)) bb(id).innerHTML = bbOption(bbPeriodos, "Seleccionar período");
  });
}

async function bbLoadBoletines() {
  let query = supabaseClient
    .from("boletines")
    .select("*, alumno:profiles!boletines_alumno_id_fkey(id,nombre,apellido,email), cursos(id,nombre), periodos_academicos(id,nombre)")
    .order("emitido_en", { ascending: false })
    .limit(500);

  if (bbRol === "alumno") query = query.eq("alumno_id", bbPerfil.id).eq("estado", "emitido");
  if (bbRol === "familia") {
    const ids = bbAlumnos.map(a => a.id);
    if (!ids.length) {
      bbBoletines = [];
      renderBoletines([]);
      renderRevision([]);
      return;
    }
    query = query.in("alumno_id", ids).eq("estado", "emitido");
  }

  const res = await query;
  if (res.error) throw res.error;
  bbBoletines = res.data || [];
  renderBoletines(bbBoletines);
  renderRevision(bbBoletines.filter(b => ["revision", "observado", "aprobado"].includes(b.estado)));
}

function bbAcciones(b) {
  const actions = [];
  actions.push(`<button type="button" class="btn-secondary btn-small" data-bb-view="${bbEscape(b.id)}">Ver</button>`);
  actions.push(`<button type="button" class="btn-secondary btn-small" data-bb-pdf="${bbEscape(b.id)}">PDF</button>`);
  if (BB_CAN_DRAFT.includes(bbRol) && ["borrador", "observado"].includes(b.estado)) {
    actions.push(`<button type="button" class="btn-primary btn-small" data-bb-submit="${bbEscape(b.id)}">Enviar a revisión</button>`);
  }
  if (BB_CAN_REVIEW.includes(bbRol) && b.estado === "revision") {
    actions.push(`<button type="button" class="btn-primary btn-small" data-bb-approve="${bbEscape(b.id)}">Aprobar</button>`);
    actions.push(`<button type="button" class="btn-secondary btn-small" data-bb-observe="${bbEscape(b.id)}">Observar</button>`);
  }
  if (BB_CAN_ISSUE.includes(bbRol) && b.estado === "aprobado") {
    actions.push(`<button type="button" class="btn-primary btn-small" data-bb-issue="${bbEscape(b.id)}">Emitir</button>`);
  }
  return `<div class="b25-actions">${actions.join("")}</div>`;
}

function renderBoletines(rows) {
  if (!bb("tablaBoletines")) return;
  const filtered = BB_VISIBLE_PUBLIC.includes(bbRol) ? rows.filter(b => b.estado === "emitido") : rows;
  bb("tablaBoletines").innerHTML = bbTable(
    ["Alumno", "Curso", "Período", "Promedio", "Estado", "Fecha", "Acciones"],
    filtered.map(b => `<tr>
      <td>${bbEscape(bbNombreAlumno(b.alumno))}</td>
      <td>${bbEscape(b.cursos?.nombre || "-")}</td>
      <td>${bbEscape(b.periodos_academicos?.nombre || "-")}</td>
      <td><span class="b25-pill ${Number(b.promedio_general) >= 7 ? "ok" : "warn"}">${bbEscape(b.promedio_general ?? "-")}</span></td>
      <td><span class="b25-pill ${bbEstadoClass(b.estado)}">${bbEscape(bbEstadoLabel(b.estado))}</span></td>
      <td>${bbEscape(bbFecha(b.emitido_en || b.created_at))}</td>
      <td>${bbAcciones(b)}</td>
    </tr>`)
  );
  bbBindActions(bb("tablaBoletines"));
}

function renderRevision(rows) {
  if (!bb("tablaRevisionBoletines")) return;
  bb("tablaRevisionBoletines").innerHTML = bbTable(
    ["Alumno", "Curso", "Período", "Promedio", "Estado", "Acciones"],
    rows.map(b => `<tr>
      <td>${bbEscape(bbNombreAlumno(b.alumno))}</td>
      <td>${bbEscape(b.cursos?.nombre || "-")}</td>
      <td>${bbEscape(b.periodos_academicos?.nombre || "-")}</td>
      <td>${bbEscape(b.promedio_general ?? "-")}</td>
      <td><span class="b25-pill ${bbEstadoClass(b.estado)}">${bbEscape(bbEstadoLabel(b.estado))}</span></td>
      <td>${bbAcciones(b)}</td>
    </tr>`)
  );
  bbBindActions(bb("tablaRevisionBoletines"));
}

async function bbGetDetalle(boletinId) {
  const { data, error } = await supabaseClient
    .from("boletin_detalles")
    .select("*, materias(id,nombre)")
    .eq("boletin_id", boletinId)
    .order("materia_id", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function bbMostrar(boletinId) {
  const b = bbBoletines.find(x => x.id === boletinId);
  if (!b) return;
  bbSeleccionado = b;
  try {
    const detalle = await bbGetDetalle(boletinId);
    const encabezado = `<div class="panel-card"><h3>${bbEscape(bbNombreAlumno(b.alumno))}</h3><p>${bbEscape(b.cursos?.nombre || "Curso")} · ${bbEscape(b.periodos_academicos?.nombre || "Período")}</p><p><strong>Promedio general:</strong> ${bbEscape(b.promedio_general ?? "-")} · <strong>Estado:</strong> ${bbEscape(bbEstadoLabel(b.estado))}</p>${b.observacion_general ? `<p><strong>Observación:</strong> ${bbEscape(b.observacion_general)}</p>` : ""}</div>`;
    const tabla = bbTable(["Materia", "Promedio", "Estado"], detalle.map(d => `<tr><td>${bbEscape(d.materias?.nombre || "-")}</td><td>${bbEscape(d.promedio_materia ?? "-")}</td><td>${bbEscape(d.estado || "-")}</td></tr>`));
    bb("vistaPreviaBoletin").innerHTML = encabezado + tabla;
  } catch (error) {
    bbSetMessage("msgBoletin", "No se pudo consultar el detalle del boletín.", "error");
  }
}

async function bbExportar(boletinId) {
  const b = bbBoletines.find(x => x.id === boletinId);
  if (!b) return;
  try {
    const detalle = await bbGetDetalle(boletinId);
    const body = `
      <table>
        <tr><th>Alumno</th><td>${bbEscape(bbNombreAlumno(b.alumno))}</td></tr>
        <tr><th>Curso</th><td>${bbEscape(b.cursos?.nombre || "-")}</td></tr>
        <tr><th>Período</th><td>${bbEscape(b.periodos_academicos?.nombre || "-")}</td></tr>
        <tr><th>Promedio general</th><td>${bbEscape(b.promedio_general ?? "-")}</td></tr>
        <tr><th>Estado</th><td>${bbEscape(bbEstadoLabel(b.estado))}</td></tr>
        <tr><th>Fecha de emisión</th><td>${bbEscape(bbFecha(b.emitido_en))}</td></tr>
        ${b.observacion_general ? `<tr><th>Observación</th><td>${bbEscape(b.observacion_general)}</td></tr>` : ""}
      </table>
      ${bbTable(["Materia", "Promedio", "Estado"], detalle.map(d => `<tr><td>${bbEscape(d.materias?.nombre || "-")}</td><td>${bbEscape(d.promedio_materia ?? "-")}</td><td>${bbEscape(d.estado || "-")}</td></tr>`))}`;
    if (window.ADAExport?.openDocument) {
      window.ADAExport.openDocument(`Boletín · ${bbNombreAlumno(b.alumno)}`, body);
    }
  } catch (error) {
    alert("No se pudo generar el documento del boletín.");
  }
}

async function bbUpdateEstado(id, estado, observacion = null) {
  const payload = { estado };
  if (observacion !== null) payload.observacion_general = observacion;
  if (estado === "emitido") {
    payload.emitido_en = new Date().toISOString();
    payload.emitido_por = bbPerfil.id;
  }
  const { error } = await supabaseClient.from("boletines").update(payload).eq("id", id);
  if (error) throw error;
  await bbLoadBoletines();
}

function bbBindActions(container) {
  if (!container) return;
  container.querySelectorAll("[data-bb-view]").forEach(btn => btn.addEventListener("click", () => bbMostrar(btn.dataset.bbView)));
  container.querySelectorAll("[data-bb-pdf]").forEach(btn => btn.addEventListener("click", () => bbExportar(btn.dataset.bbPdf)));
  container.querySelectorAll("[data-bb-submit]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Enviar este boletín a revisión directiva?")) return;
    try { await bbUpdateEstado(btn.dataset.bbSubmit, "revision"); } catch { alert("No se pudo enviar el boletín a revisión."); }
  }));
  container.querySelectorAll("[data-bb-approve]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Aprobar este boletín para su emisión?")) return;
    try { await bbUpdateEstado(btn.dataset.bbApprove, "aprobado"); } catch { alert("No se pudo aprobar el boletín."); }
  }));
  container.querySelectorAll("[data-bb-observe]").forEach(btn => btn.addEventListener("click", async () => {
    const obs = prompt("Indique la observación que debe corregirse:");
    if (obs === null) return;
    if (!obs.trim()) { alert("La observación es obligatoria."); return; }
    try { await bbUpdateEstado(btn.dataset.bbObserve, "observado", obs.trim()); } catch { alert("No se pudo registrar la observación."); }
  }));
  container.querySelectorAll("[data-bb-issue]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Emitir y publicar este boletín para el alumno y su familia?")) return;
    try { await bbUpdateEstado(btn.dataset.bbIssue, "emitido"); } catch { alert("No se pudo emitir el boletín."); }
  }));
}

async function generarBoletin(e) {
  e.preventDefault();
  if (!BB_CAN_DRAFT.includes(bbRol)) return;
  const alumnoId = bb("boletinAlumno").value;
  const periodoId = bb("boletinPeriodo").value;
  const cursoId = bb("boletinCurso").value || null;
  if (!alumnoId || !periodoId) {
    bbSetMessage("msgBoletin", "Seleccioná alumno y período.", "error");
    return;
  }
  bbSetMessage("msgBoletin", "Calculando calificaciones...");
  try {
    const cal = await supabaseClient
      .from("calificaciones")
      .select("nota,estado,materia_id,materias(id,nombre)")
      .eq("alumno_id", alumnoId)
      .eq("periodo_id", periodoId);
    if (cal.error) throw cal.error;
    const notas = (cal.data || []).map(c => Number(c.nota)).filter(n => Number.isFinite(n));
    if (!notas.length) {
      bbSetMessage("msgBoletin", "No hay calificaciones válidas para generar el boletín.", "error");
      return;
    }
    const promedio = Number((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2));
    const existingRes = await supabaseClient.from("boletines").select("id,estado").eq("alumno_id", alumnoId).eq("periodo_id", periodoId).maybeSingle();
    if (existingRes.error) throw existingRes.error;
    if (existingRes.data?.estado === "emitido") {
      bbSetMessage("msgBoletin", "Ya existe un boletín emitido para este alumno y período.", "error");
      return;
    }

    const payload = {
      alumno_id: alumnoId,
      curso_id: cursoId,
      periodo_id: periodoId,
      promedio_general: promedio,
      estado: "borrador",
      observacion_general: bb("boletinObservacion").value.trim() || null,
      emitido_por: null,
      emitido_en: null
    };

    let boletinId;
    if (existingRes.data?.id) {
      const upd = await supabaseClient.from("boletines").update(payload).eq("id", existingRes.data.id).select().single();
      if (upd.error) throw upd.error;
      boletinId = upd.data.id;
      await supabaseClient.from("boletin_detalles").delete().eq("boletin_id", boletinId);
    } else {
      const ins = await supabaseClient.from("boletines").insert(payload).select().single();
      if (ins.error) throw ins.error;
      boletinId = ins.data.id;
    }

    const detalle = (cal.data || []).map(c => ({
      boletin_id: boletinId,
      materia_id: c.materia_id,
      promedio_materia: Number.isFinite(Number(c.nota)) ? Number(c.nota) : null,
      estado: c.estado || "calificado"
    }));
    if (detalle.length) {
      const det = await supabaseClient.from("boletin_detalles").insert(detalle);
      if (det.error) throw det.error;
    }

    bbSetMessage("msgBoletin", "Boletín guardado como borrador.", "success");
    e.target.reset();
    await bbLoadBoletines();
    await bbMostrar(boletinId);
  } catch (error) {
    console.error(error);
    bbSetMessage("msgBoletin", "No se pudo guardar el boletín.", "error");
  }
}

function filtrarBoletines() {
  const a = bb("filtroBoletinAlumno")?.value || "";
  const p = bb("filtroBoletinPeriodo")?.value || "";
  const e = bb("filtroBoletinEstado")?.value || "";
  renderBoletines(bbBoletines.filter(b => (!a || b.alumno_id === a) && (!p || b.periodo_id === p) && (!e || b.estado === e)));
}

async function iniciarBoletines() {
  bbInitTabs();
  bbContexto = await obtenerSesionPerfil();
  if (!bbContexto) return;
  bbPerfil = bbContexto.perfil;
  bbRol = bbPerfil.rol;
  bbApplyRoleMode();
  try {
    await bbLoadBase();
    await bbLoadBoletines();
  } catch (error) {
    bbSetupError(error);
  }
}

bb("formBoletin")?.addEventListener("submit", generarBoletin);
bb("btnBuscarBoletines")?.addEventListener("click", filtrarBoletines);
bb("btnLimpiarBoletines")?.addEventListener("click", () => {
  ["filtroBoletinAlumno", "filtroBoletinPeriodo", "filtroBoletinEstado"].forEach(id => { if (bb(id)) bb(id).value = ""; });
  renderBoletines(bbBoletines);
});
iniciarBoletines();
