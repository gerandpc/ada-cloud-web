
const qs = (id) => document.getElementById(id);

const tipoImportacion = qs("tipoImportacion");
const archivoCsv = qs("archivoCsv");
const csvText = qs("csvText");
const btnEjemplo = qs("btnEjemplo");
const btnValidar = qs("btnValidar");
const formImportador = qs("formImportador");
const mensajeImportador = qs("mensajeImportador");
const tablaResultados = qs("tablaResultados");

const statTotal = qs("statTotal");
const statValidos = qs("statValidos");
const statCreados = qs("statCreados");
const statErrores = qs("statErrores");

let perfilActual = null;
let filas = [];

const rolesValidos = ["admin", "directivo", "secretaria", "docente", "preceptor", "alumno", "familia"];

const ejemplos = {
  usuarios: `nombre,apellido,email,rol,password
Juan,Docente,juan.docente@ada.com,docente,Ada2026*
Ana,Alumna,ana.alumna@ada.com,alumno,Ada2026*
Maria,Familia,maria.familia@ada.com,familia,Ada2026*
Pedro,Preceptor,pedro.preceptor@ada.com,preceptor,Ada2026*
Laura,Secretaria,laura.secretaria@ada.com,secretaria,Ada2026*
Daniel,Directivo,daniel.directivo@ada.com,directivo,Ada2026*`,

  cursos: `nivel,anio,numero_anio,division,modalidad,turno,nombre_curso
Secundario Técnico,4° Año,4,A,Electrónica,Mañana,4° A - Electrónica
Secundario Técnico,4° Año,4,B,Informática,Mañana,4° B - Informática
Secundario Técnico,5° Año,5,A,Electrónica,Tarde,5° A - Electrónica`,

  materias: `curso,materia,carga_horaria_semanal,tipo_materia,descripcion
4° A - Electrónica,Matemática,4,Formación general,Matemática aplicada
4° A - Electrónica,Laboratorio de Electrónica,6,Laboratorio,Prácticas de taller y laboratorio
4° B - Informática,Programación,4,Formación técnico-específica,Programación inicial`,

  alumno_curso: `email_alumno,curso,ciclo_lectivo
ana.alumna@ada.com,4° A - Electrónica,2026`,

  docente_materia: `email_docente,materia,curso
juan.docente@ada.com,Matemática,4° A - Electrónica
juan.docente@ada.com,Laboratorio de Electrónica,4° A - Electrónica`,

  familia_alumno: `email_familia,email_alumno,parentesco
maria.familia@ada.com,ana.alumna@ada.com,Madre`
};

const requiredByType = {
  usuarios: ["nombre", "apellido", "email", "rol", "password"],
  cursos: ["nivel", "anio", "division", "nombre_curso"],
  materias: ["curso", "materia"],
  alumno_curso: ["email_alumno", "curso"],
  docente_materia: ["email_docente", "materia", "curso"],
  familia_alumno: ["email_familia", "email_alumno"]
};

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(texto) {
  const lines = texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return { error: "El CSV debe tener encabezado y al menos una fila." };

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const required = requiredByType[tipoImportacion.value] || [];

  const missing = required.filter(h => !headers.includes(h));
  if (missing.length) return { error: "Faltan columnas obligatorias: " + missing.join(", ") };

  const rows = lines.slice(1).map((line, idx) => {
    const values = parseCSVLine(line);
    const obj = { fila: idx + 2 };
    headers.forEach((h, i) => obj[h] = values[i] || "");
    return obj;
  });

  return { rows };
}

function validarFila(row) {
  const tipo = tipoImportacion.value;
  const errores = [];
  const required = requiredByType[tipo] || [];

  required.forEach(campo => {
    if (!String(row[campo] || "").trim()) errores.push("Falta " + campo);
  });

  if (tipo === "usuarios") {
    row.email = String(row.email || "").trim().toLowerCase();
    row.rol = String(row.rol || "").trim().toLowerCase();

    if (row.email && !row.email.includes("@")) errores.push("Email inválido");
    if (row.rol && !rolesValidos.includes(row.rol)) errores.push("Rol inválido");
    if (row.password && row.password.length < 8) errores.push("Password menor a 8 caracteres");
  }

  ["email_alumno", "email_docente", "email_familia"].forEach(campo => {
    if (row[campo]) {
      row[campo] = String(row[campo]).trim().toLowerCase();
      if (!row[campo].includes("@")) errores.push(`${campo} inválido`);
    }
  });

  return errores;
}

function validarCSV() {
  const parsed = parseCSV(csvText.value);

  if (parsed.error) {
    mensajeImportador.textContent = parsed.error;
    filas = [];
    renderResultados();
    return false;
  }

  filas = parsed.rows.map(row => {
    const errores = validarFila(row);
    return {
      ...row,
      estado: errores.length ? "error" : "pendiente",
      detalle: errores.length ? errores.join("; ") : "Listo para importar"
    };
  });

  mensajeImportador.textContent = "CSV validado.";
  renderResultados();
  return filas.some(f => f.estado === "pendiente");
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
  statCreados.textContent = filas.filter(f => f.estado === "creado").length;
  statErrores.textContent = filas.filter(f => f.estado === "error").length;
}

function renderResultados() {
  actualizarStats();

  if (!filas.length) {
    tablaResultados.innerHTML = "<p class='helper-text'>Todavía no hay resultados.</p>";
    return;
  }

  tablaResultados.innerHTML = `
    <table class="ada-table">
      <thead>
        <tr>
          <th>Fila</th>
          <th>Resumen</th>
          <th>Estado</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map(row => `
          <tr>
            <td>${row.fila}</td>
            <td>${resumenFila(row)}</td>
            <td>${estadoHTML(row.estado)}</td>
            <td>${row.detalle || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function resumenFila(row) {
  const tipo = tipoImportacion.value;

  if (tipo === "usuarios") return `${row.apellido || ""}, ${row.nombre || ""} · ${row.email || ""} · ${row.rol || ""}`;
  if (tipo === "cursos") return `${row.nombre_curso || ""} · ${row.nivel || ""} · ${row.division || ""}`;
  if (tipo === "materias") return `${row.materia || ""} · ${row.curso || ""}`;
  if (tipo === "alumno_curso") return `${row.email_alumno || ""} → ${row.curso || ""}`;
  if (tipo === "docente_materia") return `${row.email_docente || ""} → ${row.materia || ""} · ${row.curso || ""}`;
  if (tipo === "familia_alumno") return `${row.email_familia || ""} → ${row.email_alumno || ""}`;

  return JSON.stringify(row);
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
  return await insertAndReturn("niveles", { nombre, descripcion: "Importado por CSV", activo: true });
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
    descripcion: "Importado por CSV",
    activo: true
  });
}

async function getOrCreateDivision(nombre) {
  const existing = await findOne("divisiones", { nombre });
  if (existing) return existing;
  return await insertAndReturn("divisiones", { nombre, descripcion: "Importado por CSV", activo: true });
}

async function getOrCreateModalidad(nombre) {
  if (!nombre) return null;
  const existing = await findOne("modalidades", { nombre });
  if (existing) return existing;
  return await insertAndReturn("modalidades", { nombre, descripcion: "Importado por CSV", activo: true });
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
  const nivel = await getOrCreateNivel(row.nivel.trim());
  const anio = await getOrCreateAnio(nivel.id, row.anio.trim(), row.numero_anio);
  const division = await getOrCreateDivision(row.division.trim());
  const modalidad = await getOrCreateModalidad(String(row.modalidad || "").trim());

  const existing = await findOne("cursos", { nombre: row.nombre_curso.trim() });
  if (existing) return "Curso ya existía";

  await insertAndReturn("cursos", {
    nivel_id: nivel.id,
    anio_grado_id: anio.id,
    division_id: division.id,
    modalidad_id: modalidad?.id || null,
    nombre: row.nombre_curso.trim(),
    turno: row.turno || null,
    activo: true
  });

  return "Curso creado";
}

async function importarMateria(row) {
  const curso = await getCursoByNombre(row.curso.trim());

  const { data: existing, error } = await supabaseClient
    .from("materias")
    .select("*")
    .eq("curso_id", curso.id)
    .eq("nombre", row.materia.trim())
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (existing) return "Materia ya existía";

  await insertAndReturn("materias", {
    curso_id: curso.id,
    nombre: row.materia.trim(),
    carga_horaria_semanal: row.carga_horaria_semanal ? Number(row.carga_horaria_semanal) : null,
    tipo_materia: row.tipo_materia || null,
    descripcion: row.descripcion || null,
    activo: true
  });

  return "Materia creada";
}

async function importarAlumnoCurso(row) {
  const alumno = await getProfileByEmail(row.email_alumno);
  const curso = await getCursoByNombre(row.curso.trim());

  const existing = await findOne("alumno_cursos", {
    alumno_id: alumno.id,
    curso_id: curso.id,
    ciclo_lectivo: row.ciclo_lectivo || new Date().getFullYear().toString()
  });

  if (existing) return "Asignación ya existía";

  await insertAndReturn("alumno_cursos", {
    alumno_id: alumno.id,
    curso_id: curso.id,
    ciclo_lectivo: row.ciclo_lectivo || new Date().getFullYear().toString(),
    activo: true
  });

  return "Alumno asignado a curso";
}

async function importarDocenteMateria(row) {
  const docente = await getProfileByEmail(row.email_docente);
  const materia = await getMateriaByNombreCurso(row.materia.trim(), row.curso.trim());

  const existing = await findOne("docente_materias", {
    docente_id: docente.id,
    materia_id: materia.id
  });

  if (existing) return "Asignación ya existía";

  await insertAndReturn("docente_materias", {
    docente_id: docente.id,
    materia_id: materia.id,
    activo: true
  });

  return "Docente asignado a materia";
}

async function importarFamiliaAlumno(row) {
  const familia = await getProfileByEmail(row.email_familia);
  const alumno = await getProfileByEmail(row.email_alumno);

  const existing = await findOne("familia_alumnos", {
    familia_id: familia.id,
    alumno_id: alumno.id
  });

  if (existing) return "Vínculo ya existía";

  await insertAndReturn("familia_alumnos", {
    familia_id: familia.id,
    alumno_id: alumno.id,
    parentesco: row.parentesco || null,
    activo: true
  });

  return "Familia vinculada a alumno";
}

async function importarFila(row) {
  const tipo = tipoImportacion.value;

  if (tipo === "usuarios") return await importarUsuario(row);
  if (tipo === "cursos") return await importarCurso(row);
  if (tipo === "materias") return await importarMateria(row);
  if (tipo === "alumno_curso") return await importarAlumnoCurso(row);
  if (tipo === "docente_materia") return await importarDocenteMateria(row);
  if (tipo === "familia_alumno") return await importarFamiliaAlumno(row);

  throw new Error("Tipo de importación no reconocido");
}

archivoCsv.addEventListener("change", async () => {
  const file = archivoCsv.files[0];
  if (!file) return;
  csvText.value = await file.text();
  validarCSV();
});

btnEjemplo.addEventListener("click", () => {
  csvText.value = ejemplos[tipoImportacion.value] || "";
  validarCSV();
});

btnValidar.addEventListener("click", validarCSV);

tipoImportacion.addEventListener("change", () => {
  csvText.value = ejemplos[tipoImportacion.value] || "";
  filas = [];
  renderResultados();
  mensajeImportador.textContent = "Ejemplo cargado para el tipo seleccionado.";
});

formImportador.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!perfilActual || perfilActual.rol !== "admin") {
    mensajeImportador.textContent = "Solo admin puede importar datos institucionales.";
    return;
  }

  if (!validarCSV()) {
    mensajeImportador.textContent = "No hay filas válidas para importar.";
    return;
  }

  const pendientes = filas.filter(f => f.estado === "pendiente");
  mensajeImportador.textContent = `Importando ${pendientes.length} fila/s...`;

  for (const row of pendientes) {
    row.estado = "procesando";
    row.detalle = "Procesando...";
    renderResultados();

    try {
      const detalle = await importarFila(row);
      row.estado = "creado";
      row.detalle = detalle;
    } catch (error) {
      row.estado = "error";
      row.detalle = error.message;
      console.error(error);
    }

    renderResultados();
  }

  mensajeImportador.textContent = "Importación finalizada.";
});

async function inicializar() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;
  perfilActual = contexto.perfil;

  if (perfilActual.rol !== "admin") {
    mensajeImportador.textContent = "Solo admin puede importar datos institucionales.";
    formImportador.querySelectorAll("input,textarea,select,button").forEach(el => el.disabled = true);
    return;
  }

  csvText.value = ejemplos[tipoImportacion.value];
}

inicializar();
