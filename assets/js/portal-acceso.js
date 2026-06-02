const ADA_ROLE_HOME = {
  admin: "pages/dashboard.html",
  directivo: "pages/dashboard.html",
  secretaria: "pages/dashboard.html",
  docente: "pages/mi-espacio-docente.html",
  preceptor: "pages/mi-espacio-preceptor.html",
  familia: "pages/mi-espacio-familia.html",
  alumno: "pages/mi-espacio-alumno.html"
};

const ADA_ROLE_COLORS = {
  admin: "#0f172a",
  directivo: "#dc2626",
  secretaria: "#0891b2",
  docente: "#ea580c",
  preceptor: "#b8860b",
  familia: "#16a34a",
  alumno: "#7c3aed"
};

const ADA_ROLE_ICONS = {
  admin: "⚙️",
  directivo: "🏫",
  secretaria: "🗂️",
  docente: "👩‍🏫",
  preceptor: "📋",
  familia: "👨‍👩‍👧",
  alumno: "🎒"
};

const modal = document.getElementById("adaLoginModal");
const roleCards = document.querySelectorAll(".ada-role-card");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const loginForm = document.getElementById("portalLoginForm");
const loginButton = document.getElementById("portalLoginButton");
const message = document.getElementById("portalLoginMessage");
const selectedRoleInput = document.getElementById("selectedRole");
const modalRoleTitle = document.getElementById("modalRoleTitle");
const modalRoleDescription = document.getElementById("modalRoleDescription");
const modalRoleIcon = document.getElementById("modalRoleIcon");
const emailInput = document.getElementById("portalEmail");
const passwordInput = document.getElementById("portalPassword");

function setMessage(text, type = "") {
  message.textContent = text || "";
  message.classList.remove("is-error", "is-ok");
  if (type) message.classList.add(type);
}

function openLoginModal(card) {
  const role = card.dataset.role;
  const title = card.dataset.title || "ADA";
  const description = card.dataset.description || "Ingresá con tus credenciales institucionales.";
  const color = ADA_ROLE_COLORS[role] || "#0f172a";

  selectedRoleInput.value = role;
  modalRoleTitle.textContent = `Ingreso ${title}`;
  modalRoleDescription.textContent = description;
  modalRoleIcon.textContent = ADA_ROLE_ICONS[role] || "ADA";
  modal.style.setProperty("--selected-role-color", color);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setMessage("");
  loginForm.reset();
  selectedRoleInput.value = role;

  setTimeout(() => emailInput.focus(), 80);
}

function closeLoginModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  setMessage("");
}

async function obtenerPerfilActual() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) return null;

  const { data: perfil, error } = await supabaseClient
    .from("profiles")
    .select("rol, activo")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error || !perfil || !perfil.activo) {
    await supabaseClient.auth.signOut();
    return null;
  }

  perfil.rol = (perfil.rol || "alumno").toString().trim().toLowerCase();
  if (perfil.rol === "preceptoria") perfil.rol = "preceptor";
  return perfil;
}

async function redirigirSiYaTieneSesion() {
  const perfil = await obtenerPerfilActual();
  if (!perfil) return;
  window.location.replace(ADA_ROLE_HOME[perfil.rol] || "pages/dashboard.html");
}

async function iniciarSesion(event) {
  event.preventDefault();

  const selectedRole = selectedRoleInput.value;
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    setMessage("Completá correo y contraseña para ingresar.", "is-error");
    return;
  }

  loginButton.disabled = true;
  setMessage("Validando credenciales...");

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginButton.disabled = false;
    setMessage("No se pudo iniciar sesión. Revisá el correo y la contraseña.", "is-error");
    return;
  }

  const perfil = await obtenerPerfilActual();

  if (!perfil) {
    loginButton.disabled = false;
    setMessage("No se encontró un perfil institucional activo para este usuario.", "is-error");
    return;
  }

  if (selectedRole && perfil.rol !== selectedRole) {
    setMessage(`Tus credenciales corresponden al rol ${perfil.rol}. Te llevamos a tu espacio correcto.`, "is-ok");
  } else {
    setMessage("Ingreso correcto. Abriendo tu espacio ADA...", "is-ok");
  }

  window.setTimeout(() => {
    window.location.replace(ADA_ROLE_HOME[perfil.rol] || "pages/dashboard.html");
  }, 650);
}

roleCards.forEach((card) => {
  card.addEventListener("click", () => openLoginModal(card));
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", closeLoginModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeLoginModal();
  }
});

loginForm.addEventListener("submit", iniciarSesion);

redirigirSiYaTieneSesion();
