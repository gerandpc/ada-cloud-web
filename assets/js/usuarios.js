
const formUsuario = document.getElementById("formUsuario");
const mensajeUsuario = document.getElementById("mensajeUsuario");
const mensajeListaUsuarios = document.getElementById("mensajeListaUsuarios");
const tablaUsuarios = document.getElementById("tablaUsuarios");
const roleFilter = document.getElementById("roleFilter");

let perfilActual = null;
let usuarios = [];
let filtroRol = "todos";

async function inicializarUsuarios() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;

  perfilActual = contexto.perfil;

  if (perfilActual.rol !== "admin") {
    mensajeUsuario.textContent = "Solo un usuario admin puede crear usuarios.";
    formUsuario.querySelectorAll("input, select, button").forEach(el => el.disabled = true);
  }

  configurarFiltros();
  await cargarUsuarios();
}

function configurarFiltros() {
  roleFilter.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      roleFilter.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filtroRol = btn.dataset.role;
      renderUsuarios();
    });
  });
}

async function cargarUsuarios() {
  mensajeListaUsuarios.textContent = "Cargando usuarios...";

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, nombre, apellido, email, rol, activo, creado_en")
    .order("apellido", { ascending: true });

  if (error) {
    mensajeListaUsuarios.textContent = "Error al cargar usuarios: " + error.message;
    console.error(error);
    return;
  }

  usuarios = data || [];
  mensajeListaUsuarios.textContent = `${usuarios.length} usuario/s registrados.`;
  renderUsuarios();
}

function renderUsuarios() {
  const filtrados = filtroRol === "todos"
    ? usuarios
    : usuarios.filter(u => u.rol === filtroRol);

  if (filtrados.length === 0) {
    tablaUsuarios.innerHTML = "<p class='helper-text'>No hay usuarios para este filtro.</p>";
    return;
  }

  tablaUsuarios.innerHTML = `
    <table class="ada-table">
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Estado</th>
          <th>Creado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${filtrados.map(user => `
          <tr>
            <td><strong>${user.apellido || ""}, ${user.nombre || ""}</strong></td>
            <td>${user.email || ""}</td>
            <td><span class="badge">${user.rol || "-"}</span></td>
            <td>${user.activo ? "<span class='status-ok'>Activo</span>" : "<span class='status-off'>Inactivo</span>"}</td>
            <td>${user.creado_en ? new Date(user.creado_en).toLocaleDateString("es-AR") : "-"}</td>
            <td>
              <div class="user-actions">
                <button class="btn-mini" onclick="cambiarEstadoUsuario('${user.id}', ${!user.activo})">
                  ${user.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function cambiarEstadoUsuario(id, nuevoEstado) {
  if (!confirm(nuevoEstado ? "¿Activar usuario?" : "¿Desactivar usuario?")) return;

  const { error } = await supabaseClient
    .from("profiles")
    .update({ activo: nuevoEstado })
    .eq("id", id);

  if (error) {
    alert("Error al actualizar usuario: " + error.message);
    console.error(error);
    return;
  }

  await cargarUsuarios();
}

formUsuario.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!perfilActual || perfilActual.rol !== "admin") {
    mensajeUsuario.textContent = "Solo admin puede crear usuarios.";
    return;
  }

  const payload = {
    nombre: document.getElementById("nombre").value.trim(),
    apellido: document.getElementById("apellido").value.trim(),
    email: document.getElementById("email").value.trim(),
    rol: document.getElementById("rol").value,
    password: document.getElementById("password").value
  };

  mensajeUsuario.textContent = "Creando usuario...";

  const { data, error } = await supabaseClient.functions.invoke("crear-usuario", {
    body: payload
  });

  if (error) {
    mensajeUsuario.textContent = "Error al crear usuario: " + error.message;
    console.error(error);
    return;
  }

  if (data && data.error) {
    mensajeUsuario.textContent = "Error al crear usuario: " + data.error;
    console.error(data);
    return;
  }

  mensajeUsuario.textContent = "Usuario creado correctamente.";
  formUsuario.reset();
  await cargarUsuarios();
});

inicializarUsuarios();
