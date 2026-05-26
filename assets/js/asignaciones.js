
const qs = (id) => document.getElementById(id);
let perfiles = [], cursos = [], materias = [];

function optionUsers(role, placeholder) {
  const users = perfiles.filter(p => p.rol === role);
  return `<option value="">${placeholder}</option>` + users.map(u => `<option value="${u.id}">${u.apellido || ""}, ${u.nombre || ""} - ${u.email}</option>`).join("");
}
function optionCursos() { return `<option value="">Seleccionar curso</option>` + cursos.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(""); }
function optionMaterias() { return `<option value="">Seleccionar materia</option>` + materias.map(m => `<option value="${m.id}">${m.nombre} - ${m.cursos?.nombre || "Sin curso"}</option>`).join(""); }

async function cargarBase() {
  await obtenerSesionPerfil();
  const [profilesRes, cursosRes, materiasRes] = await Promise.all([
    supabaseClient.from("profiles").select("id, nombre, apellido, email, rol, activo").order("apellido", { ascending: true }),
    supabaseClient.from("cursos").select("id, nombre").order("nombre", { ascending: true }),
    supabaseClient.from("materias").select("id, nombre, cursos(nombre)").order("nombre", { ascending: true })
  ]);

  for (const res of [profilesRes, cursosRes, materiasRes]) {
    if (res.error) { alert("Error al cargar datos base: " + res.error.message); console.error(res.error); return; }
  }

  perfiles = profilesRes.data || [];
  cursos = cursosRes.data || [];
  materias = materiasRes.data || [];

  qs("docenteSelect").innerHTML = optionUsers("docente", "Seleccionar docente");
  qs("alumnoSelect").innerHTML = optionUsers("alumno", "Seleccionar alumno");
  qs("alumnoFamiliaSelect").innerHTML = optionUsers("alumno", "Seleccionar alumno");
  qs("familiaSelect").innerHTML = optionUsers("familia", "Seleccionar familia");
  qs("cursoSelect").innerHTML = optionCursos();
  qs("materiaSelect").innerHTML = optionMaterias();
  await cargarTablas();
}

async function insertar(tabla, payload, msgId) {
  qs(msgId).textContent = "Guardando...";
  const { error } = await supabaseClient.from(tabla).insert(payload);
  if (error) { qs(msgId).textContent = "Error: " + error.message; console.error(error); return; }
  qs(msgId).textContent = "Asignación guardada correctamente.";
  await cargarTablas();
}

function tablaHTML(headers, rows) {
  if (!rows.length) return "<p class='helper-text'>Sin asignaciones cargadas.</p>";
  return `<table class="ada-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

async function cargarTablas() {
  const [dm, ac, fa] = await Promise.all([
    supabaseClient.from("docente_materias").select("*, profiles(nombre, apellido, email), materias(nombre, cursos(nombre))").order("creado_en", { ascending: false }),
    supabaseClient.from("alumno_cursos").select("*, profiles(nombre, apellido, email), cursos(nombre)").order("creado_en", { ascending: false }),
    supabaseClient.from("familia_alumnos").select("*, familia:profiles!familia_alumnos_familia_id_fkey(nombre, apellido, email), alumno:profiles!familia_alumnos_alumno_id_fkey(nombre, apellido, email)").order("creado_en", { ascending: false })
  ]);

  qs("tablaDocenteMaterias").innerHTML = tablaHTML(["Docente", "Materia", "Curso", "Estado"], (dm.data || []).map(r => `<tr><td>${r.profiles?.apellido || ""}, ${r.profiles?.nombre || ""}</td><td>${r.materias?.nombre || "-"}</td><td>${r.materias?.cursos?.nombre || "-"}</td><td>${r.activo ? "<span class='status-ok'>Activo</span>" : "<span class='status-off'>Inactivo</span>"}</td></tr>`));
  qs("tablaAlumnoCursos").innerHTML = tablaHTML(["Alumno", "Curso", "Ciclo", "Estado"], (ac.data || []).map(r => `<tr><td>${r.profiles?.apellido || ""}, ${r.profiles?.nombre || ""}</td><td>${r.cursos?.nombre || "-"}</td><td>${r.ciclo_lectivo || "-"}</td><td>${r.activo ? "<span class='status-ok'>Activo</span>" : "<span class='status-off'>Inactivo</span>"}</td></tr>`));
  qs("tablaFamiliaAlumnos").innerHTML = tablaHTML(["Familia", "Alumno", "Parentesco", "Estado"], (fa.data || []).map(r => `<tr><td>${r.familia?.apellido || ""}, ${r.familia?.nombre || ""}</td><td>${r.alumno?.apellido || ""}, ${r.alumno?.nombre || ""}</td><td>${r.parentesco || "-"}</td><td>${r.activo ? "<span class='status-ok'>Activo</span>" : "<span class='status-off'>Inactivo</span>"}</td></tr>`));
}

qs("formDocenteMateria").addEventListener("submit", async e => { e.preventDefault(); await insertar("docente_materias", { docente_id: qs("docenteSelect").value, materia_id: qs("materiaSelect").value, activo: true }, "msgDocenteMateria"); });
qs("formAlumnoCurso").addEventListener("submit", async e => { e.preventDefault(); await insertar("alumno_cursos", { alumno_id: qs("alumnoSelect").value, curso_id: qs("cursoSelect").value, ciclo_lectivo: qs("cicloLectivo").value.trim() || new Date().getFullYear().toString(), activo: true }, "msgAlumnoCurso"); });
qs("formFamiliaAlumno").addEventListener("submit", async e => { e.preventDefault(); await insertar("familia_alumnos", { familia_id: qs("familiaSelect").value, alumno_id: qs("alumnoFamiliaSelect").value, parentesco: qs("parentesco").value.trim(), activo: true }, "msgFamiliaAlumno"); });

cargarBase();
