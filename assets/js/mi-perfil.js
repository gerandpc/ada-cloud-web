let adaProfileContext = null;

const profileEl = (id) => document.getElementById(id);
const profileText = (id, value) => {
  const el = profileEl(id);
  if (el) el.textContent = value == null || value === "" ? "—" : String(value);
};

function profileInitials(nombre, apellido) {
  return [nombre, apellido]
    .filter(Boolean)
    .map(value => String(value).trim().charAt(0).toUpperCase())
    .join("") || "U";
}

function profileDate(value) {
  if (!value) return "No disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No disponible"
    : new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function profileMessage(id, text, type = "info") {
  const el = profileEl(id);
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${type}`;
}

function validatePassword(password) {
  return {
    length: password.length >= 8,
    lower: /[a-záéíóúñ]/.test(password),
    upper: /[A-ZÁÉÍÓÚÑ]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(password)
  };
}

function updatePasswordStrength() {
  const password = profileEl("newPassword")?.value || "";
  const checks = validatePassword(password);
  const score = Object.values(checks).filter(Boolean).length;
  const container = profileEl("passwordStrength");
  if (!container) return;
  container.dataset.score = String(score);
  const labels = ["Ingresá una contraseña", "Muy débil", "Débil", "Aceptable", "Buena", "Segura"];
  container.setAttribute("aria-label", labels[score] || labels[0]);
  profileText("passwordRules", score === 5
    ? "La contraseña cumple todos los requisitos."
    : "Usá al menos 8 caracteres, mayúscula, minúscula, número y símbolo.");
}

async function loadProfile() {
  adaProfileContext = await adaRequirePageAccess();
  if (!adaProfileContext) return;

  const { session, perfil } = adaProfileContext;
  const user = session.user;
  const fullName = `${perfil.nombre || ""} ${perfil.apellido || ""}`.trim() || "Usuario ADA";

  profileText("profileAvatar", profileInitials(perfil.nombre, perfil.apellido));
  profileText("profileName", fullName);
  profileText("profileEmail", perfil.email || user.email);
  profileText("profileRole", (perfil.rol || "usuario").toUpperCase());
  profileText("profileStatus", perfil.activo ? "Activo" : "Inactivo");
  profileText("profileLastAccess", profileDate(user.last_sign_in_at));
  profileText("profileUserId", user.id);

  profileEl("profileFirstName").value = perfil.nombre || "";
  profileEl("profileLastName").value = perfil.apellido || "";
  profileEl("profileEmailInput").value = perfil.email || user.email || "";
}

async function saveProfile(event) {
  event.preventDefault();
  if (!adaProfileContext) return;

  const nombre = profileEl("profileFirstName").value.trim();
  const apellido = profileEl("profileLastName").value.trim();
  if (!nombre || !apellido) {
    profileMessage("profileMessage", "Nombre y apellido son obligatorios.", "error");
    return;
  }

  const button = event.submitter;
  if (button) button.disabled = true;
  profileMessage("profileMessage", "Guardando…", "info");

  const { error } = await supabaseClient
    .from("profiles")
    .update({ nombre, apellido })
    .eq("id", adaProfileContext.session.user.id);

  if (button) button.disabled = false;
  if (error) {
    profileMessage("profileMessage", `No se pudieron guardar los datos: ${error.message}`, "error");
    return;
  }

  adaProfileContext.perfil.nombre = nombre;
  adaProfileContext.perfil.apellido = apellido;
  profileText("profileName", `${nombre} ${apellido}`.trim());
  profileText("profileAvatar", profileInitials(nombre, apellido));
  profileMessage("profileMessage", "Datos actualizados correctamente.", "success");
}

async function changePassword(event) {
  event.preventDefault();
  const password = profileEl("newPassword").value;
  const repeated = profileEl("repeatPassword").value;
  const checks = validatePassword(password);

  if (!Object.values(checks).every(Boolean)) {
    profileMessage("passwordMessage", "La contraseña no cumple todos los requisitos de seguridad.", "error");
    return;
  }
  if (password !== repeated) {
    profileMessage("passwordMessage", "Las contraseñas no coinciden.", "error");
    return;
  }

  const button = event.submitter;
  if (button) button.disabled = true;
  profileMessage("passwordMessage", "Actualizando contraseña…", "info");

  const { error } = await supabaseClient.auth.updateUser({ password });
  if (button) button.disabled = false;
  if (error) {
    profileMessage("passwordMessage", `No se pudo actualizar: ${error.message}`, "error");
    return;
  }

  event.currentTarget.reset();
  updatePasswordStrength();
  profileMessage("passwordMessage", "Contraseña actualizada correctamente.", "success");
}

function bindProfileEvents() {
  profileEl("profileForm")?.addEventListener("submit", saveProfile);
  profileEl("passwordForm")?.addEventListener("submit", changePassword);
  profileEl("newPassword")?.addEventListener("input", updatePasswordStrength);
  profileEl("profileLogout")?.addEventListener("click", adaLogout);
  document.querySelectorAll("[data-toggle-password]").forEach(button => {
    button.addEventListener("click", () => {
      const input = profileEl(button.dataset.togglePassword);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Ocultar" : "Mostrar";
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindProfileEvents();
  updatePasswordStrength();
  await loadProfile();
});
