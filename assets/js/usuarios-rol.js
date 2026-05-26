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

async function cargarUsuariosPorRol() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;

  tituloModulo.textContent = roleLabels[pageRole] || "Usuarios";
  descripcionModulo.textContent = roleDescriptions[pageRole] || "Usuarios registrados en ADA Cloud.";

  mensajeUsuarios.textContent = "Cargando usuarios...";

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("nombre, apellido, email, rol, activo, creado_en")
    .eq("rol", pageRole)
    .order("apellido", { ascending: true });

  if (error) {
    mensajeUsuarios.textContent = "Error al cargar usuarios: " + error.message;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    mensajeUsuarios.textContent = "No hay usuarios cargados para este rol.";
    tablaUsuarios.innerHTML = "";
    return;
  }

  mensajeUsuarios.textContent = `${data.length} usuario/s encontrados.`;

  tablaUsuarios.innerHTML = `
    <table class="ada-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Estado</th>
          <th>Creado</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((user) => `
          <tr>
            <td>${user.apellido || ""}, ${user.nombre || ""}</td>
            <td>${user.email || ""}</td>
            <td><span class="badge">${user.rol}</span></td>
            <td>${user.activo ? '<span class="status-ok">Activo</span>' : '<span class="status-off">Inactivo</span>'}</td>
            <td>${user.creado_en ? new Date(user.creado_en).toLocaleDateString("es-AR") : "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

cargarUsuariosPorRol();
