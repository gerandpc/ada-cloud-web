const b25 = (id) => document.getElementById(id);

let b25Contexto = null;
let b25Perfil = null;
let b25Rol = null;
let b25Cursos = [];
let b25Materias = [];
let b25Alumnos = [];
let b25Evaluaciones = [];
let b25Calificaciones = [];
let b25Gradebook = { evaluaciones: {}, calificaciones: {}, alumnos: [] };

const B25_CAN_MANAGE = ["admin", "directivo", "docente"];
const B25_COLUMNAS_ANUALES = [
  { key: "b1_n1", titulo: "1° Bimestre - Nota 1", corto: "Nota 1", grupo: "1° Bimestre", tipo: "Planilla anual", editable: true },
  { key: "b1_n2", titulo: "1° Bimestre - Nota 2", corto: "Nota 2", grupo: "1° Bimestre", tipo: "Planilla anual", editable: true },
  { key: "b1_n3", titulo: "1° Bimestre - Nota 3", corto: "Nota 3", grupo: "1° Bimestre", tipo: "Planilla anual", editable: true },
  { key: "b1_n4", titulo: "1° Bimestre - Nota 4", corto: "Nota 4", grupo: "1° Bimestre", tipo: "Planilla anual", editable: true },
  { key: "b1_cierre", titulo: "1° Bimestre - Cierre", corto: "Bimestre", grupo: "1° Bimestre", tipo: "Cierre", editable: true, cierre: true },
  { key: "c1_n1", titulo: "1° Cuatrimestre - Nota 1", corto: "Nota 1", grupo: "1° Cuatrimestre", tipo: "Planilla anual", editable: true },
  { key: "c1_n2", titulo: "1° Cuatrimestre - Nota 2", corto: "Nota 2", grupo: "1° Cuatrimestre", tipo: "Planilla anual", editable: true },
  { key: "c1_n3", titulo: "1° Cuatrimestre - Nota 3", corto: "Nota 3", grupo: "1° Cuatrimestre", tipo: "Planilla anual", editable: true },
  { key: "c1_n4", titulo: "1° Cuatrimestre - Nota 4", corto: "Nota 4", grupo: "1° Cuatrimestre", tipo: "Planilla anual", editable: true },
  { key: "c1_cierre", titulo: "1° Cuatrimestre - Cierre", corto: "Primer Cuatrimestre", grupo: "1° Cuatrimestre", tipo: "Cierre", editable: true, cierre: true },
  { key: "b3_n1", titulo: "3° Bimestre - Nota 1", corto: "Nota 1", grupo: "3° Bimestre", tipo: "Planilla anual", editable: true },
  { key: "b3_n2", titulo: "3° Bimestre - Nota 2", corto: "Nota 2", grupo: "3° Bimestre", tipo: "Planilla anual", editable: true },
  { key: "b3_n3", titulo: "3° Bimestre - Nota 3", corto: "Nota 3", grupo: "3° Bimestre", tipo: "Planilla anual", editable: true },
  { key: "b3_n4", titulo: "3° Bimestre - Nota 4", corto: "Nota 4", grupo: "3° Bimestre", tipo: "Planilla anual", editable: true },
  { key: "b3_cierre", titulo: "3° Bimestre - Cierre", corto: "3 Bimestre", grupo: "3° Bimestre", tipo: "Cierre", editable: true, cierre: true },
  { key: "c2_n1", titulo: "2° Cuatrimestre - Nota 1", corto: "Nota 1", grupo: "2° Cuatrimestre", tipo: "Planilla anual", editable: true },
  { key: "c2_n2", titulo: "2° Cuatrimestre - Nota 2", corto: "Nota 2", grupo: "2° Cuatrimestre", tipo: "Planilla anual", editable: true },
  { key: "c2_n3", titulo: "2° Cuatrimestre - Nota 3", corto: "Nota 3", grupo: "2° Cuatrimestre", tipo: "Planilla anual", editable: true },
  { key: "c2_n4", titulo: "2° Cuatrimestre - Nota 4", corto: "Nota 4", grupo: "2° Cuatrimestre", tipo: "Planilla anual", editable: true },
  { key: "c2_cierre", titulo: "2° Cuatrimestre - Cierre", corto: "Segundo Cuatrimestre", grupo: "2° Cuatrimestre", tipo: "Cierre", editable: true, cierre: true },
  { key: "diciembre", titulo: "Mesa diciembre", corto: "Diciembre", grupo: "Diciembre", tipo: "Mesa", editable: true, mesa: true },
  { key: "febrero", titulo: "Mesa febrero", corto: "Febrero", grupo: "Febrero", tipo: "Mesa", editable: true, mesa: true }
];
const B25_CIERRES = ["b1_cierre", "c1_cierre", "b3_cierre", "c2_cierre"];

function b25CanManage() { return B25_CAN_MANAGE.includes(b25Rol); }
function b25Value(id) { return (b25(id)?.value || "").trim(); }
function b25NotaAprobacion() { const n = Number(b25Value("notaAprobacion") || 7); return Number.isFinite(n) ? n : 7; }
function b25SelectedCurso() { return b25Value("planillaCurso"); }
function b25SelectedMateria() { return b25Value("planillaMateria"); }
function b25Today() { return new Date().toISOString().slice(0, 10); }
function b25GridKey(columnKey) { return `ADA_GRID:${columnKey}`; }
function b25Escape(v) { return String(v ?? "").replace(/[&<>"]/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[s])); }
function b25NombreAlumno(a) { return `${a.apellido || ""}, ${a.nombre || ""}`.replace(/^,\s*/, "").trim() || a.email || a.id; }
function b25NotaValida(v) { const n = Number(v); return Number.isFinite(n) && n >= 1 && n <= 10 ? n : null; }
function b25CalificacionKey(evaluacionId, alumnoId) { return `${evaluacionId}__${alumnoId}`; }
function b25Option(items, placeholder, getLabel = (x) => x.nombre || x.titulo || x.email || x.id) {
  return `<option value="">${placeholder}</option>` + (items || []).map((item) => `<option value="${item.id}">${b25Escape(getLabel(item))}</option>`).join("");
}

function b25NotaBadge(nota, estado) {
  if (estado === "pendiente") return `<span class="b25-pill warn">Pendiente</span>`;
  if (estado === "ausente") return `<span class="b25-pill danger">Ausente</span>`;
  const n = Number(nota);
  if (!Number.isFinite(n)) return `<span class="b25-pill warn">Sin nota</span>`;
  return `<span class="b25-pill ${n >= b25NotaAprobacion() ? "ok" : "danger"}">${n.toFixed(2)}</span>`;
}

function b25SetMessage(text, ok = true) {
  const el = b25("msgPlanilla");
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("is-error", !ok);
  el.classList.toggle("is-ok", !!ok);
}

function b25InitTabs() {
  document.querySelectorAll(".b25-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".b25-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".b25-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      b25(`tab-${btn.dataset.tab}`)?.classList.add("active");
    });
  });
}

function b25ApplyRoleMode() {
  const canManage = b25CanManage();
  document.querySelectorAll("[data-b25-manage]").forEach(el => { el.style.display = canManage ? "" : "none"; });
  if (!canManage) {
    b25("tablaPlanillaAnual").innerHTML = `<p class="helper-text">Tu rol puede consultar calificaciones, pero no cargar la planilla docente.</p>`;
  }
}

async function b25LoadBase() {
  const [cursosRes, materiasRes, alumnosRes] = await Promise.all([
    supabaseClient.from("cursos").select("id,nombre,nivel,turno,activo").eq("activo", true).order("nombre", { ascending: true }),
    supabaseClient.from("materias").select("id,nombre,curso_id,cursos(id,nombre)").order("nombre", { ascending: true }),
    supabaseClient.from("profiles").select("id,nombre,apellido,email,rol,activo").eq("rol", "alumno").eq("activo", true).order("apellido", { ascending: true })
  ]);
  for (const r of [cursosRes, materiasRes, alumnosRes]) if (r.error) throw r.error;

  b25Cursos = cursosRes.data || [];
  b25Materias = materiasRes.data || [];
  b25Alumnos = alumnosRes.data || [];

  if (b25Rol === "docente") {
    try {
      const dm = await supabaseClient.from("docente_materias").select("materia_id").eq("docente_id", b25Perfil.id).eq("activo", true);
      if (!dm.error && dm.data?.length) {
        const ids = new Set(dm.data.map(x => x.materia_id));
        b25Materias = b25Materias.filter(m => ids.has(m.id));
      }
    } catch (_) {}
  }

  b25("planillaCurso").innerHTML = b25Option(b25Cursos, "Seleccionar curso");
  b25("planillaMateria").innerHTML = b25Option(b25Materias, "Seleccionar materia", m => `${m.nombre || "Materia"}${m.cursos?.nombre ? " · " + m.cursos.nombre : ""}`);
  b25("planillaCiclo").value = new Date().getFullYear();
}

async function b25LoadAlumnosDelCurso(cursoId) {
  if (!cursoId) return [];
  try {
    const rel = await supabaseClient
      .from("alumno_cursos")
      .select("alumno_id, curso_id, alumno:profiles!alumno_cursos_alumno_id_fkey(id,nombre,apellido,email,rol,activo)")
      .eq("curso_id", cursoId)
      .eq("activo", true);
    if (!rel.error && rel.data?.length) {
      return rel.data.map(r => r.alumno).filter(Boolean).sort((a,b) => b25NombreAlumno(a).localeCompare(b25NombreAlumno(b)));
    }
  } catch (_) {}

  try {
    const relSimple = await supabaseClient.from("alumno_cursos").select("alumno_id").eq("curso_id", cursoId).eq("activo", true);
    if (!relSimple.error && relSimple.data?.length) {
      const ids = relSimple.data.map(r => r.alumno_id);
      const prof = await supabaseClient.from("profiles").select("id,nombre,apellido,email,rol,activo").in("id", ids).eq("activo", true);
      if (!prof.error) return (prof.data || []).sort((a,b) => b25NombreAlumno(a).localeCompare(b25NombreAlumno(b)));
    }
  } catch (_) {}

  return b25Alumnos;
}

async function b25EnsureEvaluaciones(cursoId, materiaId) {
  const res = await supabaseClient
    .from("evaluaciones")
    .select("*")
    .eq("curso_id", cursoId)
    .eq("materia_id", materiaId)
    .eq("activo", true);
  if (res.error) throw res.error;

  let actuales = res.data || [];
  const porKey = {};
  for (const ev of actuales) {
    const col = B25_COLUMNAS_ANUALES.find(c => ev.observaciones === b25GridKey(c.key) || ev.titulo === c.titulo);
    if (col && !porKey[col.key]) porKey[col.key] = ev;
  }

  const faltantes = B25_COLUMNAS_ANUALES.filter(col => !porKey[col.key]);
  if (faltantes.length && b25CanManage()) {
    const payload = faltantes.map(col => ({
      curso_id: cursoId,
      materia_id: materiaId,
      titulo: col.titulo,
      tipo: col.tipo,
      fecha: b25Today(),
      ponderacion: col.cierre || col.mesa ? 100 : 25,
      observaciones: b25GridKey(col.key),
      creado_por: b25Perfil.id
    }));
    const ins = await supabaseClient.from("evaluaciones").insert(payload).select("*");
    if (ins.error) throw ins.error;
    actuales = actuales.concat(ins.data || []);
    for (const ev of (ins.data || [])) {
      const col = B25_COLUMNAS_ANUALES.find(c => ev.observaciones === b25GridKey(c.key) || ev.titulo === c.titulo);
      if (col) porKey[col.key] = ev;
    }
  }

  b25Evaluaciones = actuales;
  return porKey;
}

async function b25LoadCalificacionesParaEvaluaciones(evaluacionesPorKey) {
  const evalIds = Object.values(evaluacionesPorKey).map(e => e.id).filter(Boolean);
  if (!evalIds.length) return [];
  const res = await supabaseClient
    .from("calificaciones")
    .select("*, alumno:profiles!calificaciones_alumno_id_fkey(id,nombre,apellido,email), evaluaciones(id,titulo,tipo,fecha,observaciones), materias(id,nombre), cursos(id,nombre)")
    .in("evaluacion_id", evalIds)
    .limit(2000);
  if (res.error) throw res.error;
  return res.data || [];
}

function b25BuildCalifMap(rows) {
  const map = {};
  for (const c of rows || []) map[b25CalificacionKey(c.evaluacion_id, c.alumno_id)] = c;
  return map;
}

function b25GetNota(alumnoId, columnKey) {
  const ev = b25Gradebook.evaluaciones[columnKey];
  if (!ev) return "";
  const c = b25Gradebook.calificaciones[b25CalificacionKey(ev.id, alumnoId)];
  return c?.nota ?? "";
}

function b25PromedioValores(values) {
  const nums = values.map(b25NotaValida).filter(n => n !== null);
  if (!nums.length) return null;
  return nums.reduce((a,b)=>a+b,0) / nums.length;
}

function b25PromedioCierreAlumno(alumnoId) {
  return b25PromedioValores(B25_CIERRES.map(k => b25GetNota(alumnoId, k)));
}

function b25EstadoFinalAlumno(alumnoId) {
  const minimo = b25NotaAprobacion();
  const cierre = b25PromedioCierreAlumno(alumnoId);
  const dic = b25NotaValida(b25GetNota(alumnoId, "diciembre"));
  const feb = b25NotaValida(b25GetNota(alumnoId, "febrero"));
  if (cierre !== null && cierre >= minimo) return { estado: "Aprobado", clase: "ok" };
  if (dic !== null && dic >= minimo) return { estado: "Aprobado en diciembre", clase: "ok" };
  if (feb !== null && feb >= minimo) return { estado: "Aprobado en febrero", clase: "ok" };
  if (dic !== null && dic < minimo) return { estado: "A febrero", clase: "danger" };
  if (cierre !== null && cierre < minimo) return { estado: "A diciembre", clase: "warn" };
  return { estado: "En proceso", clase: "info" };
}

function b25InputNota(alumnoId, columnKey, extraClass = "") {
  const val = b25GetNota(alumnoId, columnKey);
  const disabled = b25CanManage() ? "" : "disabled";
  return `<input class="b25-grade-input ${extraClass}" type="number" min="1" max="10" step="0.01" value="${b25Escape(val)}" data-alumno-id="${alumnoId}" data-col-key="${columnKey}" ${disabled}>`;
}

function b25RenderPlanilla() {
  const alumnos = b25Gradebook.alumnos || [];
  if (!alumnos.length) {
    b25("tablaPlanillaAnual").innerHTML = `<p class="helper-text">No se encontraron alumnos para el curso seleccionado.</p>`;
    return;
  }

  const grupos = [];
  let actual = null;
  for (const col of B25_COLUMNAS_ANUALES.filter(c => !c.mesa)) {
    if (!actual || actual.nombre !== col.grupo) { actual = { nombre: col.grupo, count: 0 }; grupos.push(actual); }
    actual.count++;
  }

  const head1 = `<tr><th class="sticky-col" rowspan="2">Apellido</th><th class="sticky-col-2" rowspan="2">Nombre</th>${grupos.map(g => `<th colspan="${g.count}" class="b25-group-head">${g.nombre}</th>`).join("")}<th rowspan="2" class="b25-final-head">Promedio cierre</th><th rowspan="2" class="b25-final-head">Estado</th></tr>`;
  const head2 = `<tr>${B25_COLUMNAS_ANUALES.filter(c => !c.mesa).map(c => `<th>${c.corto}</th>`).join("")}</tr>`;
  const body = alumnos.map(a => {
    const cierre = b25PromedioCierreAlumno(a.id);
    const estado = b25EstadoFinalAlumno(a.id);
    const cells = B25_COLUMNAS_ANUALES.filter(c => !c.mesa).map(c => `<td>${b25InputNota(a.id, c.key, c.cierre ? "b25-close-input" : "")}</td>`).join("");
    return `<tr><td class="sticky-col"><strong>${b25Escape(a.apellido || "")}</strong></td><td class="sticky-col-2">${b25Escape(a.nombre || a.email || "")}</td>${cells}<td class="b25-average-cell">${cierre === null ? "-" : cierre.toFixed(2)}</td><td><span class="b25-pill ${estado.clase}">${estado.estado}</span></td></tr>`;
  }).join("");

  b25("tablaPlanillaAnual").innerHTML = `<table class="ada-table b25-gradebook-table" id="tablaExportable"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table>`;
  b25("estadoPlanilla").textContent = "Planilla cargada";
  b25RenderMesas();
  b25ActualizarKpis();
}

function b25AlumnosDiciembre() {
  const minimo = b25NotaAprobacion();
  return (b25Gradebook.alumnos || []).filter(a => {
    const cierre = b25PromedioCierreAlumno(a.id);
    const dic = b25NotaValida(b25GetNota(a.id, "diciembre"));
    return cierre !== null && cierre < minimo && (dic === null || dic < minimo);
  });
}

function b25AlumnosFebrero() {
  const minimo = b25NotaAprobacion();
  return (b25Gradebook.alumnos || []).filter(a => {
    const cierre = b25PromedioCierreAlumno(a.id);
    const dic = b25NotaValida(b25GetNota(a.id, "diciembre"));
    const feb = b25NotaValida(b25GetNota(a.id, "febrero"));
    return cierre !== null && cierre < minimo && dic !== null && dic < minimo && (feb === null || feb < minimo);
  });
}

function b25RenderMesa(tablaId, alumnos, columnKey, mensajeVacio) {
  if (!alumnos.length) {
    b25(tablaId).innerHTML = `<p class="helper-text">${mensajeVacio}</p>`;
    return;
  }
  const rows = alumnos.map(a => {
    const cierre = b25PromedioCierreAlumno(a.id);
    const estado = b25EstadoFinalAlumno(a.id);
    return `<tr><td><strong>${b25Escape(a.apellido || "")}</strong></td><td>${b25Escape(a.nombre || a.email || "")}</td><td>${cierre === null ? "-" : cierre.toFixed(2)}</td><td>${b25InputNota(a.id, columnKey)}</td><td><input class="b25-observacion-input" data-alumno-id="${a.id}" data-col-key="${columnKey}" placeholder="Observación"></td><td><span class="b25-pill ${estado.clase}">${estado.estado}</span></td></tr>`;
  }).join("");
  b25(tablaId).innerHTML = `<table class="ada-table b25-mesa-table"><thead><tr><th>Apellido</th><th>Nombre</th><th>Cierre anual</th><th>Nota</th><th>Observación</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function b25RenderMesas() {
  b25RenderMesa("tablaDiciembre", b25AlumnosDiciembre(), "diciembre", "No hay alumnos pendientes para diciembre con los datos actuales.");
  b25RenderMesa("tablaFebrero", b25AlumnosFebrero(), "febrero", "No hay alumnos pendientes para febrero con los datos actuales.");
}

async function b25CargarPlanilla() {
  const cursoId = b25SelectedCurso();
  const materiaId = b25SelectedMateria();
  if (!cursoId || !materiaId) { b25SetMessage("Seleccioná curso y materia para cargar la planilla.", false); return; }
  b25SetMessage("Cargando alumnos, columnas y notas...", true);
  try {
    const [alumnos, evaluacionesPorKey] = await Promise.all([
      b25LoadAlumnosDelCurso(cursoId),
      b25EnsureEvaluaciones(cursoId, materiaId)
    ]);
    b25Gradebook.alumnos = alumnos;
    b25Gradebook.evaluaciones = evaluacionesPorKey;
    const califs = await b25LoadCalificacionesParaEvaluaciones(evaluacionesPorKey);
    b25Calificaciones = califs;
    b25Gradebook.calificaciones = b25BuildCalifMap(califs);
    b25RenderPlanilla();
    b25RenderConsulta();
    b25SetMessage("Planilla cargada. Podés editar en columnas y guardar todo junto.", true);
  } catch (error) {
    console.error(error);
    b25SetMessage("No se pudo cargar la planilla. Verificá el SQL del Bloque 25 y los permisos. Detalle: " + error.message, false);
  }
}

function b25InputsParaGuardar(scopeSelector = ".b25-grade-input") {
  const inputs = Array.from(document.querySelectorAll(scopeSelector));
  return inputs.map(input => ({
    alumnoId: input.dataset.alumnoId,
    columnKey: input.dataset.colKey,
    value: input.value.trim(),
    observacion: document.querySelector(`.b25-observacion-input[data-alumno-id="${input.dataset.alumnoId}"][data-col-key="${input.dataset.colKey}"]`)?.value.trim() || null
  })).filter(x => x.alumnoId && x.columnKey && x.value !== "");
}

async function b25GuardarNotas(scopeSelector = ".b25-grade-input", mensaje = "Guardando notas...") {
  if (!b25CanManage()) return;
  const cursoId = b25SelectedCurso();
  const materiaId = b25SelectedMateria();
  if (!cursoId || !materiaId) { b25SetMessage("Seleccioná curso y materia antes de guardar.", false); return; }
  const items = b25InputsParaGuardar(scopeSelector);
  if (!items.length) { b25SetMessage("No hay notas nuevas para guardar.", false); return; }

  b25SetMessage(mensaje, true);
  const payload = [];
  for (const item of items) {
    const nota = b25NotaValida(item.value);
    const ev = b25Gradebook.evaluaciones[item.columnKey];
    if (!ev || nota === null) continue;
    payload.push({
      evaluacion_id: ev.id,
      alumno_id: item.alumnoId,
      curso_id: cursoId,
      materia_id: materiaId,
      periodo_id: ev.periodo_id || null,
      nota,
      estado: "calificado",
      observacion: item.observacion,
      cargado_por: b25Perfil.id,
      actualizado_en: new Date().toISOString()
    });
  }

  if (!payload.length) { b25SetMessage("Revisá las notas: deben estar entre 1 y 10.", false); return; }
  const { error } = await supabaseClient.from("calificaciones").upsert(payload, { onConflict: "evaluacion_id,alumno_id" });
  if (error) { b25SetMessage("Error al guardar: " + error.message, false); return; }
  b25SetMessage("Notas guardadas correctamente.", true);
  await b25CargarPlanilla();
}

function b25ActualizarCierresVisuales() {
  document.querySelectorAll(".b25-gradebook-table tbody tr").forEach(row => {
    const inputs = Array.from(row.querySelectorAll(".b25-grade-input"));
    // Calcula cierre si queda vacío tomando las cuatro notas del bloque inmediato anterior.
    const keys = inputs.map(i => i.dataset.colKey);
    for (const cierreKey of B25_CIERRES) {
      const idx = keys.indexOf(cierreKey);
      if (idx > 0) {
        const cierreInput = inputs[idx];
        if (!cierreInput.value) {
          const prev = inputs.slice(Math.max(0, idx - 4), idx).map(i => i.value);
          const promedio = b25PromedioValores(prev);
          if (promedio !== null) cierreInput.value = promedio.toFixed(2);
        }
      }
    }
  });
  b25SetMessage("Se actualizaron visualmente los cierres vacíos. Revisá y guardá la planilla.", true);
}

function b25RenderConsulta() {
  if (!b25Calificaciones.length) {
    b25("tablaConsultaCalificaciones").innerHTML = `<p class="helper-text">No hay calificaciones guardadas todavía.</p>`;
    return;
  }
  const rows = b25Calificaciones.slice(0, 200).map(c => `<tr><td>${b25Escape(c.alumno?.apellido || "")}, ${b25Escape(c.alumno?.nombre || "")}</td><td>${b25Escape(c.evaluaciones?.titulo || "-")}</td><td>${b25NotaBadge(c.nota, c.estado)}</td><td>${b25Escape(c.observacion || "-")}</td></tr>`).join("");
  b25("tablaConsultaCalificaciones").innerHTML = `<table class="ada-table"><thead><tr><th>Alumno</th><th>Columna</th><th>Nota</th><th>Observación</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function b25ActualizarKpis() {
  b25("kpiAlumnos").textContent = b25Gradebook.alumnos?.length || 0;
  const notas = [];
  for (const a of b25Gradebook.alumnos || []) {
    for (const col of B25_COLUMNAS_ANUALES) {
      const n = b25NotaValida(b25GetNota(a.id, col.key));
      if (n !== null) notas.push(n);
    }
  }
  b25("kpiCalificaciones").textContent = notas.length;
  b25("kpiPromedio").textContent = notas.length ? (notas.reduce((x,y)=>x+y,0)/notas.length).toFixed(2) : "-";
  b25("kpiPendientes").textContent = b25AlumnosDiciembre().length;
}

function b25ExportarExcel() {
  const curso = b25("planillaCurso")?.selectedOptions?.[0]?.textContent || "Curso";
  const materia = b25("planillaMateria")?.selectedOptions?.[0]?.textContent || "Materia";
  const alumnos = b25Gradebook.alumnos || [];
  if (!alumnos.length) { b25SetMessage("Primero cargá una planilla para exportar.", false); return; }

  const headers = ["Apellido", "Nombre", ...B25_COLUMNAS_ANUALES.map(c => c.corto), "Promedio cierre", "Estado final"];
  const rows = alumnos.map(a => {
    const estado = b25EstadoFinalAlumno(a.id).estado;
    const cierre = b25PromedioCierreAlumno(a.id);
    return [a.apellido || "", a.nombre || a.email || "", ...B25_COLUMNAS_ANUALES.map(c => b25GetNota(a.id, c.key)), cierre === null ? "" : cierre.toFixed(2), estado];
  });
  const htmlRows = [headers, ...rows].map(r => `<tr>${r.map(v => `<td>${b25Escape(v)}</td>`).join("")}</tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table><tr><td><b>Curso:</b></td><td>${b25Escape(curso)}</td></tr><tr><td><b>Materia:</b></td><td>${b25Escape(materia)}</td></tr></table><br><table border="1">${htmlRows}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `calificaciones_${curso}_${materia}`.replace(/[^a-z0-9_-]+/gi, "_") + ".xls";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
}

async function iniciarBloque25Calificaciones() {
  b25InitTabs();
  b25Contexto = await obtenerSesionPerfil();
  if (!b25Contexto) return;
  b25Perfil = b25Contexto.perfil;
  b25Rol = (b25Perfil.rol || "alumno").toString().trim().toLowerCase();
  if (b25Rol === "preceptoria") b25Rol = "preceptor";
  b25ApplyRoleMode();
  try {
    await b25LoadBase();
    b25SetMessage("Seleccioná curso y materia para comenzar.", true);
  } catch (error) {
    console.error(error);
    b25SetMessage("No se pudo cargar Calificaciones. Detalle: " + error.message, false);
  }
}

b25("btnCargarPlanilla")?.addEventListener("click", b25CargarPlanilla);
b25("btnGuardarPlanilla")?.addEventListener("click", () => b25GuardarNotas("#tab-anual .b25-grade-input", "Guardando planilla anual..."));
b25("btnGuardarDiciembre")?.addEventListener("click", () => b25GuardarNotas("#tab-diciembre .b25-grade-input", "Guardando notas de diciembre..."));
b25("btnGuardarFebrero")?.addEventListener("click", () => b25GuardarNotas("#tab-febrero .b25-grade-input", "Guardando notas de febrero..."));
b25("btnCerrarAnio")?.addEventListener("click", b25ActualizarCierresVisuales);
b25("btnExportarExcel")?.addEventListener("click", b25ExportarExcel);
b25("planillaCurso")?.addEventListener("change", () => {
  const cursoId = b25SelectedCurso();
  const materiasCurso = b25Materias.filter(m => !m.curso_id || m.curso_id === cursoId);
  b25("planillaMateria").innerHTML = b25Option(materiasCurso.length ? materiasCurso : b25Materias, "Seleccionar materia", m => `${m.nombre || "Materia"}${m.cursos?.nombre ? " · " + m.cursos.nombre : ""}`);
});

iniciarBloque25Calificaciones();
