const tablaUsuarios = document.getElementById("tablaUsuarios");
const mensajeUsuarios = document.getElementById("mensajeUsuarios");
const tituloModulo = document.getElementById("tituloModulo");
const descripcionModulo = document.getElementById("descripcionModulo");

const pageRole = document.body.dataset.pageRole;

const roleLabels = {
  directivo: "Directivos",
  secretaria: "Secretaría",
  docente: "Docentes",
  preceptor: "Preceptoría",
  alumno: "Alumnos",
  familia: "Familias"
};

const roleDescriptions = {
  directivo: "Usuarios con responsabilidad de gestión institucional y seguimiento general.",
  secretaria: "Usuarios vinculados a tareas administrativas, documentación y gestión escolar.",
  docente: "Usuarios docentes asociados a cursos, materias y seguimiento pedagógico.",
  preceptor: "Usuarios de preceptoría vinculados al acompañamiento cotidiano y asistencia.",
  alumno: "Estudiantes con acceso a materiales, materias y ADA Tutor.",
  familia: "Familias o responsables asociados a estudiantes."
};

function crearCelda(texto, className = "") {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = texto == null || texto === "" ? "-" : String(texto);
  return td;
}

function crearBadge(texto) {
  const span = document.createElement("span");
  span.className = "badge";
  span.textContent = texto || "-";
  return span;
}

function crearEstado(activo) {
  const span = document.createElement("span");
  span.className = activo ? "status-ok" : "status-off";
  span.textContent = activo ? "Activo" : "Inactivo";
  return span;
}

function renderUsuarios(data) {
  tablaUsuarios.replaceChildren();

  const table = document.createElement("table");
  table.className = "ada-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Nombre", "Email", "Rol", "Estado", "Creado"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  data.forEach((user) => {
    const tr = document.createElement("tr");
    const nombreCompleto = [user.apellido, user.nombre].filter(Boolean).join(", ");
    tr.appendChild(crearCelda(nombreCompleto));
    tr.appendChild(crearCelda(user.email));

    const rolTd = document.createElement("td");
    rolTd.appendChild(crearBadge(user.rol));
    tr.appendChild(rolTd);

    const estadoTd = document.createElement("td");
    estadoTd.appendChild(crearEstado(Boolean(user.activo)));
    tr.appendChild(estadoTd);

    const fecha = user.creado_en
      ? new Date(user.creado_en).toLocaleDateString("es-AR")
      : "-";
    tr.appendChild(crearCelda(fecha));
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  tablaUsuarios.appendChild(table);
}

async function cargarUsuariosPorRol() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;

  if (!Object.prototype.hasOwnProperty.call(roleLabels, pageRole)) {
    mensajeUsuarios.textContent = "No se pudo determinar el tipo de listado solicitado.";
    tablaUsuarios.replaceChildren();
    return;
  }

  tituloModulo.textContent = roleLabels[pageRole];
  descripcionModulo.textContent = roleDescriptions[pageRole];
  mensajeUsuarios.textContent = "Cargando usuarios...";

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("nombre, apellido, email, rol, activo, creado_en")
    .eq("rol", pageRole)
    .order("apellido", { ascending: true });

  if (error) {
    mensajeUsuarios.textContent = "No fue posible cargar el listado.";
    tablaUsuarios.replaceChildren();
    console.error("Error al cargar usuarios por rol", error);
    return;
  }

  if (!data || data.length === 0) {
    mensajeUsuarios.textContent = "No hay usuarios cargados para este rol.";
    tablaUsuarios.replaceChildren();
    return;
  }

  mensajeUsuarios.textContent = `${data.length} usuario${data.length === 1 ? "" : "s"} encontrado${data.length === 1 ? "" : "s"}.`;
  renderUsuarios(data);
}

cargarUsuariosPorRol();
