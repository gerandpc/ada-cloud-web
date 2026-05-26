const loginForm = document.getElementById("loginForm");
const loginMensaje = document.getElementById("loginMensaje");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  loginMensaje.textContent = "Ingresando...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMensaje.textContent = "Error: " + error.message;
    return;
  }

  loginMensaje.textContent = "Ingreso correcto. Redirigiendo...";
  window.location.href = "dashboard.html";
});
