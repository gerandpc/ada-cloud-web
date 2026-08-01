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
  admin: "#0f172a", directivo: "#dc2626", secretaria: "#0891b2",
  docente: "#ea580c", preceptor: "#b8860b", familia: "#16a34a", alumno: "#7c3aed"
};

const ADA_ROLE_ICONS = {
  admin: "⚙️", directivo: "🏫", secretaria: "🗂️", docente: "👩‍🏫",
  preceptor: "📋", familia: "👨‍👩‍👧", alumno: "🎒"
};

const modal = document.getElementById("adaLoginModal");
const roleCards = document.querySelectorAll(".ada-role-card");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const loginForm = document.getElementById("portalLoginForm");
const loginButton = document.getElementById("portalLoginButton");
const resetButton = document.getElementById("portalResetPassword");
const serviceStatus = document.getElementById("adaServiceStatus");
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

function setServiceStatus(text, state = "") {
  if (!serviceStatus) return;
  serviceStatus.textContent = text;
  serviceStatus.classList.remove("is-online", "is-offline");
  if (state) serviceStatus.classList.add(state);
}

async function comprobarServicio() {
  if (!window.supabaseClient || typeof SUPABASE_URL === "undefined" || typeof SUPABASE_ANON_KEY === "undefined") {
    setServiceStatus("Configuración incompleta", "is-offline");
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: SUPABASE_ANON_KEY },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setServiceStatus("Servicio disponible", "is-online");
    return true;
  } catch (error) {
    const paused = String(error?.message || "").includes("503");
    setServiceStatus(paused ? "Servicio pausado" : "Servicio sin conexión", "is-offline");
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function openLoginModal(card) {
  const role = card.dataset.role;
  selectedRoleInput.value = role;
  modalRoleTitle.textContent = `Ingreso ${card.dataset.title || "ADA"}`;
  modalRoleDescription.textContent = card.dataset.description || "Ingresá con tus credenciales institucionales.";
  modalRoleIcon.textContent = ADA_ROLE_ICONS[role] || "ADA";
  modal.style.setProperty("--selected-role-color", ADA_ROLE_COLORS[role] || "#0f172a");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setMessage("");
  loginForm.reset();
  selectedRoleInput.value = role;
  comprobarServicio();
  setTimeout(() => emailInput.focus(), 80);
}

function closeLoginModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  setMessage("");
}

async function obtenerPerfilActual() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !sessionData.session) return null;
  const { data: perfil, error } = await supabaseClient
    .from("profiles").select("rol, activo").eq("id", sessionData.session.user.id).single();
  if (error || !perfil || !perfil.activo) {
    await supabaseClient.auth.signOut();
    return null;
  }
  perfil.rol = (perfil.rol || "alumno").toString().trim().toLowerCase();
  if (perfil.rol === "preceptoria") perfil.rol = "preceptor";
  return perfil;
}

function mensajeErrorLogin(error) {
  const texto = String(error?.message || "").toLowerCase();
  if (!navigator.onLine) return "No hay conexión a Internet.";
  if (texto.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (texto.includes("email not confirmed")) return "El correo todavía no fue confirmado.";
  if (texto.includes("fetch") || texto.includes("network") || texto.includes("timeout")) {
    return "No se pudo conectar con ADA. Verificá Internet o que Supabase no esté pausado.";
  }
  return "No se pudo iniciar sesión. Intentá nuevamente.";
}

async function iniciarSesion(event) {
  event.preventDefault();
  const selectedRole = selectedRoleInput.value;
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setMessage("Completá correo y contraseña para ingresar.", "is-error");
    return;
  }
  loginButton.disabled = true;
  setMessage("Validando credenciales...");
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const perfil = await obtenerPerfilActual();
    if (!perfil) throw new Error("No se encontró un perfil institucional activo.");
    setMessage(selectedRole && perfil.rol !== selectedRole
      ? `Tus credenciales corresponden al rol ${perfil.rol}. Abriendo tu espacio correcto.`
      : "Ingreso correcto. Abriendo tu espacio ADA...", "is-ok");
    setTimeout(() => window.location.replace(ADA_ROLE_HOME[perfil.rol] || "pages/dashboard.html"), 500);
  } catch (error) {
    setMessage(mensajeErrorLogin(error), "is-error");
    comprobarServicio();
  } finally {
    loginButton.disabled = false;
  }
}

async function recuperarClave() {
  const email = emailInput.value.trim();
  if (!email) {
    setMessage("Escribí primero tu correo electrónico.", "is-error");
    emailInput.focus();
    return;
  }
  resetButton.disabled = true;
  setMessage("Enviando enlace de recuperación...");
  try {
    const redirectTo = new URL("pages/recuperar-clave.html", window.location.href).href;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    setMessage("Revisá tu correo. Te enviamos un enlace para crear una nueva contraseña.", "is-ok");
  } catch (error) {
    setMessage(mensajeErrorLogin(error), "is-error");
  } finally {
    resetButton.disabled = false;
  }
}

roleCards.forEach(card => card.addEventListener("click", () => openLoginModal(card)));
closeModalButtons.forEach(button => button.addEventListener("click", closeLoginModal));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) closeLoginModal();
});
loginForm.addEventListener("submit", iniciarSesion);
resetButton?.addEventListener("click", recuperarClave);
window.addEventListener("online", comprobarServicio);
window.addEventListener("offline", () => setServiceStatus("Sin Internet", "is-offline"));

if (new URLSearchParams(window.location.search).has("logout")) {
  try { window.history.replaceState({}, document.title, window.location.pathname); } catch (_) {}
}
