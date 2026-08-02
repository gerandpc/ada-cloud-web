(() => {
  "use strict";
  const KEY = "ada-color-theme";
  const root = document.documentElement;

  function resolveTheme() {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.dataset.adaTheme = theme;
    const btn = document.querySelector(".ada-global-theme-toggle");
    if (btn) {
      btn.textContent = theme === "dark" ? "☀" : "☾";
      const label = theme === "dark" ? "Activar modo claro" : "Activar modo oscuro";
      btn.setAttribute("aria-label", label);
      btn.title = label;
    }
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    meta.content = theme === "dark" ? "#070815" : "#f7f5ff";
  }

  function installToggle() {
    if (document.querySelector(".ada-global-theme-toggle")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ada-global-theme-toggle no-print";
    btn.addEventListener("click", () => {
      const next = root.dataset.adaTheme === "dark" ? "light" : "dark";
      localStorage.setItem(KEY, next);
      applyTheme(next);
    });
    document.body.appendChild(btn);
    applyTheme(resolveTheme());
  }

  function installAmbient() {
    if (document.querySelector(".ada-theme-ambient")) return;
    const ambient = document.createElement("div");
    ambient.className = "ada-theme-ambient";
    ambient.setAttribute("aria-hidden", "true");
    ambient.innerHTML = `
      <span class="beam beam-one"></span>
      <span class="beam beam-two"></span>
      <span class="beam beam-three"></span>
      <span class="glow glow-a"></span>
      <span class="glow glow-b"></span>`;
    document.body.prepend(ambient);
  }

  function logoPath() {
    return location.pathname.includes("/pages/") ? "../assets/img/ada-logo.jpg" : "assets/img/ada-logo.jpg";
  }

  function pageHref(file) {
    return location.pathname.includes("/pages/") ? file : `pages/${file}`;
  }

  function normalizeFloatingActions() {
    document.querySelectorAll(".ada-final-utilities,.ada-logo-fab").forEach((el) => el.remove());

    // El botón ? se conserva con la misma función y el mismo tamaño.
    let help = document.querySelector(".ada-help-fab");
    if (!help) {
      help = document.createElement("a");
      help.className = "ada-help-fab no-print";
      help.href = pageHref("ayuda.html");
      help.textContent = "?";
      help.setAttribute("aria-label", "Ayuda");
      help.title = "Ayuda";
      document.body.appendChild(help);
    }

    const chats = [...document.querySelectorAll("#btnAdaIA,.chatbot-button")];
    const existingChat = chats[0];
    chats.slice(1).forEach((el) => el.remove());

    if (existingChat) {
      existingChat.classList.add("ada-floating-logo", "no-print");
      existingChat.innerHTML = `<img src="${logoPath()}" alt="Ada">`;
      existingChat.setAttribute("aria-label", "Abrir ADA IA");
      existingChat.title = "Abrir ADA IA";
      return;
    }

    const logo = document.createElement("a");
    logo.className = "ada-logo-fab no-print";
    logo.href = pageHref("ia.html");
    logo.setAttribute("aria-label", "Abrir ADA IA");
    logo.title = "Abrir ADA IA";
    logo.innerHTML = `<img src="${logoPath()}" alt="Ada">`;
    document.body.appendChild(logo);
  }

  function run() {
    applyTheme(resolveTheme());
    installAmbient();
    installToggle();
    normalizeFloatingActions();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
  window.addEventListener("ada:role-applied", () => setTimeout(normalizeFloatingActions, 40));
})();
