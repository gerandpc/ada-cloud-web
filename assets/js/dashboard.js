const estadoSesion = document.getElementById("estadoSesion");
const datosUsuario = document.getElementById("datosUsuario");
const nombreUsuario = document.getElementById("nombreUsuario");
const emailUsuario = document.getElementById("emailUsuario");
const rolUsuario = document.getElementById("rolUsuario");
const btnSalir = document.getElementById("btnSalir");

async function cargarDashboard() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    estadoSesion.textContent = "Error al verificar la sesión.";
    return;
  }

  const session = sessionData.session;

  if (!session) {
    estadoSesion.textContent = "No hay sesión activa. Redirigiendo al login...";
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
    return;
  }

  const user = session.user;

  const { data: perfil, error: perfilError } = await supabaseClient
    .from("profiles")
    .select("nombre, apellido, email, rol, activo")
    .eq("id", user.id)
    .single();

  if (perfilError) {
    estadoSesion.textContent = "Sesión iniciada, pero no se encontró el perfil del usuario.";
    console.error(perfilError);
    return;
  }

  if (!perfil.activo) {
    estadoSesion.textContent = "Usuario inactivo. Contactá al administrador.";
    return;
  }

  estadoSesion.textContent = "Sesión iniciada correctamente.";
  datosUsuario.style.display = "block";

  nombreUsuario.textContent = `${perfil.nombre} ${perfil.apellido}`;
  emailUsuario.textContent = perfil.email;
  rolUsuario.textContent = perfil.rol;
}

btnSalir.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

cargarDashboard();
