const formUsuario = document.getElementById("formUsuario");
const mensajeUsuario = document.getElementById("mensajeUsuario");
const mensajeListaUsuarios = document.getElementById("mensajeListaUsuarios");
const tablaUsuarios = document.getElementById("tablaUsuarios");
const roleFilter = document.getElementById("roleFilter");

let perfilActual = null;
let usuarios = [];
let filtroRol = "todos";

function crearTextoCelda(valor, strong = false) {
  const td = document.createElement("td");
  const node = strong ? document.createElement("strong") : td;
  node.textContent = valor == null || valor === "" ? "-" : String(valor);
  if (strong) td.appendChild(node);
  return td;
}

function crearBadge(valor) {
  const span = document.createElement("span");
  span.className = "badge";
  span.textContent = valor || "-";
  return span;
}

function crearEstado(activo) {
  const span = document.createElement("span");
  span.className = activo ? "status-ok" : "status-off";
  span.textContent = activo ? "Activo" : "Inactivo";
  return span;
}

async function inicializarUsuarios() {
  const contexto = await obtenerSesionPerfil();
  if (!contexto) return;

  perfilActual = contexto.perfil;

  if (perfilActual.rol !== "admin") {
    mensajeUsuario.textContent = "La creación y modificación de usuarios está reservada a Administración.";
    formUsuario.querySelectorAll("input, select, button").forEach((el) => {
      el.disabled = true;
    });
  }

  configurarFiltros();
  await cargarUsuarios();
}

function configurarFiltros() {
  roleFilter.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      roleFilter.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
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
    mensajeListaUsuarios.textContent = "No fue posible cargar los usuarios.";
    tablaUsuarios.replaceChildren();
    console.error("Error al cargar usuarios", error);
    return;
  }

  usuarios = data || [];
  mensajeListaUsuarios.textContent = `${usuarios.length} usuario${usuarios.length === 1 ? "" : "s"} registrado${usuarios.length === 1 ? "" : "s"}.`;
  renderUsuarios();
}

function renderUsuarios() {
  const filtrados = filtroRol === "todos"
    ? usuarios
    : usuarios.filter((u) => u.rol === filtroRol);

  tablaUsuarios.replaceChildren();

  if (filtrados.length === 0) {
    const mensaje = document.createElement("p");
    mensaje.className = "helper-text";
    mensaje.textContent = "No hay usuarios para este filtro.";
    tablaUsuarios.appendChild(mensaje);
    return;
  }

  const table = document.createElement("table");
  table.className = "ada-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Usuario", "Email", "Rol", "Estado", "Creado", "Acciones"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  filtrados.forEach((user) => {
    const tr = document.createElement("tr");
    const nombreCompleto = [user.apellido, user.nombre].filter(Boolean).join(", ");
    tr.appendChild(crearTextoCelda(nombreCompleto, true));
    tr.appendChild(crearTextoCelda(user.email));

    const rolTd = document.createElement("td");
    rolTd.appendChild(crearBadge(user.rol));
    tr.appendChild(rolTd);

    const estadoTd = document.createElement("td");
    estadoTd.appendChild(crearEstado(Boolean(user.activo)));
    tr.appendChild(estadoTd);

    const fecha = user.creado_en
      ? new Date(user.creado_en).toLocaleDateString("es-AR")
      : "-";
    tr.appendChild(crearTextoCelda(fecha));

    const accionesTd = document.createElement("td");
    if (perfilActual?.rol === "admin") {
      const wrapper = document.createElement("div");
      wrapper.className = "user-actions";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn-mini";
      button.textContent = user.activo ? "Desactivar" : "Activar";
      button.addEventListener("click", () => cambiarEstadoUsuario(user.id, !user.activo));
      wrapper.appendChild(button);
      accionesTd.appendChild(wrapper);
    } else {
      accionesTd.textContent = "Solo lectura";
    }
    tr.appendChild(accionesTd);
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  tablaUsuarios.appendChild(table);
}

async function cambiarEstadoUsuario(id, nuevoEstado) {
  if (!perfilActual || perfilActual.rol !== "admin") {
    alert("Esta acción está reservada a Administración.");
    return;
  }

  if (!confirm(nuevoEstado ? "¿Activar usuario?" : "¿Desactivar usuario?")) return;

  const { error } = await supabaseClient
    .from("profiles")
    .update({ activo: nuevoEstado })
    .eq("id", id);

  if (error) {
    alert("No fue posible actualizar el usuario.");
    console.error("Error al actualizar usuario", error);
    return;
  }

  await cargarUsuarios();
}

formUsuario.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!perfilActual || perfilActual.rol !== "admin") {
    mensajeUsuario.textContent = "Esta acción está reservada a Administración.";
    return;
  }

  const payload = {
    nombre: document.getElementById("nombre").value.trim(),
    apellido: document.getElementById("apellido").value.trim(),
    email: document.getElementById("email").value.trim().toLowerCase(),
    rol: document.getElementById("rol").value,
    password: document.getElementById("password").value
  };

  if (!payload.nombre || !payload.apellido || !payload.email || !payload.rol || !payload.password) {
    mensajeUsuario.textContent = "Completá todos los campos obligatorios.";
    return;
  }

  mensajeUsuario.textContent = "Creando usuario...";

  const { data, error } = await supabaseClient.functions.invoke("crear-usuario", {
    body: payload
  });

  if (error || data?.error) {
    mensajeUsuario.textContent = "No fue posible crear el usuario.";
    console.error("Error al crear usuario", error || data);
    return;
  }

  mensajeUsuario.textContent = "Usuario creado correctamente.";
  formUsuario.reset();
  await cargarUsuarios();
});

inicializarUsuarios();
