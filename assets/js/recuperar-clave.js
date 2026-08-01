const form = document.getElementById("resetForm");
const password = document.getElementById("newPassword");
const repeat = document.getElementById("repeatPassword");
const submit = document.getElementById("resetSubmit");
const message = document.getElementById("resetMessage");

function show(text, ok = false) {
  message.textContent = text;
  message.classList.toggle("is-ok", ok);
  message.classList.toggle("is-error", !ok);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (password.value.length < 8) return show("La contraseña debe tener al menos 8 caracteres.");
  if (password.value !== repeat.value) return show("Las contraseñas no coinciden.");
  submit.disabled = true;
  show("Guardando nueva contraseña...");
  try {
    const { error } = await supabaseClient.auth.updateUser({ password: password.value });
    if (error) throw error;
    show("Contraseña actualizada. Ya podés volver a ingresar.", true);
    form.reset();
    setTimeout(() => window.location.replace("../index.html"), 1500);
  } catch (error) {
    show(error?.message || "No se pudo actualizar la contraseña. Volvé a abrir el enlace recibido por correo.");
  } finally {
    submit.disabled = false;
  }
});
