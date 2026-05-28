
const qs = (id) => document.getElementById(id);

const archivoExcel = qs("archivoExcel");
const formExcel = qs("formExcel");
const btnValidarExcel = qs("btnValidarExcel");
const mensajeExcel = qs("mensajeExcel");
const tablaResultados = qs("tablaResultados");

const statTotal = qs("statTotal");
const statValidos = qs("statValidos");
const statProcesados = qs("statProcesados");
const statErrores = qs("statErrores");

let perfilActual = null;
let workbookData = null;
let filas = [];

const sheetOrder = ["Usuarios", "Cursos", "Materias", "Alumno_Curso", "Docente_Materia", "Familia_Alumno"];
const rolesValidos = ["admin", "directivo", "secretaria", "docente", "preceptor", "alumno", "familia"];

const requiredBySheet = {
  Usuarios: ["nombre", "apellido", "email", "rol", "password"],
  Cursos: ["nivel", "anio", "division", "nombre_curso"],
  Materias: ["curso", "materia"],
  Alumno_Curso: ["email_alumno", "curso"],
  Docente_Materia: ["email_docente", "materia", "curso"],
  Familia_Alumno: ["email_familia", "email_alumno"]
};

function normalizeKey(key) {
  return String(key || "").trim().toLowerCase();
}

function normalizeRow(row) {
  const out = {};
  Object.entries(row).forEach(([k, v]) => {
    out[normalizeKey(k)] = typeof v === "string" ? v.trim() : v;
  });
  return out;
}

async function leerExcel() {
  const file = archivoExcel.files[0];
  if (!file) throw new Error("Seleccioná un archivo Excel.");

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });

  const parsed = {};

  sheetOrder.forEach(sheetName => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      parsed[sheetName] = [];
      return;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }).map(normalizeRow);
    parsed[sheetName] = rows.filter(row => Object.values(row).some(v => String(v || "").trim() !== ""));
  });

  return parsed;
}

function validarFila(sheetName, row) {
  const errores = [];
  const required = requiredBySheet[sheetName] || [];

  required.forEach(campo => {
    if (!String(row[campo] || "").trim()) errores.push("Falta " + campo);
  });

  if (sheetName === "Usuarios") {
    row.email = String(row.email || "").trim().toLowerCase();
    row.rol = String(row.rol || "").trim().toLowerCase();

    if (row.email && !row.email.includes("@")) errores.push("Email inválido");
    if (row.rol && !rolesValidos.includes(row.rol)) errores.push("Rol inválido");
    if (row.password && String(row.password).length < 8) errores.push("Password menor a 8 caracteres");
  }

  ["email_alumno", "email_docente", "email_familia"].forEach(campo => {
    if (row[campo]) {
      row[campo] = String(row[campo]).trim().toLowerCase();
      if (!row[campo].includes("@")) errores.push(`${campo} inválido`);
    }
  });

  return errores;
}

async function validarExcel() {
  try {
    mensajeExcel.textContent = "Leyendo Excel...";
    workbookData = await leerExcel();

    filas = [];

    sheetOrder.forEach(sheetName => {
      const rows = workbookData[sheetName] || [];

      rows.forEach((row, idx) => {
        const errores = validarFila(sheetName, row);

        filas.push({
          hoja: sheetName,
          fila: idx + 2,
          data: row,
          estado: errores.length ? "error" : "pendiente",
          detalle: errores.length ? errores.join("; ") : "Listo para importar"
        });
      });
    });

    if (!filas.length) {
      mensajeExcel.textContent = "El Excel no tiene registros para importar.";
    } else {
      mensajeExcel.textContent = "Excel validado.";
    }

    renderResultados();
    return filas.some(f => f.estado === "pendiente");

  } catch (error) {
    mensajeExcel.textContent = "Error: " + error.message;
    filas = [];
    renderResultados();
    return false;
  }
}

function estadoHTML(estado) {
  if (estado === "creado") return "<span class='result-ok'>Procesado</span>";
  if (estado === "error") return "<span class='result-error'>Error</span>";
  if (estado === "procesando") return "<span class='result-processing'>Procesando</span>";
  return "<span class='result-pending'>Pendiente</span>";
}

function actualizarStats() {
  statTotal.textContent = filas.length;
  statValidos.textContent = filas.filter(f => ["pendiente", "creado", "procesando"].includes(f.estado)).length;
  statProcesados.textContent = filas.filter(f => f.estado === "creado").length;
  statErrores.textContent = filas.filter(f => f.estado === "error").length;
}

function resumenFila(f) {
  const row = f.data;

  if (f.hoja === "Usuarios") return `${row.apellido || ""}, ${row.nombre || ""} · ${row.email || ""} · ${row.rol || ""}`;
  if (f.hoja === "Cursos") return `${row.nombre_curso || ""} · ${row.nivel || ""} · ${row.division || ""}`;
  if (f.hoja === "Materias") return `${row.materia || ""} · ${row.curso || ""}`;
  if (f.hoja === "Alumno_Curso") return `${row.email_alumno || ""} → ${row.curso || ""}`;
  if (f.hoja === "Docente_Materia") return `${row.email_docente || ""} → ${row.materia || ""} · ${row.curso || ""}`;
  if (f.hoja === "Familia_Alumno") return `${row.email_familia || ""} → ${row.email_alumno || ""}`;

  return JSON.stringify(row);
}

function renderResultados() {
  actualizarStats();

  if (!filas.length) {
    tablaResultados.innerHTML = "<p class='helper-text' style='padding:16px;'>Todavía no hay resultados.</p>";
    return;
  }

  tablaResultados.innerHTML = `
    <table class="ada-table">
      <thead>
        <tr>
          <th>Hoja</th>
          <th>Fila</th>
          <th>Resumen</th>
          <th>Estado</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map(f => `
          <tr>
            <td><span class="sheet-pill">${f.hoja}</span></td>
            <td>${f.fila}</td>
            <td>${resumenFila(f)}</td>
            <td>${estadoHTML(f.estado)}</td>
            <td>${f.detalle || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function findOne(table, filters, select = "*") {
  let q = supabaseClient.from(table).select(select).limit(1).maybeSingle();
  Object.entries(filters).forEach(([key, value]) => q = q.eq(key, value));
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

async function insertAndReturn(table, payload) {
  const { data, error } = await supabaseClient.from(table).insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function getOrCreateNivel(nombre) {
  const existing = await findOne("niveles", { nombre });
  if (existing) return existing;
  return await insertAndReturn("niveles", { nombre, descripcion: "Importado por Excel", activo: true });
}

async function getOrCreateAnio(nivelId, nombre, numero) {
  let q = supabaseClient.from("anios_grados").select("*").eq("nivel_id", nivelId).eq("nombre", nombre).limit(1).maybeSingle();
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  if (data) return data;

  return await insertAndReturn("anios_grados", {
    nivel_id: nivelId,
    nombre,
    numero: numero ? Number(numero) : null,
    descripcion: "Importado por Excel",
    activo: true
  });
}

async function getOrCreateDivision(nombre) {
  const existing = await findOne("divisiones", { nombre });
  if (existing) return existing;
  return await insertAndReturn("divisiones", { nombre, descripcion: "Importado por Excel", activo: true });
}

async function getOrCreateModalidad(nombre) {
  if (!String(nombre || "").trim()) return null;
  const existing = await findOne("modalidades", { nombre });
  if (existing) return existing;
  return await insertAndReturn("modalidades", { nombre, descripcion: "Importado por Excel", activo: true });
}

async function getCursoByNombre(nombre) {
  const curso = await findOne("cursos", { nombre });
  if (!curso) throw new Error("No existe curso: " + nombre);
  return curso;
}

async function getMateriaByNombreCurso(materiaNombre, cursoNombre) {
  const curso = await getCursoByNombre(cursoNombre);

  const { data, error } = await supabaseClient
    .from("materias")
    .select("*")
    .eq("nombre", materiaNombre)
    .eq("curso_id", curso.id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No existe materia "${materiaNombre}" en curso "${cursoNombre}"`);
  return data;
}

async function getProfileByEmail(email) {
  const profile = await findOne("profiles", { email });
  if (!profile) throw new Error("No existe usuario con email: " + email);
  return profile;
}

async function importarUsuario(row) {
  const { data, error } = await supabaseClient.functions.invoke("crear-usuario", {
    body: {
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      rol: row.rol,
      password: row.password
    }
  });

  if (error) {
    let detalle = error.message;
    if (error.context) {
      try {
        const body = await error.context.json();
        detalle = body.error || JSON.stringify(body);
      } catch (e) {}
    }
    throw new Error(detalle);
  }

  if (data?.error) throw new Error(data.error);
  return "Usuario creado";
}

async function importarCurso(row) {
  const nivel = await getOrCreateNivel(String(row.nivel).trim());
  const anio = await getOrCreateAnio(nivel.id, String(row.anio).trim(), row.numero_anio);
  const division = await getOrCreateDivision(String(row.division).trim());
  const modalidad = await getOrCreateModalidad(String(row.modalidad || "").trim());

  const existing = await findOne("cursos", { nombre: String(row.nombre_curso).trim() });
  if (existing) return "Curso ya existía";

  await insertAndReturn("cursos", {
    nivel_id: nivel.id,
    anio_grado_id: anio.id,
    division_id: division.id,
    modalidad_id: modalidad?.id || null,
    nombre: String(row.nombre_curso).trim(),
    turno: row.turno || null,
    activo: true
  });

  return "Curso creado";
}

async function importarMateria(row) {
  const curso = await getCursoByNombre(String(row.curso).trim());

  const { data: existing, error } = await supabaseClient
    .from("materias")
    .select("*")
    .eq("curso_id", curso.id)
    .eq("nombre", String(row.materia).trim())
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (existing) return "Materia ya existía";

  await insertAndReturn("materias", {
    curso_id: curso.id,
    nombre: String(row.materia).trim(),
    carga_horaria_semanal: row.carga_horaria_semanal ? Number(row.carga_horaria_semanal) : null,
    tipo_materia: row.tipo_materia || null,
    descripcion: row.descripcion || null,
    activo: true
  });

  return "Materia creada";
}

async function importarAlumnoCurso(row) {
  const alumno = await getProfileByEmail(row.email_alumno);
  const curso = await getCursoByNombre(String(row.curso).trim());
  const ciclo = row.ciclo_lectivo || new Date().getFullYear().toString();

  const existing = await findOne("alumno_cursos", { alumno_id: alumno.id, curso_id: curso.id, ciclo_lectivo: ciclo });
  if (existing) return "Asignación ya existía";

  await insertAndReturn("alumno_cursos", { alumno_id: alumno.id, curso_id: curso.id, ciclo_lectivo: ciclo, activo: true });
  return "Alumno asignado a curso";
}

async function importarDocenteMateria(row) {
  const docente = await getProfileByEmail(row.email_docente);
  const materia = await getMateriaByNombreCurso(String(row.materia).trim(), String(row.curso).trim());

  const existing = await findOne("docente_materias", { docente_id: docente.id, materia_id: materia.id });
  if (existing) return "Asignación ya existía";

  await insertAndReturn("docente_materias", { docente_id: docente.id, materia_id: materia.id, activo: true });
  return "Docente asignado a materia";
}

async function importarFamiliaAlumno(row) {
  const familia = await getProfileByEmail(row.email_familia);
  const alumno = await getProfileByEmail(row.email_alumno);

  const existing = await findOne("familia_alumnos", { familia_id: familia.id, alumno_id: alumno.id });
  if (existing) return "Vínculo ya existía";

  await insertAndReturn("familia_alumnos", { familia_id: familia.id, alumno_id: alumno.id, parentesco: row.parentesco || null, activo: true });
  return "Familia vinculada a alumno";
}

async function importarFila(f) {
  const row = f.data;

  if (f.hoja === "Usuarios") return await importarUsuario(row);
  if (f.hoja === "Cursos") return await importarCurso(row);
  if (f.hoja === "Materias") return await importarMateria(row);
  if (f.hoja === "Alumno_Curso") return await importarAlumnoCurso(row);
  if (f.hoja === "Docente_Materia") return await importarDocenteMateria(row);
  if (f.hoja === "Familia_Alumno") return await importarFamiliaAlumno(row);

  throw new Error("Hoja no reconocida: " + f.hoja);
}

btnValidarExcel.addEventListener("click", validarExcel);

formExcel.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!perfilActual || perfilActual.rol !== "admin") {
    mensajeExcel.textContent = "Solo admin puede importar datos institucionales.";
    return;
  }

  const hayValidos = await validarExcel();

  if (!hayValidos) {
    mensajeExcel.textContent = "No hay filas válidas para importar.";
    return;
  }

  mensajeExcel.textContent = "Importando Excel institucional...";

  for (const sheetName of sheetOrder) {
    const pendientes = filas.filter(f => f.hoja === sheetName && f.estado === "pendiente");

    for (const f of pendientes) {
      f.estado = "procesando";
      f.detalle = "Procesando...";
      renderResultados();

      try {
        const detalle = await importarFila(f);
        f.estado = "creado";
        f.detalle = detalle;
      } catch (error) {
        f.estado = "error";
        f.detalle = error.message;
        console.error(error);
      }

      renderResultados();
    }
  }

  mensajeExcel.textContent = "Importación finalizada.";
});

async function inicializar() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  if (perfilActual.rol !== "admin") {
    mensajeExcel.textContent = "Solo admin puede importar datos institucionales.";
    formExcel.querySelectorAll("input,button").forEach(el => el.disabled = true);
  }
}

inicializar();
