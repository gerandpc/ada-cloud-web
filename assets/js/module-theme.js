const roleClassMap = {
  admin: "role-admin",
  directivo: "role-directivo",
  secretaria: "role-secretaria",
  docente: "role-docente",
  preceptor: "role-preceptor",
  familia: "role-familia",
  alumno: "role-alumno"
};

async function obtenerSesionPerfil() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  const { data: perfil, error } = await supabaseClient
    .from("profiles")
    .select("id, nombre, apellido, email, rol, activo")
    .eq("id", session.user.id)
    .single();

  if (error || !perfil || !perfil.activo) {
    console.error(error);
    window.location.href = "login.html";
    return null;
  }

  document.body.classList.remove("role-loading");
  document.body.classList.add(roleClassMap[perfil.rol] || "role-alumno");

  return { session, perfil };
}

obtenerSesionPerfil();
