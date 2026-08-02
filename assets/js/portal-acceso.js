const ADA_ROLE_HOME = {
  admin: "pages/dashboard.html",
  directivo: "pages/dashboard.html",
  secretaria: "pages/dashboard.html",
  docente: "pages/mi-espacio-docente.html",
  preceptor: "pages/mi-espacio-preceptor.html",
  familia: "pages/mi-espacio-familia.html",
  alumno: "pages/mi-espacio-alumno.html"
};

const root = document.documentElement;
const loginForm = document.getElementById("portalLoginForm");
const loginButton = document.getElementById("portalLoginButton");
const resetButton = document.getElementById("portalResetPassword");
const serviceStatus = document.getElementById("adaServiceStatus");
const message = document.getElementById("portalLoginMessage");
const emailInput = document.getElementById("portalEmail");
const passwordInput = document.getElementById("portalPassword");
const passwordToggle = document.getElementById("passwordToggle");
const rememberInput = document.getElementById("rememberUser");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");

function normalizeRole(role) {
  const normalized = String(role || "alumno").trim().toLowerCase();
  return normalized === "preceptoria" ? "preceptor" : normalized;
}

function setMessage(text = "", type = "") {
  message.textContent = text;
  message.className = "ada-message";
  if (type) message.classList.add(type);
}

function setServiceStatus(text, state = "") {
  serviceStatus.className = "ada-status";
  if (state) serviceStatus.classList.add(state);
  const textNode = serviceStatus.querySelector("span:last-child");
  if (textNode) textNode.textContent = text;
}

function applyTheme(theme, persist = true) {
  const selected = theme === "dark" ? "dark" : "light";
  root.dataset.theme = selected;
  root.style.colorScheme = selected;
  themeLabel.textContent = selected === "dark" ? "Oscuro" : "Claro";
  themeToggle.setAttribute("aria-pressed", String(selected === "dark"));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", selected === "dark" ? "#06091d" : "#f7f5ff");
  if (persist) localStorage.setItem("ada-theme", selected);
}

function initTheme() {
  const saved = localStorage.getItem("ada-theme");
  const preferred = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(saved || preferred, false);
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
      headers: { apikey: SUPABASE_ANON_KEY },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setServiceStatus("Servicio disponible", "is-online");
    return true;
  } catch (error) {
    setServiceStatus(navigator.onLine ? "Servicio no disponible" : "Sin conexión a Internet", "is-offline");
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function obtenerPerfilActual() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError || !sessionData?.session) return null;

  const { data: perfil, error } = await supabaseClient
    .from("profiles")
    .select("rol, activo")
    .eq("id", sessionData.session.user.id)
    .single();

  if (error || !perfil || !perfil.activo) {
    await supabaseClient.auth.signOut();
    return null;
  }

  return { ...perfil, rol: normalizeRole(perfil.rol) };
}

function mensajeErrorLogin(error) {
  const text = String(error?.message || "").toLowerCase();
  if (!navigator.onLine) return "No hay conexión a Internet.";
  if (text.includes("invalid login credentials")) return "Usuario o contraseña incorrectos.";
  if (text.includes("email not confirmed")) return "El correo todavía no fue confirmado.";
  if (text.includes("profile") || text.includes("perfil")) return "Tu cuenta no tiene un perfil institucional activo.";
  if (text.includes("fetch") || text.includes("network") || text.includes("timeout")) return "No se pudo conectar con Ada. Verificá la conexión o el estado de Supabase.";
  return "No se pudo iniciar sesión. Intentá nuevamente.";
}

async function iniciarSesion(event) {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setMessage("Completá usuario y contraseña para ingresar.", "is-error");
    (!email ? emailInput : passwordInput).focus();
    return;
  }

  loginButton.disabled = true;
  loginButton.querySelector("span").textContent = "Ingresando...";
  setMessage("Validando credenciales...");

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const perfil = await obtenerPerfilActual();
    if (!perfil) throw new Error("Perfil institucional no disponible");

    if (rememberInput.checked) localStorage.setItem("ada-login-email", email);
    else localStorage.removeItem("ada-login-email");

    setMessage("Ingreso correcto. Abriendo tu espacio...", "is-ok");
    const target = ADA_ROLE_HOME[perfil.rol] || "pages/dashboard.html";
    setTimeout(() => window.location.replace(target), 350);
  } catch (error) {
    setMessage(mensajeErrorLogin(error), "is-error");
    await comprobarServicio();
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector("span").textContent = "Iniciar sesión";
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

async function procesarLogout() {
  if (!new URLSearchParams(window.location.search).has("logout")) return;
  try { await supabaseClient.auth.signOut(); } catch (_) {}
  try { window.history.replaceState({}, document.title, window.location.pathname); } catch (_) {}
}

passwordToggle.addEventListener("click", () => {
  const visible = passwordInput.type === "text";
  passwordInput.type = visible ? "password" : "text";
  passwordToggle.setAttribute("aria-pressed", String(!visible));
  passwordToggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
});

themeToggle.addEventListener("click", () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark"));
loginForm.addEventListener("submit", iniciarSesion);
resetButton.addEventListener("click", recuperarClave);
window.addEventListener("online", comprobarServicio);
window.addEventListener("offline", () => setServiceStatus("Sin conexión a Internet", "is-offline"));

(async function init() {
  initTheme();
  const remembered = localStorage.getItem("ada-login-email");
  if (remembered) {
    emailInput.value = remembered;
    rememberInput.checked = true;
  }
  await procesarLogout();
  await comprobarServicio();
  emailInput.focus();
})();

// Movimiento muy sutil del destello según el puntero; la animación principal funciona aun sin mouse.
window.addEventListener("pointermove", (event) => {
  const x = ((event.clientX / Math.max(window.innerWidth, 1)) - 0.5) * 12;
  const y = ((event.clientY / Math.max(window.innerHeight, 1)) - 0.5) * 8;
  root.style.setProperty("--mouse-x", `${x}px`);
  root.style.setProperty("--mouse-y", `${y}px`);
}, { passive: true });
