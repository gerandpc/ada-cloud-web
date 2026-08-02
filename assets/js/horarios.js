const qs = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[char]));

let docentes = [];
let dias = [];
let franjas = [];
let aulas = [];
let materias = [];
let cursos = [];
let clases = [];
let disponibilidad = [];
let restricciones = [];

function option(items, placeholder = "Seleccionar", labelFn = (x) => x.nombre) {
  return `<option value="">${esc(placeholder)}</option>` + items.map((item) =>
    `<option value="${esc(item.id)}">${esc(labelFn(item))}</option>`
  ).join("");
}

function mensaje(id, text, isError = false) {
  const node = qs(id);
  if (!node) return;
  node.textContent = text;
  node.classList.toggle("form-error", isError);
}

function configurarTabs() {
  document.querySelectorAll(".schedule-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".schedule-tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".schedule-section").forEach((section) => section.classList.remove("active"));
      btn.classList.add("active");
      qs(`tab-${btn.dataset.tab}`)?.classList.add("active");
    });
  });
}

async function cargarBase() {
  await obtenerSesionPerfil();

  const consultas = await Promise.all([
    supabaseClient.from("profiles").select("id,nombre,apellido,email,rol").eq("rol", "docente").eq("activo", true).order("apellido"),
    supabaseClient.from("horario_dias").select("*").order("numero"),
    supabaseClient.from("horario_franjas").select("*").eq("activo", true).order("hora_inicio"),
    supabaseClient.from("aulas").select("*").eq("activo", true).order("nombre"),
    supabaseClient.from("materias").select("id,nombre,cursos(nombre)").eq("activo", true).order("nombre"),
    supabaseClient.from("cursos").select("id,nombre").eq("activo", true).order("nombre"),
    supabaseClient.from("horario_clases").select("*, profiles(nombre,apellido), materias(nombre), cursos(nombre), horario_dias(nombre,numero), horario_franjas(nombre,hora_inicio,hora_fin), aulas(nombre)").eq("activo", true).order("creado_en", { ascending: false }),
    supabaseClient.from("docente_disponibilidad").select("*, profiles(nombre,apellido), horario_dias(nombre,numero), horario_franjas(nombre,hora_inicio,hora_fin)").order("creado_en", { ascending: false }),
    supabaseClient.from("docente_restricciones").select("*, profiles(nombre,apellido)").eq("activo", true).order("creado_en", { ascending: false })
  ]);

  const error = consultas.find((result) => result.error)?.error;
  if (error) {
    console.error(error);
    document.querySelectorAll(".table-wrap").forEach((node) => {
      node.innerHTML = '<p class="helper-text">No fue posible cargar la información de horarios.</p>';
    });
    return;
  }

  [docentes, dias, franjas, aulas, materias, cursos, clases, disponibilidad, restricciones] = consultas.map((result) => result.data || []);
  llenarSelects();
  cargarTablas();
}

function llenarSelects() {
  const docenteOpts = option(docentes, "Seleccionar docente", (d) => `${d.apellido || ""}, ${d.nombre || ""}`.replace(/^,\s*/, ""));
  ["dispDocente", "restrDocente", "claseDocente"].forEach((id) => { qs(id).innerHTML = docenteOpts; });

  const diaOpts = option(dias, "Seleccionar día");
  ["dispDia", "claseDia"].forEach((id) => { qs(id).innerHTML = diaOpts; });

  const franjaOpts = option(franjas, "Seleccionar franja", (f) => `${f.nombre} (${f.hora_inicio} - ${f.hora_fin})`);
  ["dispFranja", "claseFranja"].forEach((id) => { qs(id).innerHTML = franjaOpts; });

  qs("claseAula").innerHTML = option(aulas, "Sin aula asignada");
  qs("claseMateria").innerHTML = option(materias, "Seleccionar materia", (m) => `${m.nombre} - ${m.cursos?.nombre || "Sin curso"}`);
  qs("claseCurso").innerHTML = option(cursos, "Seleccionar curso");
}

function tabla(headers, rows) {
  if (!rows.length) return '<p class="helper-text">No hay registros cargados.</p>';
  return `<table class="ada-table schedule-table"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function cargarTablas() {
  qs("tablaFranjas").innerHTML = tabla(["Nombre", "Inicio", "Fin", "Turno"], franjas.map((f) => `
    <tr><td>${esc(f.nombre)}</td><td>${esc(f.hora_inicio)}</td><td>${esc(f.hora_fin)}</td><td>${esc(f.turno || "-")}</td></tr>`));

  qs("tablaAulas").innerHTML = tabla(["Aula", "Tipo", "Capacidad", "Ubicación"], aulas.map((a) => `
    <tr><td>${esc(a.nombre)}</td><td>${esc(a.tipo || "-")}</td><td>${esc(a.capacidad || "-")}</td><td>${esc(a.ubicacion || "-")}</td></tr>`));

  qs("tablaDisponibilidad").innerHTML = tabla(["Docente", "Día", "Franja", "Estado", "Observación"], disponibilidad.map((d) => `
    <tr><td>${esc(`${d.profiles?.apellido || ""}, ${d.profiles?.nombre || ""}`.replace(/^,\s*/, ""))}</td>
    <td>${esc(d.horario_dias?.nombre || "-")}</td><td>${esc(d.horario_franjas?.nombre || "-")}</td>
    <td>${d.disponible ? '<span class="status-ok">Disponible</span>' : '<span class="status-off">No disponible</span>'}</td>
    <td>${esc(d.observacion || "-")}</td></tr>`));

  qs("tablaRestricciones").innerHTML = tabla(["Docente", "Tipo", "Prioridad", "Descripción"], restricciones.map((r) => `
    <tr><td>${esc(`${r.profiles?.apellido || ""}, ${r.profiles?.nombre || ""}`.replace(/^,\s*/, ""))}</td>
    <td>${esc(r.tipo || "-")}</td><td><span class="schedule-badge">${esc(r.prioridad || "-")}</span></td><td>${esc(r.descripcion || "-")}</td></tr>`));

  qs("tablaClases").innerHTML = tabla(["Docente", "Curso", "Materia", "Día", "Franja", "Aula"], clases.map((c) => `
    <tr><td>${esc(`${c.profiles?.apellido || ""}, ${c.profiles?.nombre || ""}`.replace(/^,\s*/, ""))}</td>
    <td>${esc(c.cursos?.nombre || "-")}</td><td>${esc(c.materias?.nombre || "-")}</td><td>${esc(c.horario_dias?.nombre || "-")}</td>
    <td>${esc(c.horario_franjas?.nombre || "-")}<br><small>${esc(c.horario_franjas?.hora_inicio || "")} - ${esc(c.horario_franjas?.hora_fin || "")}</small></td>
    <td>${esc(c.aulas?.nombre || "-")}</td></tr>`));
}

async function insertar(tablaNombre, payload, msgId) {
  mensaje(msgId, "Guardando...");
  const { error } = await supabaseClient.from(tablaNombre).insert(payload);
  if (error) {
    console.error(error);
    mensaje(msgId, "No fue posible guardar el registro. Verificá que no exista uno igual.", true);
    return false;
  }
  mensaje(msgId, "Guardado correctamente.");
  await cargarBase();
  return true;
}

function validarHorario(inicio, fin) {
  return Boolean(inicio && fin && inicio < fin);
}

function configurarForms() {
  qs("formFranja").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validarHorario(qs("franjaInicio").value, qs("franjaFin").value)) {
      mensaje("msgFranja", "La hora de finalización debe ser posterior a la hora de inicio.", true);
      return;
    }
    const duplicada = franjas.some((f) => f.hora_inicio === qs("franjaInicio").value && f.hora_fin === qs("franjaFin").value);
    if (duplicada) {
      mensaje("msgFranja", "Ya existe una franja con ese horario.", true);
      return;
    }
    const ok = await insertar("horario_franjas", {
      nombre: qs("franjaNombre").value.trim(), hora_inicio: qs("franjaInicio").value,
      hora_fin: qs("franjaFin").value, turno: qs("franjaTurno").value, activo: true
    }, "msgFranja");
    if (ok) e.target.reset();
  });

  qs("formAula").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = qs("aulaNombre").value.trim();
    if (aulas.some((a) => String(a.nombre).trim().toLowerCase() === nombre.toLowerCase())) {
      mensaje("msgAula", "Ya existe un aula con ese nombre.", true);
      return;
    }
    const capacidad = qs("aulaCapacidad").value ? Number(qs("aulaCapacidad").value) : null;
    if (capacidad !== null && capacidad <= 0) {
      mensaje("msgAula", "La capacidad debe ser mayor que cero.", true);
      return;
    }
    const ok = await insertar("aulas", { nombre, tipo: qs("aulaTipo").value.trim(), capacidad, ubicacion: qs("aulaUbicacion").value.trim(), activo: true }, "msgAula");
    if (ok) e.target.reset();
  });

  qs("formDisponibilidad").addEventListener("submit", async (e) => {
    e.preventDefault();
    const docenteId = qs("dispDocente").value, diaId = qs("dispDia").value, franjaId = qs("dispFranja").value;
    if (disponibilidad.some((d) => d.docente_id === docenteId && d.dia_id === diaId && d.franja_id === franjaId)) {
      mensaje("msgDisponibilidad", "Ya existe un registro para ese docente, día y franja.", true);
      return;
    }
    const ok = await insertar("docente_disponibilidad", { docente_id: docenteId, dia_id: diaId, franja_id: franjaId, disponible: qs("dispDisponible").value === "true", observacion: qs("dispObservacion").value.trim() }, "msgDisponibilidad");
    if (ok) e.target.reset();
  });

  qs("formRestriccion").addEventListener("submit", async (e) => {
    e.preventDefault();
    const descripcion = qs("restrDescripcion").value.trim();
    if (descripcion.length < 5) {
      mensaje("msgRestriccion", "La descripción debe explicar la restricción.", true);
      return;
    }
    const ok = await insertar("docente_restricciones", { docente_id: qs("restrDocente").value, tipo: qs("restrTipo").value, prioridad: qs("restrPrioridad").value, descripcion, activo: true }, "msgRestriccion");
    if (ok) e.target.reset();
  });

  qs("formClase").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nueva = { docente_id: qs("claseDocente").value, curso_id: qs("claseCurso").value, aula_id: qs("claseAula").value || null, dia_id: qs("claseDia").value, franja_id: qs("claseFranja").value };
    const conflicto = detectarConflictoNuevaClase(nueva);
    if (conflicto) { mensaje("msgClase", conflicto, true); return; }
    const ok = await insertar("horario_clases", {
      ...nueva, materia_id: qs("claseMateria").value,
      ciclo_lectivo: qs("claseCiclo").value.trim() || String(new Date().getFullYear()),
      observacion: qs("claseObservacion").value.trim(), activo: true
    }, "msgClase");
    if (ok) e.target.reset();
  });

  qs("btnAnalizarConflictos").addEventListener("click", analizarConflictos);
  qs("btnPdfHorarios")?.addEventListener("click", exportarHorariosPdf);
  qs("btnPdfDisponibilidad")?.addEventListener("click", exportarDisponibilidadPdf);
}

function detectarConflictoNuevaClase(nueva) {
  const mismaFranja = clases.filter((c) => c.dia_id === nueva.dia_id && c.franja_id === nueva.franja_id && c.activo !== false);
  if (mismaFranja.some((c) => c.docente_id === nueva.docente_id)) return "Conflicto: el docente ya tiene una clase en ese día y franja.";
  if (mismaFranja.some((c) => c.curso_id === nueva.curso_id)) return "Conflicto: el curso ya tiene una clase en ese día y franja.";
  if (nueva.aula_id && mismaFranja.some((c) => c.aula_id === nueva.aula_id)) return "Conflicto: el aula ya está ocupada en ese día y franja.";
  return null;
}

function analizarConflictos() {
  const conflictos = [];
  for (let i = 0; i < clases.length; i += 1) {
    for (let j = i + 1; j < clases.length; j += 1) {
      const a = clases[i], b = clases[j];
      if (a.dia_id !== b.dia_id || a.franja_id !== b.franja_id) continue;
      if (a.docente_id === b.docente_id) conflictos.push(`Docente superpuesto: ${a.profiles?.apellido || ""} ${a.profiles?.nombre || ""} en ${a.horario_dias?.nombre || "-"} - ${a.horario_franjas?.nombre || "-"}`);
      if (a.curso_id === b.curso_id) conflictos.push(`Curso superpuesto: ${a.cursos?.nombre || "-"} en ${a.horario_dias?.nombre || "-"} - ${a.horario_franjas?.nombre || "-"}`);
      if (a.aula_id && b.aula_id && a.aula_id === b.aula_id) conflictos.push(`Aula superpuesta: ${a.aulas?.nombre || "-"} en ${a.horario_dias?.nombre || "-"} - ${a.horario_franjas?.nombre || "-"}`);
    }
  }
  const cont = qs("resultadoConflictos");
  if (!clases.length) { cont.innerHTML = '<div class="conflict-box conflict-warning">No hay clases asignadas para analizar.</div>'; return; }
  if (!conflictos.length) { cont.innerHTML = '<div class="conflict-box conflict-ok"><strong>Sin conflictos detectados.</strong><br>No se encontraron superposiciones de docente, curso o aula.</div>'; return; }
  cont.innerHTML = `<div class="conflict-box conflict-error"><strong>Conflictos detectados: ${conflictos.length}</strong><ul>${conflictos.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`;
}

function abrirDocumento(titulo, subtitulo, headers, rows) {
  if (!window.ADAExport?.exportMapped) return;
  window.ADAExport.exportMapped({ titulo, subtitulo, headers, rows });
}

function exportarHorariosPdf() {
  abrirDocumento("Horario general de clases", `Registros: ${clases.length}`, ["Docente", "Curso", "Materia", "Día", "Franja", "Aula"], clases.map((c) => [
    `${c.profiles?.apellido || ""}, ${c.profiles?.nombre || ""}`.replace(/^,\s*/, ""), c.cursos?.nombre || "-", c.materias?.nombre || "-",
    c.horario_dias?.nombre || "-", `${c.horario_franjas?.nombre || "-"} ${c.horario_franjas?.hora_inicio || ""}-${c.horario_franjas?.hora_fin || ""}`, c.aulas?.nombre || "-"
  ]));
}

function exportarDisponibilidadPdf() {
  abrirDocumento("Disponibilidad y restricciones docentes", `Disponibilidades: ${disponibilidad.length} · Restricciones: ${restricciones.length}`, ["Docente", "Tipo", "Día / prioridad", "Franja", "Detalle"], [
    ...disponibilidad.map((d) => [`${d.profiles?.apellido || ""}, ${d.profiles?.nombre || ""}`.replace(/^,\s*/, ""), d.disponible ? "Disponible" : "No disponible", d.horario_dias?.nombre || "-", d.horario_franjas?.nombre || "-", d.observacion || "-"]),
    ...restricciones.map((r) => [`${r.profiles?.apellido || ""}, ${r.profiles?.nombre || ""}`.replace(/^,\s*/, ""), r.tipo || "Restricción", r.prioridad || "-", "-", r.descripcion || "-"])
  ]);
}

configurarTabs();
configurarForms();
cargarBase();
