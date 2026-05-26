const roleConfigSimple = {
  admin: "role-admin",
  directivo: "role-directivo",
  secretaria: "role-secretaria",
  docente: "role-docente",
  preceptor: "role-preceptor",
  familia: "role-familia",
  alumno: "role-alumno"
};

async function aplicarTemaModulo() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const { data: perfil, error } = await supabaseClient
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (error || !perfil) {
    console.error(error);
    return;
  }

  document.body.classList.remove("role-loading");
  document.body.classList.add(roleConfigSimple[perfil.rol] || "role-alumno");
}

aplicarTemaModulo();
