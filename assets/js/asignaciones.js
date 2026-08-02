const qs = (id) => document.getElementById(id);
let perfiles = [];
let cursos = [];
let materias = [];

function text(value, fallback = "") {
  const normalized = value === null || value === undefined ? "" : String(value).trim();
  return normalized || fallback;
}

function clearAndAppend(select, placeholder, items, getLabel) {
  select.replaceChildren();
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = getLabel(item);
    select.appendChild(option);
  });
}

function createStatus(active) {
  const span = document.createElement("span");
  span.className = active ? "status-ok" : "status-off";
  span.textContent = active ? "Activo" : "Inactivo";
  return span;
}

function renderTable(containerId, headers, records, cellBuilder) {
  const container = qs(containerId);
  container.replaceChildren();

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "No hay asignaciones registradas.";
    container.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "ada-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  records.forEach((record) => {
    const tr = document.createElement("tr");
    cellBuilder(record).forEach((cellValue) => {
      const td = document.createElement("td");
      if (cellValue instanceof Node) td.appendChild(cellValue);
      else td.textContent = text(cellValue, "-");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  container.appendChild(table);
}

async function requireAdministrator() {
  const perfil = await obtenerSesionPerfil();
  if (!perfil || perfil.rol !== "admin") {
    window.location.replace("dashboard.html");
    throw new Error("Acceso restringido a Administración.");
  }
  return perfil;
}

async function cargarBase() {
  await requireAdministrator();

  const [profilesRes, cursosRes, materiasRes] = await Promise.all([
    supabaseClient.from("profiles").select("id, nombre, apellido, email, rol, activo").eq("activo", true).order("apellido", { ascending: true }),
    supabaseClient.from("cursos").select("id, nombre").order("nombre", { ascending: true }),
    supabaseClient.from("materias").select("id, nombre, cursos(nombre)").order("nombre", { ascending: true })
  ]);

  for (const result of [profilesRes, cursosRes, materiasRes]) {
    if (result.error) {
      console.error(result.error);
      throw new Error("No fue posible cargar la información necesaria para gestionar asignaciones.");
    }
  }

  perfiles = profilesRes.data || [];
  cursos = cursosRes.data || [];
  materias = materiasRes.data || [];

  clearAndAppend(qs("docenteSelect"), "Seleccionar docente", perfiles.filter((p) => p.rol === "docente"), (u) => `${text(u.apellido)}, ${text(u.nombre)} — ${text(u.email)}`);
  clearAndAppend(qs("alumnoSelect"), "Seleccionar alumno", perfiles.filter((p) => p.rol === "alumno"), (u) => `${text(u.apellido)}, ${text(u.nombre)} — ${text(u.email)}`);
  clearAndAppend(qs("alumnoFamiliaSelect"), "Seleccionar alumno", perfiles.filter((p) => p.rol === "alumno"), (u) => `${text(u.apellido)}, ${text(u.nombre)} — ${text(u.email)}`);
  clearAndAppend(qs("familiaSelect"), "Seleccionar familia", perfiles.filter((p) => p.rol === "familia"), (u) => `${text(u.apellido)}, ${text(u.nombre)} — ${text(u.email)}`);
  clearAndAppend(qs("cursoSelect"), "Seleccionar curso", cursos, (c) => text(c.nombre, "Curso sin nombre"));
  clearAndAppend(qs("materiaSelect"), "Seleccionar materia", materias, (m) => `${text(m.nombre, "Materia sin nombre")} — ${text(m.cursos?.nombre, "Sin curso")}`);

  await cargarTablas();
}

async function insertar(tabla, payload, messageId, duplicateFilter) {
  const message = qs(messageId);
  message.textContent = "Guardando…";

  if (Object.values(payload).some((value) => value === "" || value === null || value === undefined)) {
    message.textContent = "Completá todos los campos obligatorios.";
    return;
  }

  const duplicateQuery = supabaseClient.from(tabla).select("id").match(duplicateFilter).limit(1);
  const duplicateResult = await duplicateQuery;
  if (duplicateResult.error) {
    console.error(duplicateResult.error);
    message.textContent = "No fue posible validar la asignación.";
    return;
  }
  if ((duplicateResult.data || []).length) {
    message.textContent = "La asignación ya se encuentra registrada.";
    return;
  }

  const { error } = await supabaseClient.from(tabla).insert(payload);
  if (error) {
    console.error(error);
    message.textContent = "No fue posible guardar la asignación.";
    return;
  }

  message.textContent = "Asignación guardada correctamente.";
  await cargarTablas();
}

async function cargarTablas() {
  const [dm, ac, fa] = await Promise.all([
    supabaseClient.from("docente_materias").select("*, profiles(nombre, apellido, email), materias(nombre, cursos(nombre))").order("creado_en", { ascending: false }),
    supabaseClient.from("alumno_cursos").select("*, profiles(nombre, apellido, email), cursos(nombre)").order("creado_en", { ascending: false }),
    supabaseClient.from("familia_alumnos").select("*, familia:profiles!familia_alumnos_familia_id_fkey(nombre, apellido, email), alumno:profiles!familia_alumnos_alumno_id_fkey(nombre, apellido, email)").order("creado_en", { ascending: false })
  ]);

  for (const result of [dm, ac, fa]) {
    if (result.error) console.error(result.error);
  }

  renderTable("tablaDocenteMaterias", ["Docente", "Materia", "Curso", "Estado"], dm.data || [], (r) => [
    `${text(r.profiles?.apellido)}, ${text(r.profiles?.nombre)}`,
    r.materias?.nombre,
    r.materias?.cursos?.nombre,
    createStatus(Boolean(r.activo))
  ]);

  renderTable("tablaAlumnoCursos", ["Alumno", "Curso", "Ciclo", "Estado"], ac.data || [], (r) => [
    `${text(r.profiles?.apellido)}, ${text(r.profiles?.nombre)}`,
    r.cursos?.nombre,
    r.ciclo_lectivo,
    createStatus(Boolean(r.activo))
  ]);

  renderTable("tablaFamiliaAlumnos", ["Familia", "Alumno", "Parentesco", "Estado"], fa.data || [], (r) => [
    `${text(r.familia?.apellido)}, ${text(r.familia?.nombre)}`,
    `${text(r.alumno?.apellido)}, ${text(r.alumno?.nombre)}`,
    r.parentesco,
    createStatus(Boolean(r.activo))
  ]);
}

qs("formDocenteMateria")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const docenteId = qs("docenteSelect").value;
  const materiaId = qs("materiaSelect").value;
  await insertar("docente_materias", { docente_id: docenteId, materia_id: materiaId, activo: true }, "msgDocenteMateria", { docente_id: docenteId, materia_id: materiaId, activo: true });
});

qs("formAlumnoCurso")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const alumnoId = qs("alumnoSelect").value;
  const cursoId = qs("cursoSelect").value;
  const cicloLectivo = text(qs("cicloLectivo").value, String(new Date().getFullYear()));
  await insertar("alumno_cursos", { alumno_id: alumnoId, curso_id: cursoId, ciclo_lectivo: cicloLectivo, activo: true }, "msgAlumnoCurso", { alumno_id: alumnoId, curso_id: cursoId, ciclo_lectivo: cicloLectivo, activo: true });
});

qs("formFamiliaAlumno")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const familiaId = qs("familiaSelect").value;
  const alumnoId = qs("alumnoFamiliaSelect").value;
  const parentesco = text(qs("parentesco").value);
  await insertar("familia_alumnos", { familia_id: familiaId, alumno_id: alumnoId, parentesco, activo: true }, "msgFamiliaAlumno", { familia_id: familiaId, alumno_id: alumnoId, activo: true });
});

cargarBase().catch((error) => {
  console.error(error);
  const message = document.querySelector(".page-message") || document.createElement("p");
  message.className = "page-message helper-text";
  message.textContent = error.message || "No fue posible cargar el módulo de asignaciones.";
  document.querySelector("main")?.prepend(message);
});
