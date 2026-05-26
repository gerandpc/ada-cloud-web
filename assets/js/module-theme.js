async function aplicarTemaModulo() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const session = sessionData.session;
  if (!session) { window.location.href = "login.html"; return; }
  const { data: perfil, error } = await supabaseClient.from("profiles").select("rol").eq("id", session.user.id).single();
  if (error || !perfil) { console.error(error); return; }
  document.body.classList.remove("role-loading");
  document.body.classList.add(`role-${perfil.rol}`);
}
aplicarTemaModulo();
