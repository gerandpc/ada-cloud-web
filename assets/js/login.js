const loginForm = document.getElementById("loginForm");
const loginMensaje = document.getElementById("loginMensaje");

const LOGIN_ROLE_HOME = {
  admin: "dashboard.html",
  directivo: "dashboard.html",
  secretaria: "dashboard.html",
  docente: "mi-espacio-docente.html",
  preceptor: "mi-espacio-preceptor.html",
  familia: "mi-espacio-familia.html",
  alumno: "mi-espacio-alumno.html"
};

async function redirigirSegunPerfil() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) return false;

  const { data: perfil, error } = await supabaseClient
    .from("profiles")
    .select("rol, activo")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error || !perfil || !perfil.activo) {
    await supabaseClient.auth.signOut();
    return false;
  }

  const rol = (perfil.rol || "alumno").toString().trim().toLowerCase() === "preceptoria" ? "preceptor" : (perfil.rol || "alumno").toString().trim().toLowerCase();
  window.location.replace(LOGIN_ROLE_HOME[rol] || "dashboard.html");
  return true;
}

redirigirSegunPerfil();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  loginMensaje.textContent = "Ingresando...";

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginMensaje.textContent = "Error: " + error.message;
    return;
  }

  loginMensaje.textContent = "Ingreso correcto. Redirigiendo...";
  await redirigirSegunPerfil();
});
