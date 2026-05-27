
const qs = (id) => document.getElementById(id);

let docentes = [];
let dias = [];
let franjas = [];
let aulas = [];
let materias = [];
let cursos = [];
let clases = [];

function option(items, placeholder = "Seleccionar", labelFn = (x) => x.nombre) {
  return `<option value="">${placeholder}</option>` + items.map(i => `<option value="${i.id}">${labelFn(i)}</option>`).join("");
}

function configurarTabs() {
  document.querySelectorAll(".schedule-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".schedule-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".schedule-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      qs("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

async function cargarBase() {
  await obtenerSesionPerfil();

  const [docRes, diasRes, franjasRes, aulasRes, materiasRes, cursosRes, clasesRes] = await Promise.all([
    supabaseClient.from("profiles").select("id,nombre,apellido,email,rol").eq("rol", "docente").order("apellido"),
    supabaseClient.from("horario_dias").select("*").order("numero"),
    supabaseClient.from("horario_franjas").select("*").order("hora_inicio"),
    supabaseClient.from("aulas").select("*").order("nombre"),
    supabaseClient.from("materias").select("id,nombre,cursos(nombre)").order("nombre"),
    supabaseClient.from("cursos").select("id,nombre").order("nombre"),
    supabaseClient.from("horario_clases").select("*, profiles(nombre,apellido), materias(nombre), cursos(nombre), horario_dias(nombre,numero), horario_franjas(nombre,hora_inicio,hora_fin), aulas(nombre)").order("creado_en", { ascending:false })
  ]);

  for (const res of [docRes, diasRes, franjasRes, aulasRes, materiasRes, cursosRes, clasesRes]) {
    if (res.error) {
      alert("Error al cargar datos de horarios: " + res.error.message);
      console.error(res.error);
      return;
    }
  }

  docentes = docRes.data || [];
  dias = diasRes.data || [];
  franjas = franjasRes.data || [];
  aulas = aulasRes.data || [];
  materias = materiasRes.data || [];
  cursos = cursosRes.data || [];
  clases = clasesRes.data || [];

  llenarSelects();
  await cargarTablas();
}

function llenarSelects() {
  const docenteOpts = option(docentes, "Seleccionar docente", d => `${d.apellido || ""}, ${d.nombre || ""}`);
  ["dispDocente", "restrDocente", "claseDocente"].forEach(id => qs(id).innerHTML = docenteOpts);

  const diaOpts = option(dias, "Seleccionar día");
  ["dispDia", "claseDia"].forEach(id => qs(id).innerHTML = diaOpts);

  const franjaOpts = option(franjas, "Seleccionar franja", f => `${f.nombre} (${f.hora_inicio} - ${f.hora_fin})`);
  ["dispFranja", "claseFranja"].forEach(id => qs(id).innerHTML = franjaOpts);

  qs("claseAula").innerHTML = option(aulas, "Sin aula asignada");
  qs("claseMateria").innerHTML = option(materias, "Seleccionar materia", m => `${m.nombre} - ${m.cursos?.nombre || "Sin curso"}`);
  qs("claseCurso").innerHTML = option(cursos, "Seleccionar curso");
}

function tabla(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>No hay registros cargados.</p>";
  return `<table class="ada-table schedule-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

async function cargarTablas() {
  qs("tablaFranjas").innerHTML = tabla(["Nombre","Inicio","Fin","Turno"], franjas.map(f => `
    <tr><td>${f.nombre}</td><td>${f.hora_inicio}</td><td>${f.hora_fin}</td><td>${f.turno || "-"}</td></tr>
  `));

  qs("tablaAulas").innerHTML = tabla(["Aula","Tipo","Capacidad","Ubicación"], aulas.map(a => `
    <tr><td>${a.nombre}</td><td>${a.tipo || "-"}</td><td>${a.capacidad || "-"}</td><td>${a.ubicacion || "-"}</td></tr>
  `));

  const dispRes = await supabaseClient.from("docente_disponibilidad")
    .select("*, profiles(nombre,apellido), horario_dias(nombre,numero), horario_franjas(nombre,hora_inicio,hora_fin)")
    .order("creado_en", { ascending:false });

  qs("tablaDisponibilidad").innerHTML = tabla(["Docente","Día","Franja","Estado","Observación"], (dispRes.data || []).map(d => `
    <tr>
      <td>${d.profiles?.apellido || ""}, ${d.profiles?.nombre || ""}</td>
      <td>${d.horario_dias?.nombre || "-"}</td>
      <td>${d.horario_franjas?.nombre || "-"}</td>
      <td>${d.disponible ? "<span class='status-ok'>Disponible</span>" : "<span class='status-off'>No disponible</span>"}</td>
      <td>${d.observacion || "-"}</td>
    </tr>
  `));

  const restrRes = await supabaseClient.from("docente_restricciones")
    .select("*, profiles(nombre,apellido)")
    .order("creado_en", { ascending:false });

  qs("tablaRestricciones").innerHTML = tabla(["Docente","Tipo","Prioridad","Descripción"], (restrRes.data || []).map(r => `
    <tr>
      <td>${r.profiles?.apellido || ""}, ${r.profiles?.nombre || ""}</td>
      <td>${r.tipo}</td>
      <td><span class="schedule-badge">${r.prioridad || "-"}</span></td>
      <td>${r.descripcion}</td>
    </tr>
  `));

  qs("tablaClases").innerHTML = tabla(["Docente","Curso","Materia","Día","Franja","Aula"], clases.map(c => `
    <tr>
      <td>${c.profiles?.apellido || ""}, ${c.profiles?.nombre || ""}</td>
      <td>${c.cursos?.nombre || "-"}</td>
      <td>${c.materias?.nombre || "-"}</td>
      <td>${c.horario_dias?.nombre || "-"}</td>
      <td>${c.horario_franjas?.nombre || "-"}<br><small>${c.horario_franjas?.hora_inicio || ""} - ${c.horario_franjas?.hora_fin || ""}</small></td>
      <td>${c.aulas?.nombre || "-"}</td>
    </tr>
  `));
}

async function insertar(tabla, payload, msgId) {
  qs(msgId).textContent = "Guardando...";
  const { error } = await supabaseClient.from(tabla).insert(payload);
  if (error) {
    qs(msgId).textContent = "Error: " + error.message;
    console.error(error);
    return false;
  }
  qs(msgId).textContent = "Guardado correctamente.";
  await cargarBase();
  return true;
}

function configurarForms() {
  qs("formFranja").addEventListener("submit", async e => {
    e.preventDefault();
    const ok = await insertar("horario_franjas", {
      nombre: qs("franjaNombre").value.trim(),
      hora_inicio: qs("franjaInicio").value,
      hora_fin: qs("franjaFin").value,
      turno: qs("franjaTurno").value,
      activo: true
    }, "msgFranja");
    if (ok) e.target.reset();
  });

  qs("formAula").addEventListener("submit", async e => {
    e.preventDefault();
    const ok = await insertar("aulas", {
      nombre: qs("aulaNombre").value.trim(),
      tipo: qs("aulaTipo").value.trim(),
      capacidad: qs("aulaCapacidad").value ? Number(qs("aulaCapacidad").value) : null,
      ubicacion: qs("aulaUbicacion").value.trim(),
      activo: true
    }, "msgAula");
    if (ok) e.target.reset();
  });

  qs("formDisponibilidad").addEventListener("submit", async e => {
    e.preventDefault();
    const ok = await insertar("docente_disponibilidad", {
      docente_id: qs("dispDocente").value,
      dia_id: qs("dispDia").value,
      franja_id: qs("dispFranja").value,
      disponible: qs("dispDisponible").value === "true",
      observacion: qs("dispObservacion").value.trim()
    }, "msgDisponibilidad");
    if (ok) e.target.reset();
  });

  qs("formRestriccion").addEventListener("submit", async e => {
    e.preventDefault();
    const ok = await insertar("docente_restricciones", {
      docente_id: qs("restrDocente").value,
      tipo: qs("restrTipo").value,
      prioridad: qs("restrPrioridad").value,
      descripcion: qs("restrDescripcion").value.trim(),
      activo: true
    }, "msgRestriccion");
    if (ok) e.target.reset();
  });

  qs("formClase").addEventListener("submit", async e => {
    e.preventDefault();

    const conflicto = detectarConflictoNuevaClase({
      docente_id: qs("claseDocente").value,
      curso_id: qs("claseCurso").value,
      aula_id: qs("claseAula").value || null,
      dia_id: qs("claseDia").value,
      franja_id: qs("claseFranja").value
    });

    if (conflicto) {
      qs("msgClase").textContent = conflicto;
      return;
    }

    const ok = await insertar("horario_clases", {
      docente_id: qs("claseDocente").value,
      materia_id: qs("claseMateria").value,
      curso_id: qs("claseCurso").value,
      dia_id: qs("claseDia").value,
      franja_id: qs("claseFranja").value,
      aula_id: qs("claseAula").value || null,
      ciclo_lectivo: qs("claseCiclo").value.trim() || new Date().getFullYear().toString(),
      observacion: qs("claseObservacion").value.trim(),
      activo: true
    }, "msgClase");

    if (ok) e.target.reset();
  });

  qs("btnAnalizarConflictos").addEventListener("click", analizarConflictos);
}

function detectarConflictoNuevaClase(nueva) {
  const mismaFranja = clases.filter(c => c.dia_id === nueva.dia_id && c.franja_id === nueva.franja_id && c.activo);

  if (mismaFranja.some(c => c.docente_id === nueva.docente_id)) {
    return "Conflicto: el docente ya tiene una clase en ese día y franja.";
  }

  if (mismaFranja.some(c => c.curso_id === nueva.curso_id)) {
    return "Conflicto: el curso ya tiene una clase en ese día y franja.";
  }

  if (nueva.aula_id && mismaFranja.some(c => c.aula_id === nueva.aula_id)) {
    return "Conflicto: el aula ya está ocupada en ese día y franja.";
  }

  return null;
}

function analizarConflictos() {
  const conflictos = [];

  for (let i = 0; i < clases.length; i++) {
    for (let j = i + 1; j < clases.length; j++) {
      const a = clases[i], b = clases[j];
      const mismoBloque = a.dia_id === b.dia_id && a.franja_id === b.franja_id;
      if (!mismoBloque) continue;

      if (a.docente_id === b.docente_id) {
        conflictos.push(`Docente superpuesto: ${a.profiles?.apellido || ""} ${a.profiles?.nombre || ""} en ${a.horario_dias?.nombre} - ${a.horario_franjas?.nombre}`);
      }
      if (a.curso_id === b.curso_id) {
        conflictos.push(`Curso superpuesto: ${a.cursos?.nombre || ""} en ${a.horario_dias?.nombre} - ${a.horario_franjas?.nombre}`);
      }
      if (a.aula_id && b.aula_id && a.aula_id === b.aula_id) {
        conflictos.push(`Aula superpuesta: ${a.aulas?.nombre || ""} en ${a.horario_dias?.nombre} - ${a.horario_franjas?.nombre}`);
      }
    }
  }

  const cont = qs("resultadoConflictos");

  if (!clases.length) {
    cont.innerHTML = `<div class="conflict-box conflict-warning">Todavía no hay clases asignadas para analizar.</div>`;
    return;
  }

  if (!conflictos.length) {
    cont.innerHTML = `<div class="conflict-box conflict-ok"><strong>Sin conflictos detectados.</strong><br>ADA no encontró superposición de docente, curso o aula.</div>`;
    return;
  }

  cont.innerHTML = `
    <div class="conflict-box conflict-error">
      <strong>Conflictos detectados: ${conflictos.length}</strong>
      <ul>${conflictos.map(c => `<li>${c}</li>`).join("")}</ul>
    </div>
  `;
}

configurarTabs();
configurarForms();
cargarBase();
